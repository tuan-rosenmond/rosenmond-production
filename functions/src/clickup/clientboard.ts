// Client Board auto-sync
// Syncs Active Work status changes to client-facing ClickUp boards.
// Uses WARBOARD_TO_CLIENT_BOARD mapping from shared/constants.

import { collections, serverTimestamp } from "../shared/firestore";
import { logActivity } from "../shared/logger";
import { WARBOARD_TO_CLIENT_BOARD, type WarboardStatus } from "../shared/constants";
import { createTask, getTask, updateTaskStatus, resolveClientBoardListId } from "./api";

/**
 * Sync a task's status to the corresponding client board.
 * Looks up clientBoardSync doc → if exists, updates client board task status.
 * If not, auto-creates the client board mirror task.
 */
export async function syncToClientBoard(
  taskId: string,
  warboardStatus: WarboardStatus,
  folderName: string,
): Promise<void> {
  const clientBoardStatus = WARBOARD_TO_CLIENT_BOARD[warboardStatus];
  if (!clientBoardStatus) return;

  try {
    // Check if we already have a client board mapping
    const syncDoc = await collections.clientBoardSync().doc(taskId).get();

    if (syncDoc.exists) {
      const data = syncDoc.data()!;
      // Update the client board task status
      await updateTaskStatus(data.clientBoardTaskId as string, clientBoardStatus);

      await collections.clientBoardSync().doc(taskId).update({
        lastSyncedAt: serverTimestamp(),
        lastStatus: clientBoardStatus,
      });

      await logActivity({
        action: "CLIENT_BOARD",
        detail: `Synced task ${taskId} → client board ${data.clientBoardTaskId}: ${clientBoardStatus}`,
        taskId,
        source: "system",
      });
    } else {
      // Auto-create client board mirror task when entering Active Work
      await createClientBoardMirror(taskId, warboardStatus, folderName);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity({
      action: "CLIENT_BOARD",
      detail: `Client board sync failed for ${taskId}: ${msg}`,
      taskId,
      source: "system",
    });
  }
}

/**
 * Create a mirror task on the client board for the given task.
 * Resolves the "Client Board" list ID from the same folder.
 */
export async function createClientBoardMirror(
  taskId: string,
  warboardStatus: WarboardStatus,
  folderName: string,
): Promise<void> {
  try {
    // Fetch the original task to get its details
    const task = await getTask(taskId);

    // Find the "Client Board" list in the same folder
    const clientBoardListId = await resolveClientBoardListId(task.folder.id);

    if (!clientBoardListId) {
      await logActivity({
        action: "CLIENT_BOARD",
        detail: `No Client Board list found in folder ${folderName} — skipping mirror for ${taskId}`,
        taskId,
        source: "system",
      });
      return;
    }

    const clientBoardStatus = WARBOARD_TO_CLIENT_BOARD[warboardStatus] || "In Progress";

    // Create the mirror task on the client board
    const clientBoardTaskId = await createTask(clientBoardListId, {
      name: task.name,
      status: clientBoardStatus,
    });

    // Save the mapping
    await collections.clientBoardSync().doc(taskId).set({
      clickupTaskId: taskId,
      clientBoardTaskId,
      clientBoardListId,
      clientId: folderName.toLowerCase().replace(/\s+/g, ""),
      lastStatus: clientBoardStatus,
      lastSyncedAt: serverTimestamp(),
    });

    await logActivity({
      action: "CLIENT_BOARD",
      detail: `Created client board mirror for ${taskId} → ${clientBoardTaskId} in ${folderName}`,
      taskId,
      source: "system",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity({
      action: "CLIENT_BOARD",
      detail: `Failed to create client board mirror for ${taskId}: ${msg}`,
      taskId,
      source: "system",
    });
  }
}
