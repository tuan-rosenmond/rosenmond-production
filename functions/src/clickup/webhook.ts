import * as crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { CLICKUP_TO_WARBOARD } from "../shared/constants";
import { syncToClientBoard } from "./clientboard";
import { moveTaskToList } from "./api";
import { getSlackClient, AI_OPS_CHANNEL } from "../slack/client";

interface WebhookPayload {
  event: string;
  task_id: string;
  history_items?: Array<{ field: string; before: unknown; after: unknown }>;
  [key: string]: unknown;
}

function verifyWebhookSignature(secret: string, signature: string | undefined, body: string): boolean {
  if (!signature) return false;
  const computed = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const clickupWebhook = onRequest(
  { cors: false, region: "europe-west1" },
  async (req, res) => {
    // ClickUp sends GET for webhook verification
    if (req.method === "GET") {
      res.status(200).send("OK");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // HMAC-SHA256 signature verification
    const webhookSecret = process.env.CLICKUP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const signature = req.headers["x-signature"] as string | undefined;
      if (!verifyWebhookSignature(webhookSecret, signature, rawBody)) {
        await logActivity({
          action: "CLICKUP",
          detail: "Webhook rejected — invalid HMAC signature",
          source: "clickup-webhook",
        });
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }

    const payload = req.body as WebhookPayload;
    const { event, task_id } = payload;

    if (!event || !task_id) {
      res.status(400).json({ error: "Missing event or task_id" });
      return;
    }

    try {
      await logActivity({
        action: "CLICKUP",
        detail: `Webhook: ${event} for task ${task_id}`,
        taskId: task_id,
        source: "clickup-webhook",
      });

      switch (event) {
        case "taskCreated": {
          await collections.tasksMirror().doc(task_id).set({
            clickupTaskId: task_id,
            lastWebhookEvent: event,
            lastSyncedAt: serverTimestamp(),
          }, { merge: true });

          await logActivity({
            action: "CREATE",
            detail: `Task ${task_id} created (via ClickUp webhook)`,
            taskId: task_id,
            source: "clickup-webhook",
          });
          break;
        }

        case "taskStatusUpdated": {
          const statusChange = payload.history_items?.find(h => h.field === "status");
          if (statusChange) {
            const newClickUpStatus = String(statusChange.after).toLowerCase();
            const warboardStatus = CLICKUP_TO_WARBOARD[newClickUpStatus] || "OPEN";

            const statusUpdate: Record<string, unknown> = {
              clickupTaskId: task_id,
              status: warboardStatus,
              lastWebhookEvent: event,
              lastSyncedAt: serverTimestamp(),
            };

            // Track when task enters WAITING ("sent to client")
            if (warboardStatus === "WAITING") {
              statusUpdate.sentToClientAt = serverTimestamp();
            }

            await collections.tasksMirror().doc(task_id).set(statusUpdate, { merge: true });

            await logActivity({
              action: "UPDATE",
              detail: `Task ${task_id} status: ${statusChange.before} → ${statusChange.after} (warboard: ${warboardStatus})`,
              taskId: task_id,
              source: "clickup-webhook",
            });

            // Trigger Client Board sync
            const taskDoc = await collections.tasksMirror().doc(task_id).get();
            const folderName = (taskDoc.data()?.clickupFolderName as string) || "";
            await syncToClientBoard(task_id, warboardStatus as any, folderName);

            // Move from Backlog to Active Work when status = "planning"
            if (newClickUpStatus === "planning") {
              const taskData = taskDoc.data();
              const folderId = taskData?.clickupFolderId as string;
              if (folderId) {
                try {
                  await moveTaskToList(task_id, folderId, "active");
                  await logActivity({
                    action: "CLICKUP",
                    detail: `Task ${task_id} moved to Active Work list (status: planning)`,
                    taskId: task_id,
                    source: "clickup-webhook",
                  });
                } catch (moveErr) {
                  // Non-critical — log and continue
                  console.warn(`Failed to move task ${task_id} to Active Work:`, moveErr);
                }
              }
            }

            // Real-time billing flag: hourly task → DONE with 0h → immediate alert
            if (warboardStatus === "DONE") {
              const taskData = taskDoc.data();
              const hours = (taskData?.hoursLogged as number) || 0;
              const isHourly = (taskData?.clientBilling as string) === "hourly" ||
                (taskData?.teamBilling as string) === "hourly" ||
                (taskData?.billable as boolean);

              if (isHourly && hours === 0) {
                const taskName = (taskData?.task as string) || task_id;
                const projectId = (taskData?.projectId as string) || "unknown";
                try {
                  const slack = getSlackClient();
                  await slack.chat.postMessage({
                    channel: AI_OPS_CHANNEL(),
                    text: `BILLING FLAG: ${taskName} completed with 0h logged`,
                    blocks: [
                      {
                        type: "section",
                        text: {
                          type: "mrkdwn",
                          text: `:red_circle: *REVENUE LEAK — ${taskName}*\nProject: ${projectId} | Task: ${task_id}\nHourly task moved to DONE with *0 hours logged*. This is a billing gap.`,
                        },
                      },
                    ],
                  });
                  await logActivity({
                    action: "BILLING",
                    detail: `Revenue leak: hourly task "${taskName}" (${task_id}) moved to DONE with 0h logged`,
                    taskId: task_id,
                    projectId,
                    source: "clickup-webhook",
                  });
                } catch (billingErr) {
                  console.warn(`Failed to post billing flag for ${task_id}:`, billingErr);
                }
              }
            }
          }
          break;
        }

        case "taskUpdated": {
          await collections.tasksMirror().doc(task_id).set({
            clickupTaskId: task_id,
            lastWebhookEvent: event,
            lastSyncedAt: serverTimestamp(),
          }, { merge: true });
          break;
        }

        case "taskTimeTracked": {
          const timeData = payload.history_items?.find(h => h.field === "time_spent");
          if (timeData) {
            await collections.tasksMirror().doc(task_id).set({
              hoursLogged: Number(timeData.after) / 3600000,
              lastWebhookEvent: event,
              lastSyncedAt: serverTimestamp(),
            }, { merge: true });
          }
          break;
        }

        case "taskDeleted": {
          await collections.tasksMirror().doc(task_id).set({
            archived: true,
            lastWebhookEvent: event,
            lastSyncedAt: serverTimestamp(),
          }, { merge: true });

          await logActivity({
            action: "DELETE",
            detail: `Task ${task_id} deleted in ClickUp — marked archived in mirror`,
            taskId: task_id,
            source: "clickup-webhook",
          });
          break;
        }

        default: {
          await collections.tasksMirror().doc(task_id).set({
            lastWebhookEvent: event,
            lastSyncedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      res.status(200).json({ success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await logActivity({
        action: "CLICKUP",
        detail: `Webhook error: ${errorMsg}`,
        taskId: task_id,
        source: "clickup-webhook",
      });
      res.status(500).json({ error: errorMsg });
    }
  },
);
