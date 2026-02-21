import { updateTaskStatus, updateTaskPriority, updateTaskAssignee, createTask, addTaskComment } from "../clickup/api";
import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { WARBOARD_TO_CLICKUP } from "../shared/constants";
import type { WarboardStatus } from "../shared/constants";

export interface TaskUpdate {
  projectId: string;
  taskId: number | string;
  status?: string;
  priority?: string;
  assignee?: string;
  notes?: string;
}

export interface NewTask {
  projectId: string;
  task: string;
  status?: string;
  priority?: string;
  assignee?: string | null;
  disciplines?: string[];
  notes?: string;
}

export interface ClientUpdate {
  clientId: string;
  threat: string;
}

export interface CmdResponse {
  message: string;
  taskUpdates: TaskUpdate[];
  newTasks: NewTask[];
  clientUpdates: ClientUpdate[];
  deleteTasks: Array<{ projectId: string; taskId: number | string }>;
}

export interface ExecutionResult {
  taskUpdates: number;
  newTasks: number;
  clientUpdates: number;
  deleteTasks: number;
}

export async function executeCmdResponse(parsed: CmdResponse): Promise<ExecutionResult> {
  const result: ExecutionResult = { taskUpdates: 0, newTasks: 0, clientUpdates: 0, deleteTasks: 0 };

  // Execute task updates
  for (const u of parsed.taskUpdates) {
    const taskId = String(u.taskId);

    if (u.status) {
      const clickupStatus = WARBOARD_TO_CLICKUP[u.status as WarboardStatus] || u.status;
      await updateTaskStatus(taskId, clickupStatus);
    }
    if (u.priority) {
      await updateTaskPriority(taskId, u.priority);
    }
    if (u.assignee !== undefined) {
      await updateTaskAssignee(taskId, u.assignee);
    }

    // Update Firestore mirror
    const mirrorUpdate: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (u.status) mirrorUpdate.status = u.status;
    if (u.priority) mirrorUpdate.priority = u.priority;
    if (u.assignee !== undefined) mirrorUpdate.assignee = u.assignee;
    if (u.notes !== undefined) mirrorUpdate.notes = u.notes;

    await collections.tasksMirror().doc(taskId).set(mirrorUpdate, { merge: true });

    // Audit comment on ClickUp task
    const changes = [
      u.status && `Status → ${u.status}`,
      u.priority && `Priority → ${u.priority}`,
      u.assignee && `Assignee → ${u.assignee}`,
    ].filter(Boolean).join(", ");
    await addTaskComment(taskId, `🤖 AI Activity Log\n\n[${new Date().toISOString()}] Warboard CMD update\n  Changes: ${changes}\n  Source: Warboard CMD`);

    result.taskUpdates++;
  }

  // Execute new tasks
  for (const nt of parsed.newTasks) {
    const newId = await createTask(nt.projectId, {
      name: nt.task,
      status: nt.status,
      priority: nt.priority,
      assignees: nt.assignee ? [nt.assignee] : undefined,
    });

    // Add to Firestore mirror
    await collections.tasksMirror().doc(newId).set({
      clickupTaskId: newId,
      projectId: nt.projectId,
      task: nt.task,
      assignee: nt.assignee || null,
      status: nt.status || "OPEN",
      priority: nt.priority || "NORMAL",
      disciplines: nt.disciplines || [],
      notes: nt.notes || "",
      dueDate: null,
      lastSyncedAt: serverTimestamp(),
    });

    await addTaskComment(newId, `🤖 AI Activity Log\n\n[${new Date().toISOString()}] Task created from Warboard CMD\n  Source: Warboard CMD`);

    result.newTasks++;
  }

  // Execute client threat updates
  for (const cu of parsed.clientUpdates) {
    await collections.clients().doc(cu.clientId).update({
      threat: cu.threat,
      updatedAt: serverTimestamp(),
    });
    result.clientUpdates++;
  }

  // Log deletions (spec says never delete from ClickUp — archive only)
  for (const dt of parsed.deleteTasks) {
    await logActivity({
      action: "CMD",
      detail: `[SKIPPED] Delete requested for task ${dt.taskId} in ${dt.projectId} — ClickUp policy: archive only`,
      projectId: dt.projectId,
      taskId: String(dt.taskId),
      source: "warboard",
    });
    result.deleteTasks++;
  }

  return result;
}
