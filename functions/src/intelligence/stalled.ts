// Stalled work detection — Step 4
// Finds tasks with no update in 5+ calendar days, WAITING > 3 business days.

import { collections, Timestamp } from "../shared/firestore";

export interface StalledTask {
  taskId: string;
  taskName: string;
  projectId: string;
  status: string;
  assignee: string | null;
  daysSinceUpdate: number;
  reason: string;
}

function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d < end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export async function detectStalledWork(): Promise<StalledTask[]> {
  const stalled: StalledTask[] = [];
  const now = new Date();

  const tasksSnap = await collections.tasksMirror().get();

  for (const doc of tasksSnap.docs) {
    const data = doc.data();
    const status = data.status as string;

    // Skip completed/parked tasks
    if (["DONE", "PARKED"].includes(status)) continue;

    // Get last update timestamp
    const lastSync = data.lastSyncedAt;
    let lastUpdate: Date;
    if (lastSync && typeof lastSync.toDate === "function") {
      lastUpdate = (lastSync as FirebaseFirestore.Timestamp).toDate();
    } else if (data.updatedAt && typeof (data.updatedAt as { toDate: () => Date }).toDate === "function") {
      lastUpdate = (data.updatedAt as FirebaseFirestore.Timestamp).toDate();
    } else {
      continue; // No timestamp to compare
    }

    const daysSince = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    const bizDaysSince = businessDaysBetween(lastUpdate, now);
    const taskName = (data.task as string) || doc.id;
    const projectId = data.projectId as string;
    const assignee = (data.assignee as string) || null;

    // WAITING status > 3 business days — prefer sentToClientAt if available
    if (status === "WAITING") {
      let waitingStart = lastUpdate;
      const sentAt = data.sentToClientAt;
      if (sentAt && typeof (sentAt as { toDate: () => Date }).toDate === "function") {
        waitingStart = (sentAt as FirebaseFirestore.Timestamp).toDate();
      }
      const bizDaysWaiting = businessDaysBetween(waitingStart, now);
      const daysWaiting = Math.floor((now.getTime() - waitingStart.getTime()) / (1000 * 60 * 60 * 24));
      if (bizDaysWaiting > 3) {
        stalled.push({
          taskId: doc.id,
          taskName,
          projectId,
          status,
          assignee,
          daysSinceUpdate: daysWaiting,
          reason: `WAITING for ${bizDaysWaiting} business days (${daysWaiting}d total) — follow up with client`,
        });
        continue;
      }
    }

    // Any non-done task with no update in 5+ calendar days
    if (daysSince >= 5) {
      stalled.push({
        taskId: doc.id,
        taskName,
        projectId,
        status,
        assignee,
        daysSinceUpdate: daysSince,
        reason: `No update in ${daysSince} days — may be stuck or forgotten`,
      });
    }
  }

  // Sort by days stalled (worst first)
  stalled.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  return stalled;
}
