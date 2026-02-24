// @ai-pm command handler — routes app_mention commands to appropriate handlers
// Commands: status, who's overloaded, what's stuck, billing report, create project,
//           upload scope, mute, unmute, link, show log, checkin

import { getSlackClient, AI_OPS_CHANNEL, TUAN_USER_ID } from "./client";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { analyzeCapacity } from "../intelligence/capacity";
import { detectStalledWork } from "../intelligence/stalled";
import { detectBillingGaps } from "../intelligence/billing";

// Map user-facing type aliases to actual CoachingNudge.type keys
const NUDGE_TYPE_MAP: Record<string, string> = {
  "missing_time": "missing_time",
  "time-tracking": "missing_time",
  "time": "missing_time",
  "stalled_task": "stalled_task",
  "stalled": "stalled_task",
  "workflow_skip": "workflow_skip",
  "workflow": "workflow_skip",
  "all": "all",
};

export async function handleAiPmCommand(text: string, channel: string, userId: string): Promise<void> {
  const slack = getSlackClient();

  // Strip @ai-pm mention tag to get the command
  const cmd = text.replace(/<@[A-Z0-9]+>/g, "").trim().toLowerCase();

  if (cmd.startsWith("status")) {
    await handleStatus(cmd, channel);
  } else if (cmd.includes("overloaded") || cmd.includes("capacity")) {
    await handleCapacity(channel);
  } else if (cmd.includes("stuck") || cmd.includes("stalled")) {
    await handleStalled(channel);
  } else if (cmd.startsWith("billing report") || cmd.startsWith("billing")) {
    await handleBillingReport(cmd, channel);
  } else if (cmd.startsWith("create project")) {
    await slack.chat.postMessage({
      channel,
      text: ":construction: `create project` — scope ingestion is Phase 2+. Use ClickUp directly for now.",
    });
  } else if (cmd.startsWith("upload scope")) {
    await slack.chat.postMessage({
      channel,
      text: ":construction: `upload scope` — scope ingestion is Phase 2+. Upload scope docs to ClickUp directly for now.",
    });
  } else if (cmd.startsWith("unmute")) {
    await handleUnmute(cmd, channel);
  } else if (cmd.startsWith("mute")) {
    await handleMute(cmd, channel, userId);
  } else if (cmd.startsWith("link")) {
    await handleLink(cmd, channel);
  } else if (cmd.startsWith("show log")) {
    await handleShowLog(channel);
  } else if (cmd.startsWith("checkin") || cmd.startsWith("check-in")) {
    await handleManualCheckin(channel);
  } else {
    await slack.chat.postMessage({
      channel,
      text: ":question: Unknown command. Available:\n`status [client]` · `who's overloaded` · `what's stuck` · `billing report [client]` · `show log` · `checkin` · `mute [type] [person]` · `unmute [type] [person]` · `link [member] @SlackUser`",
    });
  }

  await logActivity({
    action: "SLACK",
    detail: `@ai-pm command: "${cmd.slice(0, 80)}"`,
    source: "slack",
  });
}

async function handleStatus(cmd: string, channel: string): Promise<void> {
  const slack = getSlackClient();
  const clientArg = cmd.replace("status", "").trim();

  const tasksSnap = await collections.tasksMirror().get();
  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string } & Record<string, unknown>));

  let filtered = tasks;
  let heading = "All Clients";

  if (clientArg) {
    filtered = tasks.filter((t) =>
      (t.projectId as string)?.toLowerCase().includes(clientArg),
    );
    heading = clientArg.charAt(0).toUpperCase() + clientArg.slice(1);
  }

  const active = filtered.filter((t) => !["DONE", "PARKED"].includes(t.status as string));
  const byStatus: Record<string, number> = {};
  for (const t of active) {
    const s = (t.status as string) || "OPEN";
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  const statusLines = Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([s, c]) => `• ${s}: ${c}`)
    .join("\n");

  const critical = active.filter((t) => t.priority === "CRITICAL" || t.priority === "FOCUS");
  const criticalLines = critical.length
    ? "\n\n*Critical/Focus:*\n" + critical.map((t) => `• "${t.task}" (${t.status}, ${t.assignee || "unassigned"})`).join("\n")
    : "";

  await slack.chat.postMessage({
    channel,
    text: `Status: ${heading}`,
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:bar_chart: *Status — ${heading}*\nTotal active: ${active.length}\n\n${statusLines}${criticalLines}`,
      },
    }],
  });
}

async function handleCapacity(channel: string): Promise<void> {
  const slack = getSlackClient();
  const capacity = await analyzeCapacity();

  const lines = capacity.members
    .sort((a, b) => b.activeCount - a.activeCount)
    .map((m) => {
      const flag = m.overloaded ? " :warning: *OVERLOADED*" : "";
      return `• ${m.memberName}: ${m.activeCount} active, ${m.criticalCount} critical, ${m.focusCount} focus${flag}`;
    })
    .join("\n");

  const unassigned = capacity.unassignedTasks.length
    ? `\n\n*Unassigned:* ${capacity.unassignedTasks.length} tasks`
    : "";

  const suggestions = capacity.reassignmentSuggestions.length
    ? "\n\n*Suggestions:*\n" + capacity.reassignmentSuggestions.map((s) =>
      `• Move "${s.taskName}" from ${s.from} → ${s.suggestedTo}`,
    ).join("\n")
    : "";

  await slack.chat.postMessage({
    channel,
    text: "Team capacity report",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:busts_in_silhouette: *Team Capacity*\n\n${lines}${unassigned}${suggestions}`,
      },
    }],
  });
}

