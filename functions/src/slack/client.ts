// Shared Slack helpers — Step 3
// Provides authenticated Slack client, signature verification, and channel constants.

import { WebClient } from "@slack/web-api";
import * as crypto from "crypto";

let slackClient: WebClient | null = null;

export function getSlackClient(): WebClient {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error("Missing env: SLACK_BOT_TOKEN");
    slackClient = new WebClient(token);
  }
  return slackClient;
}

export function AI_OPS_CHANNEL(): string {
  const id = process.env.SLACK_AI_OPS_CHANNEL_ID;
  if (!id) throw new Error("Missing env: SLACK_AI_OPS_CHANNEL_ID");
  return id;
}

export function TUAN_USER_ID(): string {
  const id = process.env.SLACK_TUAN_USER_ID;
  if (!id) throw new Error("Missing env: SLACK_TUAN_USER_ID");
  return id;
}

/**
 * Verify Slack request signature (HMAC-SHA256).
 * Returns true if the signature is valid.
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string | undefined,
  timestamp: string | undefined,
  body: string,
): boolean {
  if (!signature || !timestamp) return false;

  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${body}`;
  const computed = "v0=" + crypto.createHmac("sha256", signingSecret).update(sigBase).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
