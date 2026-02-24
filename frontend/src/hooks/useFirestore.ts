import { useState, useEffect } from "react";
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db, FUNCTIONS_URL } from "../firebase";
import type { Task, Client, TeamMember, Domain, Scan, LogEntry, PersonalTask } from "../types";

// ─── Mutation Logging ────────────────────────────────────────────────────────

async function logMutation(
  action: string,
  detail: string,
  projectId?: string | null,
  taskId?: string | null,
) {
  try {
    await addDoc(collection(db, "activityLog"), {
      ts: serverTimestamp(),
      action,
      detail,
      projectId: projectId ?? null,
      taskId: taskId ?? null,
      source: "warboard",
    });
  } catch (err) {
    console.error("logMutation failed:", err);
  }
}

// ─── Tasks (from tasksMirror, grouped by projectId) ─────────────────────────

export function useTasks() {
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tasksMirror"), (snap) => {
      const grouped: Record<string, Task[]> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const task: Task = {
          id: d.id,
          projectId: data.projectId || "",
          task: data.task || "",
          assignee: data.assignee || null,
          status: data.status || "OPEN",
          priority: data.priority || "NORMAL",
          disciplines: data.disciplines || [],
          notes: data.notes || "",
          dueDate: data.dueDate || null,
          hoursLogged: data.hoursLogged || 0,
          clientBilling: data.clientBilling || null,
          teamBilling: data.teamBilling || null,
          billable: data.billable || false,
        };
        const pid = task.projectId;
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(task);
      });
      setTasksByProject(grouped);
    });
    return unsub;
  }, []);

  const getT = (projectId: string): Task[] => tasksByProject[projectId] || [];
  const allFlat = Object.values(tasksByProject).flat();

  const updateTask = async (projectId: string, taskId: string, field: string, value: unknown) => {
    await updateDoc(doc(db, "tasksMirror", taskId), {
      [field]: value,
      lastSyncedAt: serverTimestamp(),
    });
    await logMutation("UPDATE", `Task ${taskId}: ${field} → ${String(value)}`, projectId, taskId);
  };

  const addTask = async (projectId: string) => {
    const ref = await addDoc(collection(db, "tasksMirror"), {
      projectId,
      task: "New task",
      assignee: null,
      status: "OPEN",
      priority: "NORMAL",
      disciplines: [],
      notes: "",
      dueDate: null,
      hoursLogged: 0,
      clientBilling: null,
      teamBilling: null,
      billable: false,
      clickupTaskId: null,
      project: null,
      parentTaskId: null,
      lastSyncedAt: serverTimestamp(),
    });
    await logMutation("CREATE", `New task created in ${projectId}`, projectId, ref.id);
  };

  const deleteTask = async (_projectId: string, taskId: string) => {
    await deleteDoc(doc(db, "tasksMirror", taskId));
    await logMutation("DELETE", `Task ${taskId} deleted`, _projectId, taskId);
  };

  return { tasksByProject, getT, allFlat, updateTask, addTask, deleteTask };
}

// ─── Clients ────────────────────────────────────────────────────────────────

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    });
    return unsub;
  }, []);

  const updateClient = async (clientId: string, field: string, value: unknown) => {
    await updateDoc(doc(db, "clients", clientId), {
      [field]: value,
      updatedAt: serverTimestamp(),
    });
    await logMutation("CLIENT", `Client ${clientId}: ${field} → ${String(value)}`, clientId);
  };

  const addClient = async (cl: Omit<Client, "clickupFolderId"> & { id: string }) => {
    await setDoc(doc(db, "clients", cl.id), {
      ...cl,
      clickupFolderId: null,
      updatedAt: serverTimestamp(),
    });
    await logMutation("CLIENT", `Client ${cl.id} created`, cl.id);
  };

  return { clients, updateClient, addClient, setClients };
}

// ─── Team ───────────────────────────────────────────────────────────────────

