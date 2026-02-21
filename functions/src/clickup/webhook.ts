import { onRequest } from "firebase-functions/v2/https";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { CLICKUP_TO_WARBOARD } from "../shared/constants";

interface WebhookPayload {
  event: string;
  task_id: string;
  history_items?: Array<{ field: string; before: unknown; after: unknown }>;
  [key: string]: unknown;
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

    // TODO: Verify webhook signature using CLICKUP_WEBHOOK_SECRET
    // const signature = req.headers["x-signature"];

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

            await collections.tasksMirror().doc(task_id).set({
              clickupTaskId: task_id,
              status: warboardStatus,
              lastWebhookEvent: event,
              lastSyncedAt: serverTimestamp(),
            }, { merge: true });

            await logActivity({
              action: "UPDATE",
              detail: `Task ${task_id} status: ${statusChange.before} → ${statusChange.after} (warboard: ${warboardStatus})`,
              taskId: task_id,
              source: "clickup-webhook",
            });

            // TODO: Trigger Client Board sync when status changes
            // TODO: Trigger Backlog → Active Work move when status = Planning
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
          // Update hours on mirror — flag if hourly task with 0h will be handled in Step 4
          const timeData = payload.history_items?.find(h => h.field === "time_spent");
          if (timeData) {
            await collections.tasksMirror().doc(task_id).set({
              hoursLogged: Number(timeData.after) / 3600000, // ms to hours
              lastWebhookEvent: event,
              lastSyncedAt: serverTimestamp(),
            }, { merge: true });
          }
          break;
        }

        case "taskDeleted": {
          // Spec says never delete — but if ClickUp sends this, mark as archived
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
