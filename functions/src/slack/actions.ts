// Slack interactive actions handler — Step 3
// Button clicks from #ai-ops: approve_task, reject_suggestion, edit_before_create

import { onRequest } from "firebase-functions/v2/https";
import { verifySlackSignature, getSlackClient } from "./client";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { createTask, addTaskComment, moveTaskToList } from "../clickup/api";
import { sendNudge } from "../intelligence/coaching";

export const slackActions = onRequest(
  { cors: false, region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Slack sends interactive payloads as URL-encoded `payload` field
    const rawPayload = req.body.payload;
    if (!rawPayload) {
      res.status(400).json({ error: "Missing payload" });
      return;
    }

    const payload = JSON.parse(rawPayload);

    // Verify Slack signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (signingSecret) {
      const rawBody = typeof req.body === "string" ? req.body : `payload=${encodeURIComponent(rawPayload)}`;
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

    // Handle view_submission (from edit modal)
    if (payload.type === "view_submission") {
      res.status(200).json({ response_action: "clear" });
      await handleViewSubmission(payload);
      return;
    }

    // Handle block_actions (button clicks)
    if (payload.type === "block_actions") {
      res.status(200).send();
      await handleBlockActions(payload);
      return;
    }

    res.status(200).send();
  },
);

async function handleBlockActions(payload: Record<string, unknown>): Promise<void> {
  const actions = payload.actions as Array<{ action_id: string; value: string }>;
  if (!actions?.length) return;

  const action = actions[0];
  const suggestionId = action.value;

  switch (action.action_id) {
    case "approve_task":
      await approveTask(suggestionId, payload);
      break;
    case "reject_suggestion":
      await rejectSuggestion(suggestionId, payload);
      break;
    case "edit_before_create":
      await openEditModal(suggestionId, payload);
      break;
    case "send_coaching_nudge":
      await handleSendNudge(suggestionId, payload);
      break;
    case "snooze_nudge":
      await handleSnoozeNudge(suggestionId, payload);
      break;
    case "approve_digest":
      await handleApproveDigest(suggestionId, payload);
      break;
    case "hold_digest":
      await rejectSuggestion(suggestionId, payload);
      break;
    case "send_followup":
      await handleSendFollowUp(suggestionId, payload);
      break;
  }
}

async function approveTask(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();

  try {
    // Load suggestion
    const suggDoc = await collections.pendingSuggestions().doc(suggestionId).get();
    if (!suggDoc.exists) return;
    const sugg = suggDoc.data()!;

    const taskTitle = (sugg.taskTitle as string) || (sugg.message as string) || "Untitled task";
    const project = (sugg.taskProject as string) || "operations";
    const priority = (sugg.taskPriority as string) || "normal";

    // Create in ClickUp
    const clickupTaskId = await createTask(project, {
      name: taskTitle,
      status: "new request",
      priority: priority.toUpperCase(),
    });

    // Resolve billing fields from classification
    const clientBilling = (sugg.clientBilling as string) || null;
    const teamBilling = (sugg.teamBilling as string) || null;
    const billable = clientBilling === "hourly" || teamBilling === "hourly";

    // Mirror to Firestore
    await collections.tasksMirror().doc(clickupTaskId).set({
      projectId: project,
      task: taskTitle,
      assignee: null,
      status: "OPEN",
      priority: priority.toUpperCase(),
      disciplines: (sugg.taskDisciplines as string[]) || [],
      notes: `Created from Slack: "${(sugg.message as string || "").slice(0, 200)}"`,
      dueDate: null,
      hoursLogged: 0,
      clientBilling,
      teamBilling,
      billable,
      clickupTaskId,
      lastSyncedAt: serverTimestamp(),
    }, { merge: true });

    // Post audit comment on ClickUp task
    await addTaskComment(
      clickupTaskId,
      `[Warboard] Task created from Slack message.\nOriginal: "${(sugg.message as string || "").slice(0, 300)}"`,
    );

    // Move to Active Work list
    try {
      const clientDoc = await collections.clients().doc(project).get();
      const folderId = clientDoc.data()?.clickupFolderId as string | null;
      if (folderId) {
        await moveTaskToList(clickupTaskId, folderId, "active");
      }
    } catch (moveErr) {
      console.warn(`Failed to move approved task ${clickupTaskId} to Active Work:`, moveErr);
    }

    // Update suggestion status
    await collections.pendingSuggestions().doc(suggestionId).update({
      status: "approved",
      clickupTaskId,
      resolvedAt: serverTimestamp(),
    });

    // Update the #ai-ops message
    const message = payload.message as Record<string, unknown> | undefined;
    const channel = (payload.channel as Record<string, string>)?.id;
    const messageTs = message?.ts as string;

    if (channel && messageTs) {
      await slack.chat.update({
        channel,
        ts: messageTs,
        text: `Task created: ${taskTitle}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:white_check_mark: *Task Created*\n*${taskTitle}*\nProject: ${project} | ClickUp: ${clickupTaskId}`,
            },
          },
        ],
      });
    }

    await logActivity({
      action: "CREATE",
      detail: `Task "${taskTitle}" created from Slack → ClickUp ${clickupTaskId}`,
      projectId: project,
      taskId: clickupTaskId,
      source: "slack",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity({
      action: "SLACK",
      detail: `approve_task error: ${msg}`,
      source: "slack",
    });
  }
}

