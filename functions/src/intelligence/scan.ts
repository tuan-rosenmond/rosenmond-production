// Intelligence scan module — Step 4
// Builds a rich intelligence snapshot for warboard/scan.ts to feed into Claude.

import { detectBillingGaps, type BillingFlag } from "./billing";
import { analyzeCapacity, type CapacityResult } from "./capacity";
import { detectStalledWork, type StalledTask } from "./stalled";

export interface IntelligenceSnapshot {
  billing: BillingFlag[];
  capacity: CapacityResult;
  stalled: StalledTask[];
}

/**
 * Run all intelligence modules in parallel and return a combined snapshot.
 */
export async function buildIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  const [billing, capacity, stalled] = await Promise.all([
    detectBillingGaps(),
    analyzeCapacity(),
    detectStalledWork(),
  ]);

  return { billing, capacity, stalled };
}

/**
 * Format the intelligence snapshot as text for inclusion in Claude's scan prompt.
 */
export function formatIntelligenceForPrompt(snapshot: IntelligenceSnapshot): string {
  const sections: string[] = [];

  // Billing
  if (snapshot.billing.length) {
    sections.push("BILLING FLAGS:");
    for (const f of snapshot.billing) {
      sections.push(`  [${f.severity}] ${f.type}: ${f.detail} (task: ${f.taskId || "n/a"}, project: ${f.projectId})`);
    }
  }

  // Capacity
  const overloaded = snapshot.capacity.members.filter((m) => m.overloaded);
  if (overloaded.length) {
    sections.push("\nCAPACITY WARNINGS:");
    for (const m of overloaded) {
      sections.push(`  ${m.memberName}: ${m.activeCount} active tasks, ${m.criticalCount} critical — OVERLOADED`);
    }
  }

  if (snapshot.capacity.unassignedTasks.length) {
    sections.push(`\nUNASSIGNED TASKS (${snapshot.capacity.unassignedTasks.length}):`);
    for (const t of snapshot.capacity.unassignedTasks.slice(0, 10)) {
      sections.push(`  [${t.priority}] "${t.name}" in ${t.projectId}`);
    }
  }

  if (snapshot.capacity.reassignmentSuggestions.length) {
    sections.push("\nREASSIGNMENT SUGGESTIONS:");
    for (const s of snapshot.capacity.reassignmentSuggestions) {
      sections.push(`  Move "${s.taskName}" from ${s.from} → ${s.suggestedTo}: ${s.reason}`);
    }
  }

  // Stalled
  if (snapshot.stalled.length) {
    sections.push(`\nSTALLED TASKS (${snapshot.stalled.length}):`);
    for (const t of snapshot.stalled.slice(0, 10)) {
      sections.push(`  "${t.taskName}" (${t.projectId}) — ${t.reason}`);
    }
  }

  return sections.length ? sections.join("\n") : "No intelligence flags detected.";
}
