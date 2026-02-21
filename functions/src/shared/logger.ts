import { collections, serverTimestamp } from "./firestore";

type ActionSource = "warboard" | "slack" | "clickup-webhook" | "scheduler" | "system";

interface ActivityLogEntry {
  action: string;
  detail: string;
  projectId?: string | null;
  taskId?: string | null;
  source: ActionSource;
}

export async function logActivity(entry: ActivityLogEntry): Promise<string> {
  const doc = await collections.activityLog().add({
    ts: serverTimestamp(),
    action: entry.action,
    detail: entry.detail,
    projectId: entry.projectId ?? null,
    taskId: entry.taskId ?? null,
    source: entry.source,
  });
  console.log(`[log] ${entry.source}/${entry.action}: ${entry.detail}`);
  return doc.id;
}
