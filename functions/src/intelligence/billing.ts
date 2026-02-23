// Billing gap detection — Step 4
// Scans tasksMirror for revenue leaks and missing time entries.

import { collections } from "../shared/firestore";

export type BillingSeverity = "RED" | "AMBER" | "INFO";

export interface BillingFlag {
  severity: BillingSeverity;
  type: "REVENUE_LEAK" | "MISSING_TIME" | "BUDGET_WARNING";
  taskId: string;
  taskName: string;
  projectId: string;
  detail: string;
}

export async function detectBillingGaps(): Promise<BillingFlag[]> {
  const flags: BillingFlag[] = [];

  const tasksSnap = await collections.tasksMirror().get();
  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });

  // Track per-client hours for budget warnings
  const clientHours = new Map<string, { logged: number; taskCount: number }>();

  for (const task of tasks) {
    const billing = (task.clientBilling as string || "").toLowerCase();
    const isHourly = billing === "hourly" || (task.billable as boolean);
    const hours = (task.hoursLogged as number) || 0;
    const status = task.status as string;
    const projectId = task.projectId as string;
    const taskName = task.task as string || task.id;

    // Track client hours
    if (isHourly) {
      const existing = clientHours.get(projectId) || { logged: 0, taskCount: 0 };
      existing.logged += hours;
      existing.taskCount++;
      clientHours.set(projectId, existing);
    }

    // REVENUE_LEAK: hourly task + DONE + 0 hours logged
    if (isHourly && status === "DONE" && hours === 0) {
      flags.push({
        severity: "RED",
        type: "REVENUE_LEAK",
        taskId: task.id,
        taskName,
        projectId,
        detail: `Hourly task completed with 0h logged — unbilled revenue`,
      });
    }

    // MISSING_TIME: hourly task + IN_PROGRESS + 0 hours logged
    if (isHourly && status === "IN_PROGRESS" && hours === 0) {
      flags.push({
        severity: "AMBER",
        type: "MISSING_TIME",
        taskId: task.id,
        taskName,
        projectId,
        detail: `Hourly task in progress with no time tracked`,
      });
    }
  }

  // BUDGET_WARNING: fixed-price clients approaching budget thresholds
  const clientsSnap = await collections.clients().get();
  for (const clientDoc of clientsSnap.docs) {
    const data = clientDoc.data();
    const budget = data.monthlyBudget as number | undefined;
    if (!budget) continue;

    const hours = clientHours.get(clientDoc.id);
    if (!hours) continue;

    const usage = hours.logged;
    const ratio = usage / budget;
    if (ratio >= 0.85) {
      flags.push({
        severity: ratio >= 1.0 ? "RED" : "AMBER",
        type: "BUDGET_WARNING",
        taskId: "",
        taskName: "",
        projectId: clientDoc.id,
        detail: `${data.label}: ${usage.toFixed(1)}h / ${budget}h budget (${Math.round(ratio * 100)}%)`,
      });
    }
  }

  return flags;
}
