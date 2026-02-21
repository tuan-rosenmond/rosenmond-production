import { collections } from "../shared/firestore";
import { getAllTasks, ClickUpTask } from "../clickup/api";

export interface CommandContext {
  domains: Array<{ id: string; label: string; tasks: Array<{ id: string; task: string; status: string; priority: string; assignee: string | null }> }>;
  clients: Array<{ id: string; label: string; threat: string; disciplines: string[]; lead: string | null; lead2: string | null; tasks: Array<{ id: string; task: string; status: string; priority: string; assignee: string | null; notes: string }> }>;
  team: Array<{ id: string; name: string; role: string }>;
}

export interface ScanContext {
  allTasks: ClickUpTask[];
  clients: Array<{ id: string; label: string; threat: string; disciplines: string[]; lead: string | null; lead2: string | null }>;
  team: Array<{ id: string; name: string; role: string }>;
  stats: {
    total: number;
    focus: number;
    criticalOpen: number;
    unassigned: number;
    overdue: number;
    done: number;
  };
}

export async function buildCommandContext(): Promise<CommandContext> {
  const [teamSnap, clientSnap, domainSnap] = await Promise.all([
    collections.team().get(),
    collections.clients().get(),
    collections.domains().get(),
  ]);

  const team = teamSnap.docs.map(d => ({ id: d.id, ...d.data() as { name: string; role: string } }));
  const clients = clientSnap.docs.map(d => {
    const data = d.data() as { label: string; threat: string; disciplines: string[]; lead: string | null; lead2: string | null };
    return { id: d.id, ...data, tasks: [] as CommandContext["clients"][0]["tasks"] };
  });
  const domains = domainSnap.docs.map(d => {
    const data = d.data() as { label: string };
    return { id: d.id, ...data, tasks: [] as CommandContext["domains"][0]["tasks"] };
  });

  // Pull tasks from mirror (or ClickUp stub)
  const mirrorSnap = await collections.tasksMirror().get();
  if (mirrorSnap.empty) {
    // Fallback to ClickUp stub if mirror is empty
    const stubTasks = await getAllTasks();
    // Map stub tasks to clients/domains by folder name
    for (const t of stubTasks) {
      const folderName = t.folder.name.toLowerCase();
      const client = clients.find(c => folderName.includes(c.id));
      const domain = domains.find(d => folderName.includes(d.id));
      const mapped = {
        id: t.id,
        task: t.name,
        status: t.status.status.toUpperCase().replace(/ /g, "_"),
        priority: t.priority?.priority === "1" ? "CRITICAL" : t.priority?.priority === "2" ? "HIGH" : "NORMAL",
        assignee: t.assignees[0]?.username || null,
        notes: t.description,
      };
      if (client) client.tasks.push(mapped);
      else if (domain) domain.tasks.push(mapped);
    }
  } else {
    // Use Firestore mirror data
    for (const doc of mirrorSnap.docs) {
      const data = doc.data();
      const mapped = {
        id: doc.id,
        task: data.task || data.name || "",
        status: data.status || "OPEN",
        priority: data.priority || "NORMAL",
        assignee: data.assignee || null,
        notes: data.notes || "",
      };
      const pid = data.projectId;
      const client = clients.find(c => c.id === pid);
      const domain = domains.find(d => d.id === pid);
      if (client) client.tasks.push(mapped);
      else if (domain) domain.tasks.push(mapped);
    }
  }

  return { domains, clients, team };
}

export async function buildScanContext(): Promise<ScanContext> {
  const [teamSnap, clientSnap] = await Promise.all([
    collections.team().get(),
    collections.clients().get(),
  ]);

  const team = teamSnap.docs.map(d => ({ id: d.id, ...d.data() as { name: string; role: string } }));
  const clients = clientSnap.docs.map(d => {
    const data = d.data() as { label: string; threat: string; disciplines: string[]; lead: string | null; lead2: string | null };
    return { id: d.id, ...data };
  });

  const allTasks = await getAllTasks();
  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    total: allTasks.length,
    focus: 0, // no FOCUS in ClickUp — mapped from warboard only
    criticalOpen: allTasks.filter(t => t.priority?.priority === "1" && t.status.status !== "done").length,
    unassigned: allTasks.filter(t => t.assignees.length === 0 && t.status.status !== "done").length,
    overdue: allTasks.filter(t => t.due_date && t.due_date < today && t.status.status !== "done").length,
    done: allTasks.filter(t => t.status.status === "done").length,
  };

  return { allTasks, clients, team, stats };
}
