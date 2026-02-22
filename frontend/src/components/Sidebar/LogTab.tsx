import React, { useState, useEffect } from "react";
import { SANS } from "../../constants";
import type { LogEntry } from "../../types";

interface LogTabProps {
  actLog: LogEntry[];
}

const ACTION_COLOR: Record<string, string> = { CREATE: "#34d399", UPDATE: "#7B68EE", DELETE: "#f87171", CLIENT: "#22d3ee", CMD: "#a78bfa" };

export default function LogTab({ actLog }: LogTabProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Date context bar */}
      <div style={{ background: "rgba(123,104,238,0.06)", border: "1px solid rgba(123,104,238,0.12)", borderRadius: 3, padding: "6px 8px", marginBottom: 8 }}>
        <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>SESSION DATE</div>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "#7B68EE", marginTop: 2 }}>{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
      </div>
      {/* Log header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingLeft: 2 }}>
        <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>{actLog.length} ENTRIES</div>
      </div>
      {actLog.length === 0 && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "20px 0", fontFamily: "'JetBrains Mono',monospace" }}>No activity yet</div>}
      {actLog.map((e, i) => {
        const dt = e.ts;
        const ac = ACTION_COLOR[e.action] || "#7B68EE";
        const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const isToday = dt.toDateString() === now.toDateString();
        return (
          <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "6px 4px", display: "flex", gap: 7, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, paddingTop: 1 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ac, marginBottom: 2 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontFamily: SANS, color: "rgba(228,228,231,0.8)", lineHeight: 1.4, wordBreak: "break-word" }}>{e.detail}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: ac, letterSpacing: 0.5 }}>{e.action}</span>
                {e.taskId && <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.2)" }}>#{e.taskId}</span>}
                <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{isToday ? timeStr : `${dateStr} ${timeStr}`}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
