// Slack Events API handler — Step 3
// Handles: url_verification, message.im (DMs), message.channels (monitored), app_mention

import { onRequest } from "firebase-functions/v2/https";
import { verifySlackSignature, getSlackClient, AI_OPS_CHANNEL, TUAN_USER_ID } from "./client";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { classifyMessage } from "../pipeline/classify";
import { handleAiPmCommand } from "./aipm";

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

      // Handle @ai-pm commands (app_mention events)
      if (eventType === "app_mention" || text.toLowerCase().includes("ai-pm")) {
        await handleAiPmCommand(text, channel, userId);
        return;
      }

      // Handle check-in DM responses from Tuan
      if (eventType === "message" && event.channel_type === "im" && userId === TUAN_USER_ID()) {
        // Check if there's an active check-in today
        const today = new Date().toISOString().slice(0, 10);
        const checkinSnap = await collections.checkins()
          .where("date", "==", today)
          .limit(1)
          .get();

        if (!checkinSnap.empty) {
          const checkinDoc = checkinSnap.docs[0];
          // Append Tuan's reply to the transcript
          const existing = checkinDoc.data();
          const transcript = (existing.transcript as Array<{ role: string; text: string; ts: string }>) || [];
          await checkinDoc.ref.update({
            transcript: [...transcript, { role: "user", text, ts: new Date().toISOString() }],
            lastReplyAt: serverTimestamp(),
          });

          // Route through CMD pipeline to apply any updates
          try {
            const { buildCommandContext } = await import("../pipeline/context");
            const { executeCmdResponse } = await import("../pipeline/execute");
            const Anthropic = (await import("@anthropic-ai/sdk")).default;
            const { buildCmdSystemPrompt } = await import("../prompts/system");
            const anthropic = new Anthropic();

            const ctx = await buildCommandContext();
            const systemPrompt = buildCmdSystemPrompt(ctx);
            const { CLAUDE_MODEL: model, CLAUDE_MAX_TOKENS } = await import("../shared/constants");
            const claudeRes = await anthropic.messages.create({
              model,
              max_tokens: CLAUDE_MAX_TOKENS,
              system: systemPrompt,
              messages: [{ role: "user", content: `Check-in response from Tuan: "${text}"` }],
            });

            const raw = claudeRes.content[0].type === "text" ? claudeRes.content[0].text : "";
            const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(jsonStr);

            if (parsed.taskUpdates?.length || parsed.newTasks?.length || parsed.clientUpdates?.length) {
              const result = await executeCmdResponse(parsed);
              const slack = getSlackClient();
              await slack.chat.postMessage({
                channel,
                text: `:white_check_mark: ${parsed.message || "Updates applied."}\nChanges: ${result.taskUpdates} updates, ${result.newTasks} new tasks.`,
              });
            }
          } catch (cmdErr) {
            // Non-critical — log but don't fail
            console.warn("Check-in response processing error:", cmdErr);
          }

          await logActivity({
            action: "CHECKIN",
            detail: `Tuan replied to check-in: "${text.slice(0, 100)}"`,
            source: "slack",
          });
          return;
        }
      }

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
            clientBilling: classification.client_billing,
            teamBilling: classification.team_billing,
            timeTrackingRequired: classification.time_tracking_required,
            billingFlag: classification.billing_flag,
            scopeFlag: classification.scope_flag,
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