async function rejectSuggestion(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();

  // Load suggestion to check type before updating
  const suggDoc = await collections.pendingSuggestions().doc(suggestionId).get();
  const suggData = suggDoc.data();

  await collections.pendingSuggestions().doc(suggestionId).update({
    status: "rejected",
    resolvedAt: serverTimestamp(),
  });

  // Update coaching log if this is a coaching nudge
  if (suggData?.type === "coaching_nudge" && suggData?.memberId) {
    const memberId = suggData.memberId as string;
    const today = new Date().toISOString().slice(0, 10);
    const logRef = collections.coachingLog(memberId).doc(today);
    const logDoc = await logRef.get();
    if (logDoc.exists) {
      await logRef.update({
        nudgesRejected: ((logDoc.data()!.nudgesRejected as number) || 0) + 1,
      });
    } else {
      await logRef.set({ nudgesSent: 0, nudgesAccepted: 0, nudgesSnoozed: 0, nudgesRejected: 1, types: [] });
    }
  }

  // Update the #ai-ops message
  const message = payload.message as Record<string, unknown> | undefined;
  const channel = (payload.channel as Record<string, string>)?.id;
  const messageTs = message?.ts as string;

  if (channel && messageTs) {
    await slack.chat.update({
      channel,
      ts: messageTs,
      text: "Suggestion dismissed",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: ":x: *Suggestion dismissed*",
          },
        },
      ],
    });
  }

  await logActivity({
    action: "SLACK",
    detail: `Suggestion ${suggestionId} dismissed`,
    source: "slack",
  });
}

async function openEditModal(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();
  const triggerId = payload.trigger_id as string;
  if (!triggerId) return;

  const suggDoc = await collections.pendingSuggestions().doc(suggestionId).get();
  if (!suggDoc.exists) return;
  const sugg = suggDoc.data()!;

  await slack.views.open({
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "edit_task_modal",
      private_metadata: suggestionId,
      title: { type: "plain_text", text: "Edit Task" },
      submit: { type: "plain_text", text: "Create Task" },
      blocks: [
        {
          type: "input",
          block_id: "task_title",
          label: { type: "plain_text", text: "Task Title" },
          element: {
            type: "plain_text_input",
            action_id: "title_input",
            initial_value: (sugg.taskTitle as string) || (sugg.message as string) || "",
          },
        },
        {
          type: "input",
          block_id: "task_project",
          label: { type: "plain_text", text: "Project" },
          element: {
            type: "plain_text_input",
            action_id: "project_input",
            initial_value: (sugg.taskProject as string) || "",
          },
        },
        {
          type: "input",
          block_id: "task_priority",
          label: { type: "plain_text", text: "Priority" },
          element: {
            type: "static_select",
            action_id: "priority_input",
            initial_option: {
              text: { type: "plain_text", text: ((sugg.taskPriority as string) || "normal").toUpperCase() },
              value: ((sugg.taskPriority as string) || "normal").toUpperCase(),
            },
            options: [
              { text: { type: "plain_text", text: "FOCUS" }, value: "FOCUS" },
              { text: { type: "plain_text", text: "CRITICAL" }, value: "CRITICAL" },
              { text: { type: "plain_text", text: "HIGH" }, value: "HIGH" },
              { text: { type: "plain_text", text: "NORMAL" }, value: "NORMAL" },
            ],
          },
        },
      ],
    },
  });
}

