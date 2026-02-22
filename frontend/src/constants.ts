// Re-export from shared constants for frontend use
// All values are identical to the prototype — do not modify

export const DISCIPLINES = ["Design", "Development", "Marketing", "Ops", "Content"] as const;

export const DISC_COLOR: Record<string, string> = {
  Design: "#f472b6", Development: "#34d399", Marketing: "#f97316",
  Ops: "#7B68EE", Content: "#a78bfa",
};

export const PRIORITIES = ["FOCUS", "CRITICAL", "HIGH", "NORMAL"] as const;

export const PRI_COLOR: Record<string, string> = {
  FOCUS: "#a3e635", CRITICAL: "#ef4444", HIGH: "#f59e0b", NORMAL: "#60a5fa",
};

export const THREAT_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f59e0b", NORMAL: "#34d399", IN_PROGRESS: "#7B68EE",
};

export const THREAT_SHADOW: Record<string, string> = {
  CRITICAL:    "0 0 0 1px rgba(239,68,68,0.7),   0 0 24px rgba(239,68,68,0.3)",
  HIGH:        "0 0 0 1px rgba(245,158,11,0.5),  0 0 14px rgba(245,158,11,0.18)",
  NORMAL:      "0 0 0 1px rgba(52,211,153,0.4)",
  IN_PROGRESS: "0 0 0 1px rgba(123,104,238,0.55),0 0 14px rgba(123,104,238,0.18)",
};

export const STATUSES = ["OPEN", "IN_PROGRESS", "DELEGATED", "WAITING", "DONE", "PARKED", "BLOCKED"] as const;

export const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  IN_PROGRESS: { label: "IN PROGRESS", color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.25)" },
  DELEGATED:   { label: "DELEGATED",   color: "#22d3ee", bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.25)" },
  OPEN:        { label: "OPEN",        color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.25)" },
  WAITING:     { label: "WAITING",     color: "#f472b6", bg: "rgba(244,114,182,0.10)", border: "rgba(244,114,182,0.25)" },
  DONE:        { label: "DONE",        color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.25)" },
  PARKED:      { label: "PARKED",      color: "#9ca3af", bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.2)" },
  BLOCKED:     { label: "BLOCKED",     color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
};

export const BOARD_GT = "16px 72px 130px 1fr 100px 120px 90px 64px 28px";
export const SANS = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
