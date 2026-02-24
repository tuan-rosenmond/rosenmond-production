// ClickUp API client — Real implementation using ClickUp API v2.
// Env vars: CLICKUP_API_TOKEN, CLICKUP_TEAM_ID, CLICKUP_PROJECTS_SPACE_ID

import { logActivity } from "../shared/logger";
import { collections } from "../shared/firestore";

export interface ClickUpTask {
  id: string;
  name: string;
  description: string;
  status: { status: string };
  priority: { priority: string } | null;
  assignees: Array<{ username: string; id: number }>;
  tags: Array<{ name: string }>;
  due_date: string | null;
  date_created: string;
  date_updated: string;
  time_spent: number;
  list: { id: string; name: string };
  folder: { id: string; name: string };
  space: { id: string };
  custom_fields: Array<{ id: string; name: string; value: unknown; type_config?: unknown }>;
  url: string;
}

// --- Config helpers ---

const BASE = "https://api.clickup.com/api/v2";

function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function hdrs(): Record<string, string> {
  return { Authorization: env("CLICKUP_API_TOKEN"), "Content-Type": "application/json" };
}

// --- HTTP helpers ---

async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: hdrs() });
  if (!res.ok) throw new Error(`ClickUp GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPut<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "PUT", headers: hdrs(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ClickUp PUT ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: hdrs(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ClickUp POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// --- Priority mapping (Warboard → ClickUp) ---
// ClickUp: 1=Urgent, 2=High, 3=Normal, 4=Low

const WARBOARD_PRI_TO_CLICKUP: Record<string, number> = {
  FOCUS: 1,
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
};

// --- Team member cache (name → ClickUp user ID) ---

let memberCache: Map<string, number> | null = null;

async function getMembers(): Promise<Map<string, number>> {
  if (memberCache) return memberCache;
  const data = await apiGet<{ team: { members: Array<{ user: { id: number; username: string } }> } }>(
    `/team/${env("CLICKUP_TEAM_ID")}`,
  );
  memberCache = new Map();
  for (const m of data.team.members) {
    const uname = m.user.username.toLowerCase();
    memberCache.set(uname, m.user.id);
    // Also index by first segment of username (e.g. "bhavesh.p" → "bhavesh")
    const first = uname.split(/[._\-@]/)[0];
    if (first && !memberCache.has(first)) memberCache.set(first, m.user.id);
  }
  return memberCache;
}

async function resolveAssigneeId(name: string): Promise<number | null> {
  const members = await getMembers();
  return members.get(name.toLowerCase()) ?? null;
}

// --- List resolution cache (projectId → ClickUp list ID) ---

let listCache: Map<string, string> | null = null;

async function buildListCache(): Promise<Map<string, string>> {
  if (listCache) return listCache;
  listCache = new Map();

  const spaceId = env("CLICKUP_PROJECTS_SPACE_ID");
  const foldersRes = await apiGet<{ folders: Array<{ id: string; name: string; lists: Array<{ id: string; name: string }> }> }>(
    `/space/${spaceId}/folder`,
  );

  for (const folder of foldersRes.folders || []) {
    // Prefer "Active Work" list, fall back to first list
    const activeList = folder.lists.find((l: { name: string }) => l.name.toLowerCase().includes("active")) || folder.lists[0];
    if (activeList) {
      listCache.set(folder.name.toLowerCase(), activeList.id);
      listCache.set(folder.id, activeList.id);
    }
  }

  return listCache;
}

async function resolveListId(projectId: string): Promise<string | null> {
  // Already a numeric ClickUp list ID
  if (/^\d+$/.test(projectId)) return projectId;

  // Check Firestore client for clickupFolderId
  const clientDoc = await collections.clients().doc(projectId).get();
  if (clientDoc.exists) {
    const data = clientDoc.data();
    if (data?.clickupFolderId) {
      const cache = await buildListCache();
      return cache.get(data.clickupFolderId) ?? null;
    }
    // Try matching by client label
    if (data?.label) {
      const cache = await buildListCache();
      return cache.get((data.label as string).toLowerCase()) ?? null;
    }
  }

  // Try matching projectId directly against folder names
  const cache = await buildListCache();
  return cache.get(projectId.toLowerCase()) ?? null;
}

// --- Public API ---

export async function getTask(taskId: string): Promise<ClickUpTask> {
  return apiGet<ClickUpTask>(`/task/${taskId}`);
}

export async function getTasksFromList(listId: string): Promise<ClickUpTask[]> {
  const all: ClickUpTask[] = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const res = await apiGet<{ tasks: ClickUpTask[] }>(
      `/list/${listId}/task?include_closed=true&page=${page}`,
    );
    const tasks = res.tasks || [];
    all.push(...tasks);
    hasMore = tasks.length === 100; // ClickUp default page size
    page++;
  }
  return all;
}

export async function getAllTasks(): Promise<ClickUpTask[]> {
  const spaceId = env("CLICKUP_PROJECTS_SPACE_ID");

  // Get all folders (response includes nested lists)
  const foldersRes = await apiGet<{ folders: Array<{ id: string; name: string; lists: Array<{ id: string; name: string }> }> }>(
    `/space/${spaceId}/folder`,
  );

  // Get folderless lists
  const listsRes = await apiGet<{ lists: Array<{ id: string; name: string }> }>(
    `/space/${spaceId}/list`,
  );

  // Collect all list IDs
  const allListIds: string[] = [];
  for (const folder of foldersRes.folders || []) {
    for (const list of folder.lists || []) {
      allListIds.push(list.id);
    }
  }
  for (const list of listsRes.lists || []) {
    allListIds.push(list.id);
  }

  // Fetch tasks from all lists
  const allTasks: ClickUpTask[] = [];
  for (const listId of allListIds) {
    const tasks = await getTasksFromList(listId);
    allTasks.push(...tasks);
  }

  console.log(`[clickup] getAllTasks: ${allTasks.length} tasks from ${allListIds.length} lists`);
  return allTasks;
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  // ClickUp expects lowercase status names
  await apiPut(`/task/${taskId}`, { status: status.toLowerCase() });
  await logActivity({
    action: "CLICKUP",
    detail: `Updated task ${taskId} status → "${status}"`,
    taskId,
    source: "system",
  });
}

export async function updateTaskPriority(taskId: string, priority: string): Promise<void> {
  const clickupPri = WARBOARD_PRI_TO_CLICKUP[priority.toUpperCase()] ?? 3;
  await apiPut(`/task/${taskId}`, { priority: clickupPri });
  await logActivity({
    action: "CLICKUP",
    detail: `Updated task ${taskId} priority → "${priority}" (ClickUp: ${clickupPri})`,
    taskId,
    source: "system",
  });
}

export async function updateTaskAssignee(taskId: string, assignee: string): Promise<void> {
  const userId = await resolveAssigneeId(assignee);
  if (!userId) {
    console.warn(`[clickup] Could not resolve assignee "${assignee}" to ClickUp user ID`);
    await logActivity({
      action: "CLICKUP",
      detail: `Could not resolve assignee "${assignee}" for task ${taskId} — skipped ClickUp update`,
      taskId,
      source: "system",
    });
    return;
  }

  // Get current assignees so we can swap
  const task = await getTask(taskId);
  const currentIds = task.assignees.map((a: { id: number }) => a.id);

  await apiPut(`/task/${taskId}`, {
    assignees: { add: [userId], rem: currentIds.filter((id: number) => id !== userId) },
  });

  await logActivity({
    action: "CLICKUP",
    detail: `Reassigned task ${taskId} → "${assignee}" (uid: ${userId})`,
    taskId,
    source: "system",
  });
}

export async function createTask(
  listId: string,
  task: { name: string; status?: string; priority?: string; assignees?: string[] },
): Promise<string> {
  // Resolve list ID (might be a warboard projectId like "noouri")
  const resolvedListId = (await resolveListId(listId)) || listId;

  const body: Record<string, unknown> = { name: task.name };
  if (task.status) body.status = task.status.toLowerCase();
  if (task.priority) body.priority = WARBOARD_PRI_TO_CLICKUP[task.priority.toUpperCase()] ?? 3;

  // Resolve assignee names → ClickUp user IDs
  if (task.assignees?.length) {
    const ids: number[] = [];
    for (const name of task.assignees) {
      const id = await resolveAssigneeId(name);
      if (id) ids.push(id);
    }
    if (ids.length) body.assignees = ids;
  }

  const result = await apiPost<{ id: string }>(`/list/${resolvedListId}/task`, body);

  await logActivity({
    action: "CLICKUP",
    detail: `Created task "${task.name}" in list ${resolvedListId} → ${result.id}`,
    taskId: result.id,
    source: "system",
  });

  return result.id;
}

export async function addTaskComment(taskId: string, comment: string): Promise<void> {
  await apiPost(`/task/${taskId}/comment`, { comment_text: comment });
  await logActivity({
    action: "CLICKUP",
    detail: `Posted audit comment on task ${taskId}`,
    taskId,
    source: "system",
  });
}

export async function moveTaskToList(taskId: string, folderId: string, targetListType: "active" | "backlog"): Promise<void> {
  // Resolve the target list from the folder
  const spaceId = env("CLICKUP_PROJECTS_SPACE_ID");
  const foldersRes = await apiGet<{ folders: Array<{ id: string; name: string; lists: Array<{ id: string; name: string }> }> }>(
    `/space/${spaceId}/folder`,
  );

  const folder = foldersRes.folders.find((f) => f.id === folderId);
  if (!folder) throw new Error(`Folder ${folderId} not found`);

  const keyword = targetListType === "active" ? "active" : "backlog";
  const targetList = folder.lists.find((l) => l.name.toLowerCase().includes(keyword));
  if (!targetList) throw new Error(`No ${targetListType} list found in folder ${folderId}`);

  await apiPut(`/task/${taskId}`, { list: targetList.id });

  await logActivity({
    action: "CLICKUP",
    detail: `Moved task ${taskId} to ${targetList.name} (list ${targetList.id})`,
    taskId,
    source: "system",
  });
}

export async function resolveClientBoardListId(folderId: string): Promise<string | null> {
  const spaceId = env("CLICKUP_PROJECTS_SPACE_ID");
  const foldersRes = await apiGet<{ folders: Array<{ id: string; lists: Array<{ id: string; name: string }> }> }>(
    `/space/${spaceId}/folder`,
  );

  const folder = foldersRes.folders.find((f) => f.id === folderId);
  if (!folder) return null;

  const clientBoardList = folder.lists.find((l) =>
    l.name.toLowerCase().includes("client board") || l.name.toLowerCase().includes("client-board"),
  );

  return clientBoardList?.id ?? null;
}