async function handleViewSubmission(payload: Record<string, unknown>): Promise<void> {
  const view = payload.view as Record<string, unknown>;
  const suggestionId = view.private_metadata as string;
  const values = view.state as Record<string, Record<string, Record<string, Record<string, unknown>>>>;

  const title = (values?.values?.task_title?.title_input?.value as string) || "Untitled";
  const project = (values?.values?.task_project?.project_input?.value as string) || "operations";
  const priority = (values?.values?.task_priority?.priority_input as Record<string, unknown>)?.selected_option as Record<string, string> | undefined;
  const priorityValue = priority?.value || "NORMAL";

  // Create the task with edited fields
  const clickupTaskId = await createTask(project, {
    name: title,
    status: "new request",
    priority: priorityValue,
  });

  // Mirror to Firestore
  await collections.tasksMirror().doc(clickupTaskId).set({
    projectId: project,
    task: title,
    assignee: null,
    status: "OPEN",
    priority: priorityValue,
    disciplines: [],
    notes: "",
    dueDate: null,
    hoursLogged: 0,
    clickupTaskId,
    lastSyncedAt: serverTimestamp(),
  }, { merge: true });

  // Move to Active Work list
  try {
    const clientDoc = await collections.clients().doc(project).get();
    const folderId = clientDoc.data()?.clickupFolderId as string | null;
    if (folderId) {
      await moveTaskToList(clickupTaskId, folderId, "active");
    }
  } catch (moveErr) {
    console.warn(`Failed to move edited task ${clickupTaskId} to Active Work:`, moveErr);
  }

  // Update suggestion
  if (suggestionId) {
    await collections.pendingSuggestions().doc(suggestionId).update({
      status: "approved_edited",
      clickupTaskId,
      editedTitle: title,
      editedProject: project,
      editedPriority: priorityValue,
      resolvedAt: serverTimestamp(),
    });
  }

  // Post confirmation to #ai-ops
  const slack = getSlackClient();
  const { AI_OPS_CHANNEL: getAiOps } = await import("./client");
  await slack.chat.postMessage({
    channel: getAiOps(),
    text: `Task created (edited): ${title}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:white_check_mark: *Task Created (Edited)*\n*${title}*\nProject: ${project} | Priority: ${priorityValue} | ClickUp: ${clickupTaskId}`,
        },
      },
    ],
  });

  await logActivity({
    action: "CREATE",
    detail: `Task "${title}" created (edited) from Slack → ClickUp ${clickupTaskId}`,
    projectId: project,
    taskId: clickupTaskId,
    source: "slack",
  });
}

