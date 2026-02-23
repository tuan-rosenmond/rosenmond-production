// Team capacity analysis — Step 4
// Per-member load, overloaded flags, reassignment suggestions, unassigned tasks.

import { collections } from "../shared/firestore";

export interface MemberCapacity {
  memberId: string;
  memberName: string;
  activeCount: number;
  criticalCount: number;
  focusCount: number;
  overloaded: boolean;
  tasks: Array<{ id: string; name: string; priority: string; status: string }>;
}

export interface CapacityResult {
  members: MemberCapacity[];
  unassignedTasks: Array<{ id: string; name: string; projectId: string; priority: string }>;
  reassignmentSuggestions: Array<{
    taskId: string;
    taskName: string;
    from: string;
    suggestedTo: string;
    reason: string;
  }>;
}

const OVERLOAD_THRESHOLD = 8;

export async function analyzeCapacity(): Promise<CapacityResult> {
  const [tasksSnap, teamSnap] = await Promise.all([
    collections.tasksMirror().get(),
    collections.team().get(),
  ]);

  const tasks = tasksSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });
  const team = teamSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as { id: string } & Record<string, unknown>;
  });

  const activeTasks = tasks.filter(
    (t) => !["DONE", "PARKED"].includes(t.status as string),
  );

  // Per-member capacity
  const members: MemberCapacity[] = team
    .filter((m) => m.active !== false)
    .map((m) => {
      const name = m.name as string;
      const memberTasks = activeTasks.filter(
        (t) => (t.assignee as string)?.toLowerCase() === name.toLowerCase() ||
          (t.assignee as string)?.toLowerCase() === m.id.toLowerCase(),
      );

      return {
        memberId: m.id,
        memberName: name,
        activeCount: memberTasks.length,
        criticalCount: memberTasks.filter((t) => t.priority === "CRITICAL").length,
        focusCount: memberTasks.filter((t) => t.priority === "FOCUS").length,
        overloaded: memberTasks.length >= OVERLOAD_THRESHOLD,
        tasks: memberTasks.map((t) => ({
          id: t.id,
          name: (t.task as string) || t.id,
          priority: t.priority as string,
          status: t.status as string,
        })),
      };
    });

  // Unassigned tasks
  const unassignedTasks = activeTasks
    .filter((t) => !t.assignee)
    .map((t) => ({
      id: t.id,
      name: (t.task as string) || t.id,
      projectId: t.projectId as string,
      priority: t.priority as string,
    }));

  // Reassignment suggestions for overloaded members
  const reassignmentSuggestions: CapacityResult["reassignmentSuggestions"] = [];
  const overloaded = members.filter((m) => m.overloaded);
  const underloaded = members
    .filter((m) => !m.overloaded && m.activeCount < OVERLOAD_THRESHOLD - 2)
    .sort((a, b) => a.activeCount - b.activeCount);

  for (const member of overloaded) {
    // Find NORMAL priority tasks to offload
    const normalTasks = member.tasks
      .filter((t) => t.priority === "NORMAL")
      .slice(0, 2);

    for (const task of normalTasks) {
      const target = underloaded[0];
      if (!target) break;
      reassignmentSuggestions.push({
        taskId: task.id,
        taskName: task.name,
        from: member.memberName,
        suggestedTo: target.memberName,
        reason: `${member.memberName} has ${member.activeCount} active tasks (overloaded). ${target.memberName} has ${target.activeCount}.`,
      });
    }
  }

  return { members, unassignedTasks, reassignmentSuggestions };
}