async function handleStalled(channel: string): Promise<void> {
  const slack = getSlackClient();
  const stalled = await detectStalledWork();

  if (!stalled.length) {
    await slack.chat.postMessage({ channel, text: ":white_check_mark: No stalled tasks found." });
    return;
  }

  const lines = stalled.slice(0, 15).map((t) =>
    `• *${t.taskName}* (${t.projectId}) — ${t.reason}`,
  ).join("\n");

  await slack.chat.postMessage({
    channel,
    text: `${stalled.length} stalled tasks`,
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:snail: *Stalled Tasks* (${stalled.length})\n\n${lines}`,
      },
    }],
  });
}

async function handleBillingReport(cmd: string, channel: string): Promise<void> {
  const slack = getSlackClient();
  const clientArg = cmd.replace(/billing\s*report?/i, "").trim();
  const flags = await detectBillingGaps();

  let filtered = flags;
  if (clientArg) {
    filtered = flags.filter((f) => f.projectId.toLowerCase().includes(clientArg));
  }

  if (!filtered.length) {
    await slack.chat.postMessage({ channel, text: `:white_check_mark: No billing flags${clientArg ? ` for ${clientArg}` : ""}.` });
    return;
  }

  const lines = filtered.map((f) => {
    const icon = f.severity === "RED" ? ":red_circle:" : ":large_orange_circle:";
    return `${icon} *${f.type}* — ${f.detail}`;
  }).join("\n");

  await slack.chat.postMessage({
    channel,
    text: `Billing report: ${filtered.length} flags`,
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:money_with_wings: *Billing Report*${clientArg ? ` — ${clientArg}` : ""}\n\n${lines}`,
      },
    }],
  });
}

async function handleMute(cmd: string, channel: string, userId: string): Promise<void> {
  const slack = getSlackClient();
  const parts = cmd.replace("mute", "").trim().split(/\s+/);
  const rawType = parts[0] || "";
  const person = parts.slice(1).join(" ").trim();

  const nudgeType = NUDGE_TYPE_MAP[rawType];

  if (!nudgeType || !person) {
    await slack.chat.postMessage({
      channel,
      text: "Usage: `@ai-pm mute [type] [person]`\nTypes: `time` (missing_time), `stalled` (stalled_task), `workflow` (workflow_skip), `all`",
    });
    return;
  }

  if (nudgeType === "all") {
    await collections.coachingLog(person).doc("mutes").set({
      missing_time: { muted: true, mutedBy: userId, mutedAt: new Date().toISOString() },
      stalled_task: { muted: true, mutedBy: userId, mutedAt: new Date().toISOString() },
      workflow_skip: { muted: true, mutedBy: userId, mutedAt: new Date().toISOString() },
    }, { merge: true });
  } else {
    await collections.coachingLog(person).doc("mutes").set({
      [nudgeType]: { muted: true, mutedBy: userId, mutedAt: new Date().toISOString() },
    }, { merge: true });
  }

  const label = nudgeType === "all" ? "all" : nudgeType;
  await slack.chat.postMessage({
    channel,
    text: `:mute: Muted \`${label}\` nudges for *${person}*.`,
  });
}

async function handleUnmute(cmd: string, channel: string): Promise<void> {
  const slack = getSlackClient();
  const parts = cmd.replace("unmute", "").trim().split(/\s+/);
  const rawType = parts[0] || "";
  const person = parts.slice(1).join(" ").trim();

  const nudgeType = NUDGE_TYPE_MAP[rawType];

  if (!nudgeType || !person) {
    await slack.chat.postMessage({
      channel,
      text: "Usage: `@ai-pm unmute [type] [person]`\nTypes: `time`, `stalled`, `workflow`, `all`",
    });
    return;
  }

  if (nudgeType === "all") {
    await collections.coachingLog(person).doc("mutes").set({
      missing_time: { muted: false },
      stalled_task: { muted: false },
      workflow_skip: { muted: false },
    }, { merge: true });
  } else {
    await collections.coachingLog(person).doc("mutes").set({
      [nudgeType]: { muted: false },
    }, { merge: true });
  }

  const label = nudgeType === "all" ? "all" : nudgeType;
  await slack.chat.postMessage({
    channel,
    text: `:loud_sound: Unmuted \`${label}\` nudges for *${person}*.`,
  });
}