async function handleSendNudge(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();

  try {
    await sendNudge(suggestionId);

    // Update the #ai-ops message
    const message = payload.message as Record<string, unknown> | undefined;
    const channel = (payload.channel as Record<string, string>)?.id;
    const messageTs = message?.ts as string;

    if (channel && messageTs) {
      const doc = await collections.pendingSuggestions().doc(suggestionId).get();
      const data = doc.data();
      await slack.chat.update({
        channel,
        ts: messageTs,
        text: "Coaching nudge sent",
        blocks: [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:white_check_mark: *Nudge sent to ${data?.memberName || "team member"}*`,
          },
        }],
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity({
      action: "COACHING",
      detail: `send_nudge error: ${msg}`,
      source: "slack",
    });
  }
}

async function handleSnoozeNudge(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();

  // Load suggestion to check type
  const suggDoc = await collections.pendingSuggestions().doc(suggestionId).get();
  const suggData = suggDoc.data();

  await collections.pendingSuggestions().doc(suggestionId).update({
    status: "snoozed",
    resolvedAt: serverTimestamp(),
  });

  // Update coaching log if this is a coaching nudge
  if (suggData?.type === "coaching_nudge" && suggData?.memberId) {
    const memberId = suggData.memberId as string;
    const today = new Date().toISOString().slice(0, 10);
    const logRef = collections.coachingLog(memberId).doc(today);
    const logDoc = await logRef.get();
    if (logDoc.exists) {
      await logRef.update({
        nudgesSnoozed: ((logDoc.data()!.nudgesSnoozed as number) || 0) + 1,
      });
    } else {
      await logRef.set({ nudgesSent: 0, nudgesAccepted: 0, nudgesSnoozed: 1, nudgesRejected: 0, types: [] });
    }
  }

  const message = payload.message as Record<string, unknown> | undefined;
  const channel = (payload.channel as Record<string, string>)?.id;
  const messageTs = message?.ts as string;

  if (channel && messageTs) {
    await slack.chat.update({
      channel,
      ts: messageTs,
      text: "Nudge snoozed",
      blocks: [{
        type: "section",
        text: { type: "mrkdwn", text: ":zzz: *Already handled — nudge snoozed*" },
      }],
    });
  }
}

async function handleApproveDigest(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();

  const doc = await collections.pendingSuggestions().doc(suggestionId).get();
  if (!doc.exists) return;
  const data = doc.data()!;

  const digestText = data.digestText as string;
  const mgmtChannel = process.env.SLACK_MGMT_CHANNEL_ID;

  // Post digest to #mngmt-rosenmond
  if (mgmtChannel && digestText) {
    await slack.chat.postMessage({
      channel: mgmtChannel,
      text: digestText,
      mrkdwn: true,
    });
  }

  await collections.pendingSuggestions().doc(suggestionId).update({
    status: "approved",
    resolvedAt: serverTimestamp(),
  });

  // Update #ai-ops message
  const message = payload.message as Record<string, unknown> | undefined;
  const channel = (payload.channel as Record<string, string>)?.id;
  const messageTs = message?.ts as string;

  if (channel && messageTs) {
    await slack.chat.update({
      channel,
      ts: messageTs,
      text: "Digest posted to team",
      blocks: [{
        type: "section",
        text: { type: "mrkdwn", text: ":white_check_mark: *Digest posted to #mngmt-rosenmond*" },
      }],
    });
  }

  await logActivity({
    action: "SLACK",
    detail: "Daily digest posted to #mngmt-rosenmond",
    source: "slack",
  });
}

async function handleSendFollowUp(
  suggestionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const slack = getSlackClient();

  const doc = await collections.pendingSuggestions().doc(suggestionId).get();
  if (!doc.exists) return;
  const data = doc.data()!;

  const taskId = data.taskId as string;
  const taskName = data.taskName as string;
  const projectId = data.projectId as string;

  // Post follow-up comment on ClickUp task
  if (taskId) {
    await addTaskComment(
      taskId,
      `[Warboard] Client follow-up: task has been in "Sent to Client" for 3+ business days. Please follow up.`,
    );
  }

  await collections.pendingSuggestions().doc(suggestionId).update({
    status: "sent",
    sentAt: serverTimestamp(),
  });

  // Update Slack message
  const message = payload.message as Record<string, unknown> | undefined;
  const channel = (payload.channel as Record<string, string>)?.id;
  const messageTs = message?.ts as string;

  if (channel && messageTs) {
    await slack.chat.update({
      channel,
      ts: messageTs,
      text: "Follow-up sent",
      blocks: [{
        type: "section",
        text: { type: "mrkdwn", text: `:white_check_mark: *Follow-up sent for ${taskName}* (${projectId})` },
      }],
    });
  }

  await logActivity({
    action: "FOLLOWUP",
    detail: `Follow-up sent for task ${taskId} (${taskName}) — WAITING > 3 business days`,
    taskId,
    projectId,
    source: "slack",
  });
}
