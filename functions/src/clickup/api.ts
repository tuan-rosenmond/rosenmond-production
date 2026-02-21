// ClickUp API client — fully stubbed until ClickUp Business plan API access is confirmed.
// All methods log what they would do via logActivity().

import { logActivity } from "../shared/logger";

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
  custom_fields: Array<{ id: string; name: string; value: unknown }>;
  url: string;
}

function mockTask(overrides: Partial<ClickUpTask> = {}): ClickUpTask {
  return {
    id: "stub_" + Math.random().toString(36).slice(2, 8),
    name: "Stubbed Task",
    description: "",
    status: { status: "in progress" },
    priority: { priority: "3" },
    assignees: [],
    tags: [],
    due_date: null,
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    time_spent: 0,
    list: { id: "list_stub", name: "Active Work" },
    folder: { id: "folder_stub", name: "Client" },
    space: { id: "space_stub" },
    custom_fields: [],
    url: "https://app.clickup.com/t/stub",
    ...overrides,
  };
}

export async function getTask(taskId: string): Promise<ClickUpTask> {
  console.log(`[clickup-stub] getTask(${taskId})`);
  return mockTask({ id: taskId });
}

export async function getTasksFromList(listId: string): Promise<ClickUpTask[]> {
  console.log(`[clickup-stub] getTasksFromList(${listId})`);
  return [
    mockTask({ id: "t001", name: "Design homepage", status: { status: "in progress" } }),
    mockTask({ id: "t002", name: "Build contact form", status: { status: "new request" } }),
  ];
}

export async function getAllTasks(): Promise<ClickUpTask[]> {
  console.log("[clickup-stub] getAllTasks()");
  return [
    mockTask({ id: "t010", name: "Fix 4 bugs — buttons + mobile", folder: { id: "f1", name: "Noouri" }, status: { status: "in progress" }, priority: { priority: "1" }, assignees: [{ username: "bhavesh", id: 1 }] }),
    mockTask({ id: "t011", name: "Booking pages: 4 info sections", folder: { id: "f1", name: "Noouri" }, status: { status: "in progress" }, priority: { priority: "2" }, assignees: [{ username: "marija", id: 2 }] }),
    mockTask({ id: "t020", name: "Finalize & Send Content Proposal", folder: { id: "f2", name: "Iräye" }, status: { status: "in progress" }, priority: { priority: "1" }, assignees: [{ username: "tuan", id: 3 }] }),
    mockTask({ id: "t021", name: "Perf. marketing audit + contract", folder: { id: "f2", name: "Iräye" }, status: { status: "new request" }, priority: { priority: "1" }, assignees: [{ username: "tuan", id: 3 }] }),
    mockTask({ id: "t030", name: "Develop Expace Pro", folder: { id: "f3", name: "Pure Clinic" }, status: { status: "new request" }, priority: { priority: "1" }, assignees: [] }),
    mockTask({ id: "t031", name: "Scope Creep Resolution", folder: { id: "f3", name: "Pure Clinic" }, status: { status: "new request" }, priority: { priority: "1" }, assignees: [] }),
    mockTask({ id: "t040", name: "Rapid Mail Set Up", folder: { id: "f4", name: "HSG" }, status: { status: "in progress" }, priority: { priority: "2" }, assignees: [{ username: "tuan", id: 3 }] }),
    mockTask({ id: "t050", name: "Documentation", folder: { id: "f5", name: "Dr. Liv" }, status: { status: "in progress" }, priority: { priority: "1" }, assignees: [] }),
    mockTask({ id: "t060", name: "Create Ad Creative (Lead Gen)", folder: { id: "f6", name: "Strategy" }, status: { status: "new request" }, priority: { priority: "1" }, assignees: [] }),
    mockTask({ id: "t061", name: "Portfolio Refinement & Content", folder: { id: "f6", name: "Strategy" }, status: { status: "in progress" }, priority: { priority: "1" }, assignees: [{ username: "tuan", id: 3 }] }),
  ];
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  console.log(`[clickup-stub] updateTaskStatus(${taskId}, ${status})`);
  await logActivity({
    action: "CLICKUP",
    detail: `[STUB] Would update task ${taskId} status to "${status}"`,
    taskId,
    source: "system",
  });
}

export async function updateTaskPriority(taskId: string, priority: string): Promise<void> {
  console.log(`[clickup-stub] updateTaskPriority(${taskId}, ${priority})`);
  await logActivity({
    action: "CLICKUP",
    detail: `[STUB] Would update task ${taskId} priority to "${priority}"`,
    taskId,
    source: "system",
  });
}

export async function updateTaskAssignee(taskId: string, assignee: string): Promise<void> {
  console.log(`[clickup-stub] updateTaskAssignee(${taskId}, ${assignee})`);
  await logActivity({
    action: "CLICKUP",
    detail: `[STUB] Would reassign task ${taskId} to "${assignee}"`,
    taskId,
    source: "system",
  });
}

export async function createTask(listId: string, task: { name: string; status?: string; priority?: string; assignees?: string[] }): Promise<string> {
  const id = "new_" + Date.now();
  console.log(`[clickup-stub] createTask in list ${listId}: "${task.name}"`);
  await logActivity({
    action: "CLICKUP",
    detail: `[STUB] Would create task "${task.name}" in list ${listId}`,
    taskId: id,
    source: "system",
  });
  return id;
}

export async function addTaskComment(taskId: string, comment: string): Promise<void> {
  console.log(`[clickup-stub] addTaskComment(${taskId}): ${comment.slice(0, 80)}...`);
  await logActivity({
    action: "CLICKUP",
    detail: `[STUB] Would post audit comment on task ${taskId}`,
    taskId,
    source: "system",
  });
}