async function handleLink(cmd: string, channel: string): Promise<void> {
  const slack = getSlackClient();
  // Parse: link [teamMemberId] @SlackUser
  const parts = cmd.replace("link", "").trim().split(/\s+/);
  const memberId = parts[0]?.toLowerCase() || "";
  let slackId = parts.slice(1).join(" ").trim();

  // Extract Slack user ID from mention format <@U123ABC>
  const mentionMatch = slackId.match(/<@([A-Z0-9]+)>/i);
  if (mentionMatch) {
    slackId = mentionMatch[1];
  }

  if (!memberId || !slackId) {
    await slack.chat.postMessage({
      channel,
      text: "Usage: `@ai-pm link [team-member-id] @SlackUser`\nExample: `@ai-pm link bhavesh @Bhavesh`",
    });
    return;
  }

  // Verify team member exists
  const teamDoc = await collections.team().doc(memberId).get();
  if (!teamDoc.exists) {
    await slack.chat.postMessage({
      channel,
      text: `:x: Team member \`${memberId}\` not found. Check the team collection.`,
    });
    return;
  }

  await collections.team().doc(memberId).update({
    slackUserId: slackId,
  });

  const memberName = (teamDoc.data()!.name as string) || memberId;
  await slack.chat.postMessage({
    channel,
    text: `:link: Linked *${memberName}* (\`${memberId}\`) → Slack user <@${slackId}>`,
  });

  await logActivity({
    action: "TEAM",
    detail: `Linked team member ${memberId} to Slack user ${slackId}`,
    source: "slack",
  });
}

async function handleShowLog(channel: string): Promise<void> {
  const slack = getSlackClient();

  const snap = await collections.pendingSuggestions()
    .orderBy("ts", "desc")
    .limit(20)
    .get();

  if (snap.empty) {
    await slack.chat.postMessage({ channel, text: ":page_facing_up: No recent activity." });
    return;
  }

  const lines = snap.docs.map((d) => {
    const data = d.data();
    const type = data.type as string;
    const status = data.status as string;
    const ts = data.ts;
    const timeStr = ts && typeof (ts as { toDate: () => Date }).toDate === "function"
      ? (ts as FirebaseFirestore.Timestamp).toDate().toISOString().slice(0, 16).replace("T", " ")
      : "";

    const statusIcon = status === "approved" || status === "sent" || status === "approved_edited" ? ":white_check_mark:"
      : status === "rejected" ? ":x:"
        : status === "snoozed" ? ":zzz:"
          : ":hourglass:";

    if (type === "coaching_nudge") {
      const nudgeType = (data.nudgeType as string) || "nudge";
      const memberName = (data.memberName as string) || "—";
      return `${statusIcon} \`NUDGE:${nudgeType}\` ${memberName} — "${((data.message as string) || "").slice(0, 40)}" [${status}] _${timeStr}_`;
    } else if (type === "daily_digest") {
      return `${statusIcon} \`DIGEST\` ${data.date || ""} [${status}] _${timeStr}_`;
    } else if (type === "follow_up_nudge") {
      const taskName = (data.taskName as string) || "—";
      return `${statusIcon} \`FOLLOW-UP\` ${taskName} — "${((data.reason as string) || "").slice(0, 40)}" [${status}] _${timeStr}_`;
    } else {
      const classification = (data.classification as string) || "—";
      const confidence = (data.confidence as string) || "";
      const msg = ((data.message as string) || "").slice(0, 40);
      const confStr = confidence ? ` (${confidence})` : "";
      return `${statusIcon} \`${classification}\`${confStr} — "${msg}" [${status}] _${timeStr}_`;
    }
  }).join("\n");

  await slack.chat.postMessage({
    channel,
    text: "Recent activity log",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:page_facing_up: *Recent Activity Log* (last 20)\n\n${lines}`,
      },
    }],
  });
}

async function handleManualCheckin(channel: string): Promise<void> {
  const slack = getSlackClient();
  await slack.chat.postMessage({
    channel,
    text: ":hourglass: Starting manual check-in...",
  });

  // Trigger check-in by importing and calling
  const { buildCheckinQuestions } = await import("../checkin/questions");
  const checkins = await buildCheckinQuestions();

  // DM Tuan
  const dmResult = await slack.conversations.open({ users: TUAN_USER_ID() });
  const dmChannel = dmResult.channel?.id;

  if (dmChannel) {
    const today = new Date().toISOString().slice(0, 10);
    const sections: string[] = [`*MANUAL CHECK-IN — ${today}*\n`];
    for (const c of checkins) {
      if (c.questions.length === 0) {
        sections.push(`> :white_check_mark: ${c.summary}`);
      } else {
        const icon = c.threat === "CRITICAL" ? ":red_circle:" :
          c.threat === "HIGH" ? ":large_orange_circle:" : ":large_blue_circle:";
        sections.push(`\n${icon} *${c.clientLabel}* (${c.threat})`);
        for (const q of c.questions) {
          sections.push(`  • ${q}`);
        }
      }
    }
    await slack.chat.postMessage({ channel: dmChannel, text: sections.join("\n") });
  }

  await slack.chat.postMessage({
    channel,
    text: `:white_check_mark: Check-in sent to <@${TUAN_USER_ID()}>`,
  });
}
