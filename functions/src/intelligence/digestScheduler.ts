// Daily digest scheduler — Step 4
// Cloud Scheduler: 09:00 daily, Europe/Zurich
// Posts digest to #ai-ops for admin approval → approved → #mngmt-rosenmond

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { getSlackClient, AI_OPS_CHANNEL } from "../slack/client";
import { generateDailyDigest, formatDigestForSlack } from "./digest";
import { postFollowUpNudges, postCoachingNudges } from "./coaching";
import { postCapacitySuggestions } from "./capacity";

async function runDigest(): Promise<void> {
  await logActivity({
    action: "DIGEST",
    detail: "Daily digest generation started",
    source: "scheduler",
  });

  const digest = await generateDailyDigest();
  const digestText = formatDigestForSlack(digest);

  // Save to pendingSuggestions for tracking / approval flow
  const ref = await collections.pendingSuggestions().add({
    ts: serverTimestamp(),
    type: "daily_digest",
    date: digest.date,
    digestText,
    billingCount: digest.billing.length,
    stalledCount: digest.stalled.length,
    overdueCount: digest.overdue.length,
    status: "pending",
  });

  // Post to #ai-ops with approve/hold buttons
  const slack = getSlackClient();
  await slack.chat.postMessage({
    channel: AI_OPS_CHANNEL(),
    text: `Daily Digest — ${digest.date}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: digestText,
        },
      },
      {
        type: "divider",
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Post to Team" },
            style: "primary",
            action_id: "approve_digest",
            value: ref.id,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Hold" },
            action_id: "hold_digest",
            value: ref.id,
          },
        ],
      },
    ],
  });

  // Also run coaching nudges, follow-up nudges, and capacity suggestions alongside the digest
  const [coachingCount, followUpCount, capacityCount] = await Promise.all([
    postCoachingNudges(),
    postFollowUpNudges(),
    postCapacitySuggestions(),
  ]);

  await logActivity({
    action: "DIGEST",
    detail: `Daily digest posted to #ai-ops (${digest.billing.length} billing flags, ${digest.stalled.length} stalled, ${digest.overdue.length} overdue, ${coachingCount} coaching nudges, ${followUpCount} follow-ups, ${capacityCount} capacity suggestions)`,
    source: "scheduler",
  });
}

// Scheduled trigger: 09:00 Europe/Zurich daily
export const digestScheduled = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Europe/Zurich",
    region: "europe-west1",
  },
  async () => {
    await runDigest();
  },
);

// Manual trigger endpoint
export const digestRun = onRequest(
  { cors: true, region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await runDigest();
      res.status(200).json({ message: "Digest posted to #ai-ops" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  },
);
