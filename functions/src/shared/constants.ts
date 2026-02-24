// ROSENMOND — Shared Constants
// Single source of truth. Import everywhere — frontend and backend must be identical.

export const DISCIPLINES = ["Design", "Development", "Marketing", "Ops", "Content"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const DISC_COLOR: Record<Discipline, string> = {
  Design: "#f472b6",
  Development: "#34d399",
  Marketing: "#f97316",
  Ops: "#7B68EE",
  Content: "#a78bfa",
};

export const PRIORITIES = ["FOCUS", "CRITICAL", "HIGH", "NORMAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRI_COLOR: Record<Priority, string> = {
  FOCUS: "#a3e635",
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  NORMAL: "#60a5fa",
};

export const THREAT_LEVELS = ["CRITICAL", "HIGH", "NORMAL", "IN_PROGRESS"] as const;
export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export const THREAT_COLOR: Record<ThreatLevel, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  NORMAL: "#34d399",
  IN_PROGRESS: "#7B68EE",
};

export const WARBOARD_STATUSES = [
  "OPEN", "IN_PROGRESS", "DELEGATED", "WAITING", "DONE", "PARKED", "BLOCKED",
] as const;
export type WarboardStatus = (typeof WARBOARD_STATUSES)[number];

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const STATUS_CFG: Record<WarboardStatus, StatusConfig> = {
  IN_PROGRESS: { label: "IN PROGRESS", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)" },
  DELEGATED:   { label: "DELEGATED",   color: "#22d3ee", bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.25)" },
  OPEN:        { label: "OPEN",        color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.25)" },
  WAITING:     { label: "WAITING",     color: "#f472b6", bg: "rgba(244,114,182,0.10)", border: "rgba(244,114,182,0.25)" },
  DONE:        { label: "DONE",        color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.25)" },
  PARKED:      { label: "PARKED",      color: "#9ca3af", bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.2)" },
  BLOCKED:     { label: "BLOCKED",     color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
};

export const CLICKUP_TO_WARBOARD: Record<string, WarboardStatus> = {
  "new request":     "OPEN",
  "planning":        "OPEN",
  "in progress":     "IN_PROGRESS",
  "internal review": "IN_PROGRESS",
  "sent to client":  "WAITING",
  "revision":        "IN_PROGRESS",
  "done":            "DONE",
};

export const WARBOARD_TO_CLICKUP: Record<WarboardStatus, string> = {
  OPEN:        "New Request",
  IN_PROGRESS: "In Progress",
  WAITING:     "Sent to Client",
  DELEGATED:   "In Progress",
  DONE:        "Done",
  PARKED:      "Planning",
  BLOCKED:     "In Progress",
};

export const WARBOARD_TO_CLIENT_BOARD: Record<WarboardStatus, string> = {
  OPEN:        "Received",
  IN_PROGRESS: "In Progress",
  WAITING:     "Awaiting Your Review",
  DELEGATED:   "In Progress",
  DONE:        "Complete",
  PARKED:      "In Progress",
  BLOCKED:     "In Progress",
};

// AI model configuration — single source of truth
export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const CLAUDE_MAX_TOKENS = 8096;

export const CLIENTS = [
  "noouri", "iraye", "praxis", "formetta", "hsg", "pureclinic",
  "drnoel", "drliv", "browtech", "yuuth", "sevensprings", "tcmd",
] as const;
export type ClientId = (typeof CLIENTS)[number];
