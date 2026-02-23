// Slack Events API handler — Step 3
// Handles: url_verification, message.im (DMs), message.channels (monitored), app_mention

import { onRequest } from "firebase-functions/v2/https";
import { verifySlackSignature, getSlackClient, AI_OPS_CHANNEL } from "./client";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { classifyMessage, type ClassificationResult } from "../pipeline/classify";

export const slackEvents = onRequest(
  { cors: false, region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Handle url_verification challenge
    if (req.body.type === "url_verification") {
      res.status(200).json({ challenge: req.body.challenge });
      return;
    }

    // Verify Slack signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (signingSecret) {
      const valid = verifySlackSignature(
        signingSecret,
        req.headers["x-slack-signature"] as string,
        req.headers["x-slack-request-timestamp"] as string,
        rawBody,
      );
      if (!valid) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }

    // Acknowledge immediately (Slack requires response within 3s)
    res.status(200).json({ ok: true });

    // Process event asynchronously
    try {
      const event = req.body.event;
      if (!event) return;

      const eventType = event.type;
      const subtype = event.subtype;

      // Skip bot messages to avoid loops
      if (event.bot_id || subtype === "bot_message") return;

      const text = event.text || "";
      const channel = event.channel || "";
      const userId = event.user || "";
      const messageTs = event.ts || "";
      const threadTs = event.thread_ts || null;

      // Archive every message permanently (Slack free plan 90-day workaround)
      await collections.slackArchive().doc(messageTs || `${Date.now()}`).set({
        channelId: channel,
        channelName: "",
        userId,
        userName: "",
        text,
        ts: messageTs,
        threadTs,
        files: (event.files || []).map((f: { name?: string; url_private?: string; mimetype?: string }) => ({
          name: f.name || "",
          url: f.url_private || "",
          mimetype: f.mimetype || "",
        })),
        savedAt: serverTimestamp(),
      });

      // Look up channel context
      let channelContext: { channelName: string; client: string | null; discipline: string | null } | undefined;
      const channelDoc = await collections.channelMap().doc(channel).get();
      if (channelDoc.exists) {
        const data = channelDoc.data()!;
        channelContext = {
          channelName: data.channelName as string || channel,
          client: data.clientId as string || null,
          discipline: data.primaryDiscipline as string || null,
        };
      }

      // Classify the message
      const classification = await classifyMessage(text, channelContext);

      await logActivity({
        action: "SLACK",
        detail: `Event ${eventType}: "${text.slice(0, 80)}" → ${classification.classification} (${classification.confidence})`,
        source: "slack",
      });

      switch (classification.classification) {
        case "CHATTER":
        case "QUESTION": {
          // Log silently to pendingSuggestions
          await collections.pendingSuggestions().add({
            ts: serverTimestamp(),
            slackChannel: channel,
            slackUser: userId,
            message: text,
            classification: classification.classification,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            status: "logged",
          });
          break;
        }

        case "NEW_TASK":
        case "STATUS_UPDATE": {
          // Save to pendingSuggestions
          const suggestionRef = await collections.pendingSuggestions().add({
            ts: serverTimestamp(),
            slackChannel: channel,
            slackUser: userId,
            message: text,
            classification: classification.classification,
            confidence: classification.confidence,
            taskTitle: classification.task_title,
            taskProject: classification.task_project,
            taskPriority: classification.task_priority,
            taskDisciplines: classification.task_disciplines,
            existingTaskMatch: classification.existing_task_match,
            statusUpdateTo: classification.status_update_to,
            reasoning: classification.reasoning,
            status: "pending",
          });

          // Post to #ai-ops with action buttons
          const slack = getSlackClient();
          const label = classification.classification === "NEW_TASK" ? "New Task Detected" : "Status Update Detected";
          const taskInfo = classification.task_title
            ? `*${classification.task_title}*\nProject: ${classification.task_project || "unknown"} | Priority: ${classification.task_priority || "normal"}`
            : text.slice(0, 200);

          await slack.chat.postMessage({
            channel: AI_OPS_CHANNEL(),
            text: `${label}: ${text.slice(0, 100)}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `:robot_face: *${label}*\n${taskInfo}\n_Confidence: ${classification.confidence} | Reasoning: ${classification.reasoning}_`,
                },
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Create" },
                    style: "primary",
                    action_id: "approve_task",
                    value: suggestionRef.id,
                  },
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Edit" },
                    action_id: "edit_before_create",
                    value: suggestionRef.id,
                  },
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Dismiss" },
                    style: "danger",
                    action_id: "reject_suggestion",
                    value: suggestionRef.id,
                  },
                ],
              },
            ],
          });
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logActivity({
        action: "SLACK",
        detail: `Event processing error: ${msg}`,
        source: "slack",
      });
    }
  },
);
