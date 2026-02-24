import React, { useState, useEffect } from "react";
import { SANS, MONO, T } from "../../constants";
import type { LogEntry } from "../../types";

interface LogTabProps {
  actLog: LogEntry[];
}

const ACTION_COLOR: Record<string, string> = { CREATE: "#5bbf8e", UPDATE: "#a855f7", DELETE: "#d47272", CLIENT: "#5cb8bf", CMD: "#9a82cc" };

export default function LogTab({ actLog }: LogTabProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Date context bar */}
      <div style={{ background: T.input, border: `1px solid ${T.borderSub}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: T.textSec, fontFamily: MONO, marginBottom: 4 }}>SESSION DATE</div>
        <div style={{ fontSize: 14, fontFamily: MONO, color: T.text, fontWeight: 500, opacity: 0.8 }}>{now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
        <div style={{ fontSize: 13, fontFamily: MONO, color: T.accent, marginTop: 3 }}>{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
      </div>
      {/* Log header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingLeft: 2 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, fontFamily: SANS, fontWeight: 600 }}>{actLog.length} ENTRIES</div>
      </div>
      {actLog.length === 0 && <div style={{ fontSize: 13, color: T.textSec, textAlign: "center", padding: "24px 0", fontFamily: SANS }}>No activity yet</div>}
      {actLog.map((e, i) => {
        const dt = e.ts;
        const ac = ACTION_COLOR[e.action] || T.accent;
        const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const isToday = dt.toDateString() === now.toDateString();
        return (
          <div key={i} style={{ borderBottom: `1px solid ${T.borderSub}`, padding: "8px 6px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ac, marginBottom: 2 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontFamily: SANS, color: T.text, lineHeight: 1.5, wordBreak: "break-word", opacity: 0.85 }}>{e.detail}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontFamily: MONO, color: ac, letterSpacing: 0.5 }}>{e.action}</span>
                {e.taskId && <span style={{ fontSize: 10, fontFamily: MONO, color: T.textSec }}>#{e.taskId}</span>}
                <span style={{ fontSize: 10, fontFamily: MONO, color: T.textSec, marginLeft: "auto" }}>{isToday ? timeStr : `${dateStr} ${timeStr}`}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
