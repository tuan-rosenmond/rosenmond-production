// Check-in question generation — Step 4
// Builds dynamic per-client check-in questions based on board intelligence.

import { collections } from "../shared/firestore";
import { detectBillingGaps } from "../intelligence/billing";
import { analyzeCapacity } from "../intelligence/capacity";
import { detectStalledWork } from "../intelligence/stalled";

export interface ClientCheckin {
  clientId: string;
  clientLabel: string;
  threat: string;
  priority: number; // Higher = more urgent
  questions: string[];
  summary: string; // One-liner for clean clients
}

export async function buildCheckinQuestions(): Promise<ClientCheckin[]> {
  // Gather intelligence
  const [billing, capacity, stalled] = await Promise.all([
    detectBillingGaps(),
    analyzeCapacity(),
    detectStalledWork(),
  ]);

  // Load clients and tasks
  const [clientsSnap, tasksSnap] = await Promise.all([
    collections.clients().get(),
    collections.tasksMirror().get(),
  ]);

  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });
  const clients = clientsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });
  const today = new Date().toISOString().slice(0, 10);

  const checkins: ClientCheckin[] = [];

  for (const client of clients) {
    const clientId = client.id;
    const label = client.label as string;
    const threat = (client.threat as string) || "NORMAL";
    const questions: string[] = [];
    let priority = 0;

    // Client tasks
    const clientTasks = tasks.filter((t) => t.projectId === clientId);
    const activeTasks = clientTasks.filter((t) => !["DONE", "PARKED"].includes(t.status as string));
    const criticalTasks = activeTasks.filter((t) => t.priority === "CRITICAL" || t.priority === "FOCUS");
    const overdueTasks = activeTasks.filter((t) => t.dueDate && (t.dueDate as string) < today);

    // Critical tasks
    if (criticalTasks.length) {
      priority += criticalTasks.length * 3;
      for (const t of criticalTasks) {
        questions.push(`[${t.priority}] "${t.task}" — status: ${t.status}. Update?`);
      }
    }

    // Overdue tasks
    if (overdueTasks.length) {
      priority += overdueTasks.length * 2;
      for (const t of overdueTasks) {
        questions.push(`OVERDUE: "${t.task}" was due ${t.dueDate}. New deadline or close?`);
      }
    }

    // Stalled tasks for this client
    const clientStalled = stalled.filter((s) => s.projectId === clientId);
    if (clientStalled.length) {
      priority += clientStalled.length * 2;
      for (const s of clientStalled) {
        questions.push(`STALLED (${s.daysSinceUpdate}d): "${s.taskName}" — ${s.reason}`);
      }
    }

    // Billing flags for this client
    const clientBilling = billing.filter((b) => b.projectId === clientId);
    for (const b of clientBilling) {
      priority += b.severity === "RED" ? 3 : 1;
      questions.push(`BILLING [${b.severity}]: ${b.detail}`);
    }

    // Threat level boost
    if (threat === "CRITICAL") priority += 5;
    else if (threat === "HIGH") priority += 2;

    // Generate summary
    const summary = questions.length === 0
      ? `${label}: ${activeTasks.length} active, all clear.`
      : `${label}: ${questions.length} items need attention.`;

    checkins.push({
      clientId,
      clientLabel: label,
      threat,
      priority,
      questions,
      summary,
    });
  }

  // Sort by priority (highest first), skip clean clients with no questions
  checkins.sort((a, b) => b.priority - a.priority);

  return checkins;
}
