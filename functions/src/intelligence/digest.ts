// Daily digest generation — Step 4
// Orchestrates billing + capacity + stalled + overdue + completed yesterday.

import { collections } from "../shared/firestore";
import { detectBillingGaps, type BillingFlag } from "./billing";
import { analyzeCapacity, type CapacityResult } from "./capacity";
import { detectStalledWork, type StalledTask } from "./stalled";

export interface DailyDigest {
  date: string;
  billing: BillingFlag[];
  capacity: CapacityResult;
  stalled: StalledTask[];
  overdue: Array<{ id: string; name: string; projectId: string; dueDate: string; assignee: string | null }>;
  dueThisWeek: Array<{ id: string; name: string; projectId: string; dueDate: string; assignee: string | null }>;
  completedYesterday: Array<{ id: string; name: string; projectId: string; assignee: string | null }>;
}

export async function generateDailyDigest(): Promise<DailyDigest> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Run intelligence modules in parallel
  const [billing, capacity, stalled] = await Promise.all([
    detectBillingGaps(),
    analyzeCapacity(),
    detectStalledWork(),
  ]);

  // Fetch tasks for overdue/due-this-week/completed
  const tasksSnap = await collections.tasksMirror().get();
  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });

  // Overdue: due date < today, not DONE/PARKED
  const overdue = tasks
    .filter((t) => {
      const due = t.dueDate as string | null;
      const status = t.status as string;
      return due && due < today && !["DONE", "PARKED"].includes(status);
    })
    .map((t) => ({
      id: t.id,
      name: (t.task as string) || t.id,
      projectId: t.projectId as string,
      dueDate: t.dueDate as string,
      assignee: (t.assignee as string) || null,
    }));

  // Due this week: due date within next 7 days, not DONE
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekEnd = weekFromNow.toISOString().slice(0, 10);

  const dueThisWeek = tasks
    .filter((t) => {
      const due = t.dueDate as string | null;
      const status = t.status as string;
      return due && due >= today && due <= weekEnd && status !== "DONE";
    })
    .map((t) => ({
      id: t.id,
      name: (t.task as string) || t.id,
      projectId: t.projectId as string,
      dueDate: t.dueDate as string,
      assignee: (t.assignee as string) || null,
    }));

  // Completed yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const completedYesterday = tasks
    .filter((t) => {
      if (t.status !== "DONE") return false;
      const syncedAt = t.lastSyncedAt;
      if (syncedAt && typeof (syncedAt as { toDate: () => Date }).toDate === "function") {
        const d = (syncedAt as FirebaseFirestore.Timestamp).toDate();
        return d.toISOString().slice(0, 10) === yesterdayStr;
      }
      return false;
    })
    .map((t) => ({
      id: t.id,
      name: (t.task as string) || t.id,
      projectId: t.projectId as string,
      assignee: (t.assignee as string) || null,
    }));

  return {
    date: today,
    billing,
    capacity,
    stalled,
    overdue,
    dueThisWeek,
    completedYesterday,
  };
}

/**
 * Format the daily digest as Slack mrkdwn.
 */
export function formatDigestForSlack(digest: DailyDigest): string {
  const sections: string[] = [];

  sections.push(`*WARBOARD DAILY DIGEST — ${digest.date}*`);

  // Billing flags
  const redBilling = digest.billing.filter((f) => f.severity === "RED");
  const amberBilling = digest.billing.filter((f) => f.severity === "AMBER");
  if (redBilling.length || amberBilling.length) {
    sections.push(
      `\n:money_with_wings: *BILLING* (${redBilling.length} red, ${amberBilling.length} amber)` +
      digest.billing.map((f) =>
        `\n${f.severity === "RED" ? ":red_circle:" : ":large_orange_circle:"} ${f.detail}`,
      ).join(""),
    );
  }

  // Capacity
  const overloaded = digest.capacity.members.filter((m) => m.overloaded);
  if (overloaded.length) {
    sections.push(
      `\n:warning: *CAPACITY* — ${overloaded.length} overloaded` +
      overloaded.map((m) =>
        `\n• ${m.memberName}: ${m.activeCount} tasks (${m.criticalCount} critical)`,
      ).join(""),
    );
  }

  if (digest.capacity.unassignedTasks.length) {
    sections.push(
      `\n:bust_in_silhouette: *UNASSIGNED* — ${digest.capacity.unassignedTasks.length} tasks` +
      digest.capacity.unassignedTasks.slice(0, 5).map((t) =>
        `\n• ${t.name} (${t.projectId})`,
      ).join(""),
    );
  }

  // Stalled work
  if (digest.stalled.length) {
    sections.push(
      `\n:snail: *STALLED* — ${digest.stalled.length} tasks` +
      digest.stalled.slice(0, 5).map((t) =>
        `\n• ${t.taskName} — ${t.reason}`,
      ).join(""),
    );
  }

  // Overdue
  if (digest.overdue.length) {
    sections.push(
      `\n:rotating_light: *OVERDUE* — ${digest.overdue.length} tasks` +
      digest.overdue.slice(0, 5).map((t) =>
        `\n• ${t.name} (due ${t.dueDate}, ${t.assignee || "unassigned"})`,
      ).join(""),
    );
  }

  // Due this week
  if (digest.dueThisWeek.length) {
    sections.push(
      `\n:calendar: *DUE THIS WEEK* — ${digest.dueThisWeek.length} tasks` +
      digest.dueThisWeek.slice(0, 8).map((t) =>
        `\n• ${t.name} (${t.dueDate}, ${t.assignee || "unassigned"})`,
      ).join(""),
    );
  }

  // Completed yesterday
  if (digest.completedYesterday.length) {
    sections.push(
      `\n:white_check_mark: *COMPLETED YESTERDAY* — ${digest.completedYesterday.length} tasks` +
      digest.completedYesterday.slice(0, 5).map((t) =>
        `\n• ${t.name} (${t.projectId})`,
      ).join(""),
    );
  }

  // Reassignment suggestions
  if (digest.capacity.reassignmentSuggestions.length) {
    sections.push(
      `\n:arrows_counterclockwise: *REASSIGNMENT SUGGESTIONS*` +
      digest.capacity.reassignmentSuggestions.map((s) =>
        `\n• Move "${s.taskName}" from ${s.from} → ${s.suggestedTo}: ${s.reason}`,
      ).join(""),
    );
  }

  return sections.join("\n");
}
