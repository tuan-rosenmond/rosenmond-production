import { onRequest } from "firebase-functions/v2/https";
import { getAllTasks, type ClickUpTask } from "../clickup/api";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { CLICKUP_TO_WARBOARD } from "../shared/constants";

// ClickUp priority ID → Warboard priority
const CLICKUP_PRI_TO_WARBOARD: Record<string, string> = {
  "1": "CRITICAL",
  "2": "HIGH",
  "3": "NORMAL",
  "4": "NORMAL",
};

function extractCustomField(task: ClickUpTask, fieldName: string): unknown {
  const field = task.custom_fields?.find(
    (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
  );
  return field?.value ?? null;
}

function normalizeClientId(folderName: string, clientsLookup: Map<string, string>): string | null {
  const lower = folderName.toLowerCase().replace(/\s+/g, "");
  // Direct match
  if (clientsLookup.has(lower)) return clientsLookup.get(lower)!;
  // Partial match
  for (const [key, id] of clientsLookup) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }
  return null;
}

export const warboardSync = onRequest(
  { cors: true, region: "europe-west1", timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await logActivity({
        action: "CLICKUP",
        detail: "Warboard sync initiated — pulling all tasks from ClickUp",
        source: "warboard",
      });

      // Build clients lookup: normalized label → client doc ID
      const clientsSnap = await collections.clients().get();
      const clientsLookup = new Map<string, string>();
      clientsSnap.docs.forEach((d) => {
        const data = d.data();
        const label = (data.label as string || "").toLowerCase().replace(/\s+/g, "");
        clientsLookup.set(label, d.id);
        clientsLookup.set(d.id, d.id);
      });

      // Fetch all tasks from ClickUp
      const clickupTasks = await getAllTasks();

      // Map and batch write to tasksMirror (chunk at 500)
      const BATCH_SIZE = 500;
      let synced = 0;

      for (let i = 0; i < clickupTasks.length; i += BATCH_SIZE) {
        const chunk = clickupTasks.slice(i, i + BATCH_SIZE);
        const batch = collections.tasksMirror().firestore.batch();

        for (const task of chunk) {
          const clickupStatus = task.status.status.toLowerCase();
          const warboardStatus = CLICKUP_TO_WARBOARD[clickupStatus] || "OPEN";
          const clickupPri = task.priority?.priority || "3";
          const warboardPri = CLICKUP_PRI_TO_WARBOARD[clickupPri] || "NORMAL";

          // Resolve folder → projectId
          const projectId = normalizeClientId(task.folder.name, clientsLookup) || task.folder.name.toLowerCase().replace(/\s+/g, "");

          // Extract assignee (first assignee username)
          const assignee = task.assignees?.[0]?.username || null;

          // Extract disciplines from tags
          const disciplines = task.tags
            ?.map((t) => t.name)
            .filter((n) => ["Design", "Development", "Marketing", "Ops", "Content"].includes(n)) || [];

          // Extract billing info from custom fields
          const clientBilling = extractCustomField(task, "client billing") as string | null;
          const teamBilling = extractCustomField(task, "team billing") as string | null;
          const billable = extractCustomField(task, "billable") as boolean | null;

          const mirrorDoc = {
            projectId,
            task: task.name,
            assignee,
            status: warboardStatus,
            priority: warboardPri,
            disciplines,
            notes: task.description || "",
            dueDate: task.due_date ? new Date(Number(task.due_date)).toISOString().slice(0, 10) : null,
            hoursLogged: (task.time_spent || 0) / 3600000,
            clientBilling: clientBilling || null,
            teamBilling: teamBilling || null,
            billable: billable ?? false,
            clickupTaskId: task.id,
            clickupListId: task.list.id,
            clickupFolderId: task.folder.id,
            clickupFolderName: task.folder.name,
            clickupUrl: task.url,
            lastSyncedAt: serverTimestamp(),
          };

          batch.set(collections.tasksMirror().doc(task.id), mirrorDoc, { merge: true });
          synced++;
        }

        await batch.commit();
      }

      await logActivity({
        action: "CLICKUP",
        detail: `Warboard sync complete — ${synced} tasks mirrored from ClickUp`,
        source: "warboard",
      });

      res.status(200).json({
        message: `Sync complete — ${synced} tasks mirrored`,
        synced,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await logActivity({
        action: "CLICKUP",
        detail: `Sync failed: ${errorMsg}`,
        source: "warboard",
      });
      res.status(500).json({ error: errorMsg });
    }
  },
);
