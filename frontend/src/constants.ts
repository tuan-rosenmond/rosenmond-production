// ROSENMOND — Frontend Design System Constants
// Color palette aligned with Claude interface aesthetics

// ─── Theme Tokens ────────────────────────────────────────────────────────
export const T = {
  bg:       "#1a1a1a",
  surface:  "#222222",
  input:    "#2f2f2f",
  userBub:  "#000000",
  text:     "#ececec",
  textSec:  "#8a8a8a",
  accent:   "#a855f7",
  accent2:  "#6366f1",
  border:   "rgba(168,85,247,0.12)",
  borderSub:"rgba(168,85,247,0.07)",
  hover:    "rgba(168,85,247,0.08)",
  cmdAccent:"#da7756",
} as const;

// ─── Fonts ───────────────────────────────────────────────────────────────
export const SANS = "'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
export const MONO = "'JetBrains Mono','Courier New',monospace";
export const SERIF = "'Source Serif 4','Georgia',serif";

// ─── Disciplines ─────────────────────────────────────────────────────────
export const DISCIPLINES = ["Design", "Development", "Marketing", "Ops", "Content"] as const;

export const DISC_COLOR: Record<string, string> = {
  Design: "#d4789c", Development: "#5bbf8e", Marketing: "#d48a5c",
  Ops: "#9381d6", Content: "#9a82cc",
};

// ─── Priorities ──────────────────────────────────────────────────────────
export const PRIORITIES = ["FOCUS", "CRITICAL", "HIGH", "NORMAL"] as const;

export const PRI_COLOR: Record<string, string> = {
  FOCUS: "#8abf5c", CRITICAL: "#d45c5c", HIGH: "#d4a35c", NORMAL: "#5c8fd4",
};

// ─── Threat Levels ───────────────────────────────────────────────────────
export const THREAT_COLOR: Record<string, string> = {
  CRITICAL: "#d45c5c", HIGH: "#d4a35c", NORMAL: "#5bbf8e", IN_PROGRESS: "#9381d6",
};

export const THREAT_SHADOW: Record<string, string> = {
  CRITICAL:    "0 0 0 1px rgba(212,92,92,0.5),  0 0 18px rgba(212,92,92,0.15)",
  HIGH:        "0 0 0 1px rgba(212,163,92,0.4),  0 0 12px rgba(212,163,92,0.1)",
  NORMAL:      "0 0 0 1px rgba(91,191,142,0.3)",
  IN_PROGRESS: "0 0 0 1px rgba(147,129,214,0.4), 0 0 12px rgba(147,129,214,0.1)",
};

// ─── Statuses ────────────────────────────────────────────────────────────
export const STATUSES = ["OPEN", "IN_PROGRESS", "DELEGATED", "WAITING", "DONE", "PARKED", "BLOCKED"] as const;

export const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  IN_PROGRESS: { label: "IN PROGRESS", color: "#d4a35c", bg: "rgba(212,163,92,0.10)",  border: "rgba(212,163,92,0.22)" },
  DELEGATED:   { label: "DELEGATED",   color: "#5cb8bf", bg: "rgba(92,184,191,0.10)",  border: "rgba(92,184,191,0.22)" },
  OPEN:        { label: "OPEN",        color: "#5c8fd4", bg: "rgba(92,143,212,0.10)",  border: "rgba(92,143,212,0.22)" },
  WAITING:     { label: "WAITING",     color: "#d4789c", bg: "rgba(212,120,156,0.10)", border: "rgba(212,120,156,0.22)" },
  DONE:        { label: "DONE",        color: "#5bbf8e", bg: "rgba(91,191,142,0.10)",  border: "rgba(91,191,142,0.22)" },
  PARKED:      { label: "PARKED",      color: "#8a8a8a", bg: "rgba(138,138,138,0.10)", border: "rgba(138,138,138,0.18)" },
  BLOCKED:     { label: "BLOCKED",     color: "#d47272", bg: "rgba(212,114,114,0.10)", border: "rgba(212,114,114,0.22)" },
};

// ─── Layout ──────────────────────────────────────────────────────────────
export const BOARD_GT = "16px 72px 130px 1fr 100px 120px 90px 64px 28px";
export const PERSONAL_GT = "16px 1fr 120px 90px 100px 64px 28px";
