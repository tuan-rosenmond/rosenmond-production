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
  if (!field) return null;

  const value = field.value;
  if (value === null || value === undefined) return null;

  const typeConfig = field.type_config as Record<string, unknown> | undefined;

  // Dropdown: value is option index (number) → resolve via type_config.options
  if (typeConfig?.options && typeof value === "number") {
    const options = typeConfig.options as Array<{ name: string; orderindex: number }>;
    const option = options.find((o) => o.orderindex === value);
    return option?.name ?? null;
  }

  // Labels/multi-select: value is array of option IDs → resolve names
  if (typeConfig?.options && Array.isArray(value)) {
    const options = typeConfig.options as Array<{ id: string; name: string }>;
    const names = (value as Array<string | number>)
      .map((v) => options.find((o) => String(o.id) === String(v))?.name)
      .filter(Boolean);
    return names.length === 1 ? names[0] : names.length > 0 ? names : null;
  }

  // Nested object with its own value property
  if (typeof value === "object" && value !== null && "value" in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).value;
  }

  // Primitive — return directly
  return value;
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

      // Track unique projects by folder for Gap 5
      const projectsMap = new Map<string, { clientId: string; label: string; clickupFolderId: string; clickupListIds: Set<string> }>();

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
          let warboardPri = CLICKUP_PRI_TO_WARBOARD[clickupPri] || "NORMAL";

          // Preserve FOCUS priority: if mirror doc already has FOCUS and ClickUp priority is 1 (Urgent),
          // keep FOCUS instead of overwriting with CRITICAL
          if (clickupPri === "1") {
            const existingDoc = await collections.tasksMirror().doc(task.id).get();
            if (existingDoc.exists && existingDoc.data()?.priority === "FOCUS") {
              warboardPri = "FOCUS";
            }
          }

          // Resolve folder → projectId, then check "Project" custom field override
          const folderProjectId = normalizeClientId(task.folder.name, clientsLookup) || task.folder.name.toLowerCase().replace(/\s+/g, "");
          const projectField = extractCustomField(task, "project") as string | null;
          let projectId = folderProjectId;
          if (projectField) {
            const resolved = normalizeClientId(projectField, clientsLookup);
            if (resolved) projectId = resolved;
          }

          // Extract assignee (first assignee username)
          const assignee = task.assignees?.[0]?.username || null;

          // Extract disciplines from tags
          const disciplines = task.tags
            ?.map((t) => t.name)
            .filter((n) => ["Design", "Development", "Marketing", "Ops", "Content"].includes(n)) || [];

          // Track project metadata
          const projKey = `${projectId}::${task.folder.id}`;
          if (!projectsMap.has(projKey)) {
            projectsMap.set(projKey, {
              clientId: projectId,
              label: task.folder.name,
              clickupFolderId: task.folder.id,
              clickupListIds: new Set<string>(),
            });
          }
          projectsMap.get(projKey)!.clickupListIds.add(task.list.id);

          // Extract billing info from custom fields (normalize to lowercase)
          const clientBilling = (extractCustomField(task, "client billing") as string | null)?.toLowerCase() || null;
          const teamBilling = (extractCustomField(task, "team billing") as string | null)?.toLowerCase() || null;
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

      // Write project metadata to projects subcollections
      for (const [, proj] of projectsMap) {
        await collections.projects(proj.clientId).doc(proj.clickupFolderId).set({
          clientId: proj.clientId,
          label: proj.label,
          clickupFolderId: proj.clickupFolderId,
          clickupListIds: Array.from(proj.clickupListIds),
          lastSyncedAt: serverTimestamp(),
        }, { merge: true });
      }

      await logActivity({
        action: "CLICKUP",
        detail: `Warboard sync complete — ${synced} tasks mirrored, ${projectsMap.size} projects updated`,
        source: "warboard",
      });

      res.status(200).json({
        message: `Sync complete — ${synced} tasks mirrored, ${projectsMap.size} projects`,
        synced,
        projects: projectsMap.size,
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
