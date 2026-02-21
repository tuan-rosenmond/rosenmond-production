import { onRequest } from "firebase-functions/v2/https";
import { logActivity } from "../shared/logger";

// Force-sync ClickUp → Firestore mirror. Called on Warboard load.
// Stubbed for Step 1 — will pull all tasks from ClickUp and update mirror.

export const warboardSync = onRequest(
  { cors: true, region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    await logActivity({
      action: "CLICKUP",
      detail: "[STUB] Warboard sync requested — ClickUp not connected yet",
      source: "warboard",
    });

    res.status(200).json({
      message: "Sync stubbed — ClickUp integration pending",
      synced: 0,
    });
  },
);