export function useTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "team"), (snap) => {
      setTeam(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember)));
    });
    return unsub;
  }, []);

  const addTeamMember = async (member: TeamMember) => {
    await setDoc(doc(db, "team", member.id), {
      ...member,
      slackUserId: null,
      clickupUserId: null,
      defaultBilling: "fixed",
      rate: null,
      clients: {},
    });
    await logMutation("UPDATE", `Team member ${member.name} added`);
  };

  return { team, addTeamMember };
}

// ─── Domains ────────────────────────────────────────────────────────────────

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "domains"), (snap) => {
      setDomains(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Domain)));
    });
    return unsub;
  }, []);

  return { domains };
}

// ─── Scans ──────────────────────────────────────────────────────────────────

export function useScans() {
  const [scanHistory, setScanHistory] = useState<Scan[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "scans"), orderBy("ts", "desc"), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setScanHistory(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ts: data.ts?.toDate?.() || new Date(),
          result: data.result,
          thread: (data.thread || []).map((t: DocumentData) => ({
            role: t.role,
            text: t.text,
          })),
        } as Scan;
      }));
    });
    return unsub;
  }, []);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/warboardScan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "tuan" }),
      });
      await res.json();
    } catch (e) {
      console.error("Scan failed:", e);
    }
    setScanning(false);
  };

  const replyScan = async (scanId: string, message: string) => {
    // Add user message to thread, then call scan follow-up
    const scanRef = doc(db, "scans", scanId);
    const scan = scanHistory.find((s) => s.id === scanId);
    if (!scan) return;

    const updatedThread = [...scan.thread, { role: "user" as const, text: message }];
    await updateDoc(scanRef, { thread: updatedThread });

    setScanning(true);
    try {
      // For now, follow-up goes through the same scan endpoint with context
      // In production this would be a dedicated follow-up endpoint
      const res = await fetch(`${FUNCTIONS_URL}/warboardScan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "tuan", followUp: message, scanId }),
      });
      const data = await res.json();
      if (data.result?.message) {
        const finalThread = [...updatedThread, { role: "scan" as const, text: data.result.message }];
        await updateDoc(scanRef, { thread: finalThread });
      }
    } catch (e) {
      console.error("Scan reply failed:", e);
      const errThread = [...updatedThread, { role: "scan" as const, text: "⚠ Connection error." }];
      await updateDoc(scanRef, { thread: errThread });
    }
    setScanning(false);
  };

  return { scanHistory, scanning, runScan, replyScan };
}

// ─── Activity Log ───────────────────────────────────────────────────────────

export function useActivityLog() {
  const [actLog, setActLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    const q = query(collection(db, "activityLog"), orderBy("ts", "desc"), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      setActLog(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ts: data.ts?.toDate?.() || new Date(),
          action: data.action || "",
          detail: data.detail || "",
          projectId: data.projectId || null,
          taskId: data.taskId || null,
          source: data.source || "",
        } as LogEntry;
      }));
    });
    return unsub;
  }, []);

  const addLog = async (action: string, detail: string, projectId?: string | null, taskId?: string | null) => {
    await addDoc(collection(db, "activityLog"), {
      ts: serverTimestamp(),
      action,
      detail,
      projectId: projectId ?? null,
      taskId: taskId ?? null,
      source: "warboard",
    });
  };

  return { actLog, addLog };
}

// ─── Personal Tasks ─────────────────────────────────────────────────────────

export function usePersonalTasks() {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "personalTasks"), (snap) => {
      const tasks: PersonalTask[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          task: data.task || "",
          status: data.status || "OPEN",
          priority: data.priority || "NORMAL",
          notes: data.notes || "",
          dueDate: data.dueDate || null,
          disciplines: data.disciplines || [],
          clientId: data.clientId || null,
          domainId: data.domainId || null,
          linkedTeamTaskId: data.linkedTeamTaskId || null,
          linkDirection: data.linkDirection || null,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        };
      });
      setPersonalTasks(tasks);
    });
    return unsub;
  }, []);

  const addPersonalTask = async (taskName: string) => {
    const ref = await addDoc(collection(db, "personalTasks"), {
      task: taskName,
      status: "OPEN",
      priority: "NORMAL",
      notes: "",
      dueDate: null,
      disciplines: [],
      clientId: null,
      domainId: null,
      linkedTeamTaskId: null,
      linkDirection: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logMutation("PERSONAL", `Personal task created: ${taskName}`, null, ref.id);
  };

  const updatePersonalTask = async (taskId: string, field: string, value: unknown) => {
    await updateDoc(doc(db, "personalTasks", taskId), {
      [field]: value,
      updatedAt: serverTimestamp(),
    });
    await logMutation("PERSONAL", `Personal task ${taskId}: ${field} → ${String(value)}`, null, taskId);
  };

  const deletePersonalTask = async (taskId: string) => {
    // If linked, clear the back-link on the team task first
    const task = personalTasks.find(t => t.id === taskId);
    if (task?.linkedTeamTaskId) {
      await updateDoc(doc(db, "tasksMirror", task.linkedTeamTaskId), {
        linkedPersonalTaskId: null,
      });
    }
    await deleteDoc(doc(db, "personalTasks", taskId));
    await logMutation("PERSONAL", `Personal task ${taskId} deleted`, null, taskId);
  };

  const pushToTeam = async (taskId: string, projectId: string) => {
    const task = personalTasks.find(t => t.id === taskId);
    if (!task) return;

    // Create a new tasksMirror doc
    const ref = await addDoc(collection(db, "tasksMirror"), {
      projectId,
      task: task.task,
      assignee: null,
      status: task.status,
      priority: task.priority,
      disciplines: task.disciplines,
      notes: task.notes,
      dueDate: task.dueDate,
      hoursLogged: 0,
      clientBilling: null,
      teamBilling: null,
      billable: false,
      clickupTaskId: null,
      project: null,
      parentTaskId: null,
      linkedPersonalTaskId: taskId,
      lastSyncedAt: serverTimestamp(),
    });

    // Link personal task back to team task
    await updateDoc(doc(db, "personalTasks", taskId), {
      linkedTeamTaskId: ref.id,
      linkDirection: "pushed",
      updatedAt: serverTimestamp(),
    });

    await logMutation("PERSONAL", `Pushed personal task "${task.task}" to team (${projectId})`, projectId, ref.id);
  };

  const pullFromTeam = async (teamTaskId: string, teamTask: Task) => {
    // Create a personal task from the team task
    const ref = await addDoc(collection(db, "personalTasks"), {
      task: teamTask.task,
      status: teamTask.status,
      priority: teamTask.priority,
      notes: teamTask.notes,
      dueDate: teamTask.dueDate,
      disciplines: teamTask.disciplines,
      clientId: null,
      domainId: null,
      linkedTeamTaskId: teamTaskId,
      linkDirection: "pulled",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Link team task back to personal
    await updateDoc(doc(db, "tasksMirror", teamTaskId), {
      linkedPersonalTaskId: ref.id,
    });

    await logMutation("PERSONAL", `Pulled team task "${teamTask.task}" to personal`, teamTask.projectId, teamTaskId);
  };

  const unlinkTask = async (taskId: string) => {
    const task = personalTasks.find(t => t.id === taskId);
    if (!task?.linkedTeamTaskId) return;

    // Clear link on team task
    await updateDoc(doc(db, "tasksMirror", task.linkedTeamTaskId), {
      linkedPersonalTaskId: null,
    });

    // Clear link on personal task
    await updateDoc(doc(db, "personalTasks", taskId), {
      linkedTeamTaskId: null,
      linkDirection: null,
      updatedAt: serverTimestamp(),
    });

    await logMutation("PERSONAL", `Unlinked personal task ${taskId}`, null, taskId);
  };

  return { personalTasks, addPersonalTask, updatePersonalTask, deletePersonalTask, pushToTeam, pullFromTeam, unlinkTask };
}

// ─── CMD ────────────────────────────────────────────────────────────────────

export function useCmd() {
  const [loading, setLoading] = useState(false);

  const sendCmd = async (message: string): Promise<{ message: string; changes: Record<string, number> }> => {
    setLoading(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/warboardCmd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setLoading(false);
      return data;
    } catch {
      setLoading(false);
      return { message: "⚠ Signal lost. Check connection.", changes: {} };
    }
  };

  return { loading, sendCmd };
}
