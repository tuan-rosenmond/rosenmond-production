// Slack slash command handler — Step 3
// /task [description] — works in DMs and channels

import { onRequest } from "firebase-functions/v2/https";
import { verifySlackSignature, getSlackClient, AI_OPS_CHANNEL } from "./client";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { classifyMessage } from "../pipeline/classify";

export const slackCommands = onRequest(
  { cors: false, region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

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
    res.status(200).json({
      response_type: "ephemeral",
      text: ":hourglass: Processing your task...",
    });

    try {
      const command = req.body.command || "";
      const text = req.body.text || "";
      const userId = req.body.user_id || "";
      const channel = req.body.channel_id || "";

      if (command !== "/task" || !text.trim()) return;

      await logActivity({
        action: "SLACK",
        detail: `/task command from ${userId}: "${text.slice(0, 100)}"`,
        source: "slack",
      });

      // Classify the description to extract structured task info
      const classification = await classifyMessage(text);

      // Save to pendingSuggestions
      const suggestionRef = await collections.pendingSuggestions().add({
        ts: serverTimestamp(),
        slackChannel: channel,
        slackUser: userId,
        message: text,
        classification: "NEW_TASK",
        confidence: classification.confidence,
        taskTitle: classification.task_title || text,
        taskProject: classification.task_project,
        taskPriority: classification.task_priority || "normal",
        taskDisciplines: classification.task_disciplines,
        reasoning: `Slash command /task from user ${userId}`,
        status: "pending",
        source: "slash_command",
      });

      // Post to #ai-ops with action buttons
      const slack = getSlackClient();
      const taskTitle = classification.task_title || text;
      const project = classification.task_project || "unknown";
      const priority = classification.task_priority || "normal";

      await slack.chat.postMessage({
        channel: AI_OPS_CHANNEL(),
        text: `New task via /task: ${taskTitle}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:clipboard: */task* from <@${userId}>\n*${taskTitle}*\nProject: ${project} | Priority: ${priority}`,
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logActivity({
        action: "SLACK",
        detail: `/task command error: ${msg}`,
        source: "slack",
      });
    }
  },
);
