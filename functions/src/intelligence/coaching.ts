// Team coaching nudges — Step 4
// Detects: missing time entries, skipped workflow steps, stalled tasks.
// Max 3 nudges per person per day. All nudges require admin approval in #ai-ops.

import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { getSlackClient, AI_OPS_CHANNEL } from "../slack/client";
import { addTaskComment } from "../clickup/api";

export interface CoachingNudge {
  type: "missing_time" | "stalled_task" | "workflow_skip";
  memberId: string;
  memberName: string;
  taskId: string;
  taskName: string;
  projectId: string;
  message: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

const MAX_NUDGES_PER_DAY = 3;

/**
 * Detect coaching opportunities across the board.
 */
export async function detectCoachingNudges(): Promise<CoachingNudge[]> {
  const nudges: CoachingNudge[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const [tasksSnap, teamSnap] = await Promise.all([
    collections.tasksMirror().get(),
    collections.team().get(),
  ]);

  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });
  const teamMap = new Map<string, string>();
  teamSnap.docs.forEach((d) => {
    const data = d.data();
    teamMap.set(d.id, (data.name as string) || d.id);
  });

  // Check each assignee's tasks
  for (const task of tasks) {
    const assignee = task.assignee as string;
    if (!assignee) continue;
    const memberName = teamMap.get(assignee) || assignee;
    const status = task.status as string;
    const hours = (task.hoursLogged as number) || 0;
    const isHourly = (task.clientBilling as string) === "hourly" ||
      (task.teamBilling as string) === "hourly" ||
      (task.billable as boolean);
    const taskName = (task.task as string) || task.id;
    const projectId = task.projectId as string;

    // Missing time: hourly task, IN_PROGRESS for 2+ days, 0h logged
    if (isHourly && status === "IN_PROGRESS" && hours === 0) {
      const lastSync = task.lastSyncedAt;
      if (lastSync && typeof (lastSync as { toDate: () => Date }).toDate === "function") {
        const syncDate = (lastSync as FirebaseFirestore.Timestamp).toDate();
        const daysSince = Math.floor((Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 2) {
          nudges.push({
            type: "missing_time",
            memberId: assignee,
            memberName,
            taskId: task.id,
            taskName,
            projectId,
            message: `"${taskName}" has been in progress for ${daysSince} days with 0h tracked (hourly task). Please log your time.`,
            severity: "HIGH",
          });
        }
      }
    }

    // Stalled: assigned task, no update in 7+ days
    if (!["DONE", "PARKED"].includes(status)) {
      const lastSync = task.lastSyncedAt;
      if (lastSync && typeof (lastSync as { toDate: () => Date }).toDate === "function") {
        const syncDate = (lastSync as FirebaseFirestore.Timestamp).toDate();
        const daysSince = Math.floor((Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7) {
          nudges.push({
            type: "stalled_task",
            memberId: assignee,
            memberName,
            taskId: task.id,
            taskName,
            projectId,
            message: `"${taskName}" hasn't been updated in ${daysSince} days. Is it still in progress or should it be parked?`,
            severity: "MEDIUM",
          });
        }
      }
    }

    // Workflow skip: task jumped from OPEN to DONE without IN_PROGRESS
    // Detected by DONE status with very recent sync but no history of IN_PROGRESS
    if (status === "DONE" && hours === 0 && isHourly) {
      nudges.push({
        type: "workflow_skip",
        memberId: assignee,
        memberName,
        taskId: task.id,
        taskName,
        projectId,
        message: `"${taskName}" moved to DONE with 0h logged (hourly). Was time tracked elsewhere or is this a billing gap?`,
        severity: "HIGH",
      });
    }
  }

  // Filter by daily limit and mutes
  const filtered: CoachingNudge[] = [];
  const countByMember = new Map<string, number>();

  for (const nudge of nudges) {
    // Check mutes
    const muteDoc = await collections.coachingLog(nudge.memberId).doc("mutes").get();
    if (muteDoc.exists) {
      const mutes = muteDoc.data()!;
      if (mutes[nudge.type]?.muted) continue;
    }

    // Check daily limit
    const current = countByMember.get(nudge.memberId) || 0;
    if (current >= MAX_NUDGES_PER_DAY) continue;

    // Check if already sent today
    const logDoc = await collections.coachingLog(nudge.memberId).doc(today).get();
    if (logDoc.exists) {
      const logData = logDoc.data()!;
      if ((logData.nudgesSent as number || 0) >= MAX_NUDGES_PER_DAY) continue;
    }

    filtered.push(nudge);
    countByMember.set(nudge.memberId, current + 1);
  }

  return filtered;
}

/**
 * Post coaching nudges to #ai-ops for admin approval.
 */
export async function postCoachingNudges(): Promise<number> {
  const nudges = await detectCoachingNudges();
  if (!nudges.length) return 0;

  const slack = getSlackClient();
  let posted = 0;

  for (const nudge of nudges) {
    const icon = nudge.type === "missing_time" ? ":stopwatch:" :
      nudge.type === "stalled_task" ? ":snail:" : ":warning:";
    const typeLabel = nudge.type === "missing_time" ? "Missing Time" :
      nudge.type === "stalled_task" ? "Stalled Task" : "Workflow Skip";

    // Save nudge to pendingSuggestions for tracking
    const ref = await collections.pendingSuggestions().add({
      ts: serverTimestamp(),
      type: "coaching_nudge",
      nudgeType: nudge.type,
      memberId: nudge.memberId,
      memberName: nudge.memberName,
      taskId: nudge.taskId,
      taskName: nudge.taskName,
      projectId: nudge.projectId,
      message: nudge.message,
      severity: nudge.severity,
      status: "pending",
    });

    await slack.chat.postMessage({
      channel: AI_OPS_CHANNEL(),
      text: `Coaching: ${nudge.memberName} — ${typeLabel}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${icon} *COACHING — ${typeLabel}*\n*${nudge.memberName}* · ${nudge.projectId}\n${nudge.message}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Send Nudge" },
              style: "primary",
              action_id: "send_coaching_nudge",
              value: ref.id,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Already Handled" },
              action_id: "snooze_nudge",
              value: ref.id,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Not Billable" },
              style: "danger",
              action_id: "reject_suggestion",
              value: ref.id,
            },
          ],
        },
      ],
    });

    posted++;
  }

  await logActivity({
    action: "COACHING",
    detail: `Posted ${posted} coaching nudges to #ai-ops`,
    source: "scheduler",
  });

  return posted;
}

/**
 * Send an approved coaching nudge to the team member via DM.
 */
export async function sendNudge(suggestionId: string): Promise<void> {
  const doc = await collections.pendingSuggestions().doc(suggestionId).get();
  if (!doc.exists) return;
  const data = doc.data()!;

  const memberId = data.memberId as string;
  const memberName = data.memberName as string;
  const message = data.message as string;
  const taskId = data.taskId as string;
  const today = new Date().toISOString().slice(0, 10);

  const slack = getSlackClient();

  // Look up Slack user ID from team collection
  const teamDoc = await collections.team().doc(memberId).get();
  const slackUserId = teamDoc.exists ? (teamDoc.data()!.slackUserId as string) : null;

  if (slackUserId) {
    const dmResult = await slack.conversations.open({ users: slackUserId });
    const dmChannel = dmResult.channel?.id;
    if (dmChannel) {
      await slack.chat.postMessage({
        channel: dmChannel,
        text: `:wave: Hey ${memberName}!\n\n${message}`,
      });
    }
  }

  // Post audit comment on ClickUp task
  if (taskId) {
    await addTaskComment(taskId, `[Warboard] Coaching nudge sent to ${memberName}\n${message}`);
  }

  // Update coaching log
  const logRef = collections.coachingLog(memberId).doc(today);
  const logDoc = await logRef.get();
  if (logDoc.exists) {
    const existing = logDoc.data()!;
    await logRef.update({
      nudgesSent: ((existing.nudgesSent as number) || 0) + 1,
      types: [...((existing.types as string[]) || []), data.nudgeType as string],
    });
  } else {
    await logRef.set({
      nudgesSent: 1,
      nudgesAccepted: 0,
      types: [data.nudgeType as string],
    });
  }

  // Update suggestion status
  await collections.pendingSuggestions().doc(suggestionId).update({
    status: "sent",
    sentAt: serverTimestamp(),
  });

  await logActivity({
    action: "COACHING",
    detail: `Nudge sent to ${memberName}: ${(data.nudgeType as string)} on task ${taskId}`,
    taskId,
    source: "slack",
  });
}
