// Warboard data types — mirrors Firestore document shapes

export interface Task {
  id: string;
  projectId: string;
  task: string;
  assignee: string | null;
  status: string;
  priority: string;
  disciplines: string[];
  notes: string;
  dueDate: string | null;
  hoursLogged?: number;
  clientBilling?: string | null;
  teamBilling?: string | null;
  billable?: boolean;
  // Enrichment fields added by views
  _pid?: string;
  _plabel?: string;
  _pcolor?: string;
  _ptype?: "domain" | "client";
}

export interface Client {
  id: string;
  label: string;
  threat: string;
  disciplines: string[];
  lead: string | null;
  lead2: string | null;
  x: number;
  y: number;
  clickupFolderId: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  disciplines: string[];
  active: boolean;
}

export interface Domain {
  id: string;
  label: string;
  sub: string;
  color: string;
  x: number;
  y: number;
}

export interface ScanResult {
  health: { score: number; grade: string; summary: string };
  now: Array<{ title: string; reason: string; pid: string | null; tid: string | null }>;
  flags: Array<{
    severity: "RED" | "AMBER" | "INFO";
    category: string;
    title: string;
    detail: string;
    action: string;
    pid: string | null;
    tid: string | null;
  }>;
  message: string;
}

export interface Scan {
  id: string;
  ts: Date;
  result: ScanResult;
  thread: Array<{ role: "scan" | "user"; text: string }>;
}

export interface LogEntry {
  id: string;
  ts: Date;
  action: string;
  detail: string;
  projectId: string | null;
  taskId: string | null;
  source: string;
}

export interface PersonalTask {
  id: string;
  task: string;
  status: string;
  priority: string;
  notes: string;
  dueDate: string | null;
  disciplines: string[];
  clientId: string | null;
  domainId: string | null;
  linkedTeamTaskId: string | null;
  linkDirection: "pushed" | "pulled" | null;
  createdAt: Date;
  updatedAt: Date;
}
