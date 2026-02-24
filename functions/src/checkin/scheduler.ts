// Morning check-in scheduler — Step 4
// Cloud Scheduler: 08:30 daily, Europe/Zurich
// DMs Tuan in Slack with per-client questions, saves to checkins collection.

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { getSlackClient, TUAN_USER_ID } from "../slack/client";
import { buildCheckinQuestions, type ClientCheckin } from "./questions";

function formatCheckinForSlack(checkins: ClientCheckin[]): string {
  const sections: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  sections.push(`*MORNING CHECK-IN — ${today}*\n`);

  for (const c of checkins) {
    if (c.questions.length === 0) {
      // Clean client — one-liner
      sections.push(`> :white_check_mark: ${c.summary}`);
    } else {
      // Client with issues
      const icon = c.threat === "CRITICAL" ? ":red_circle:" :
        c.threat === "HIGH" ? ":large_orange_circle:" : ":large_blue_circle:";
      sections.push(`\n${icon} *${c.clientLabel}* (${c.threat})`);
      for (const q of c.questions) {
        sections.push(`  • ${q}`);
      }
    }
  }

  return sections.join("\n");
}

async function runCheckin(): Promise<void> {
  await logActivity({
    action: "CHECKIN",
    detail: "Morning check-in started",
    source: "scheduler",
  });

  const checkins = await buildCheckinQuestions();
  const message = formatCheckinForSlack(checkins);

  // DM Tuan via Slack
  const slack = getSlackClient();
  const dmResult = await slack.conversations.open({ users: TUAN_USER_ID() });
  const channelId = dmResult.channel?.id;

  if (channelId) {
    await slack.chat.postMessage({
      channel: channelId,
      text: message,
      mrkdwn: true,
    });
  }

  // Save to checkins collection
  await collections.checkins().add({
    ts: serverTimestamp(),
    date: new Date().toISOString().slice(0, 10),
    clients: checkins.map((c) => ({
      clientId: c.clientId,
      label: c.clientLabel,
      threat: c.threat,
      priority: c.priority,
      questions: c.questions,
      summary: c.summary,
    })),
    slackChannelId: channelId || null,
    transcript: [{ role: "system", text: message, ts: new Date().toISOString() }],
  });

  await logActivity({
    action: "CHECKIN",
    detail: `Morning check-in complete — ${checkins.filter((c) => c.questions.length > 0).length} clients need attention`,
    source: "scheduler",
  });
}

// Scheduled trigger: 08:30 Europe/Zurich daily
export const checkinScheduled = onSchedule(
  {
    schedule: "30 8 * * *",
    timeZone: "Europe/Zurich",
    region: "europe-west1",
  },
  async () => {
    await runCheckin();
  },
);

// Manual trigger endpoint
export const checkinRun = onRequest(
  { cors: true, region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await runCheckin();
      res.status(200).json({ message: "Check-in complete" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  },
);
