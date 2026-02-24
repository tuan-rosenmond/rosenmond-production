import React, { useState, useEffect } from "react";
import { T, SANS, MONO } from "../constants";

interface TopbarProps {
  critCount: number;
  focusCount: number;
  openCount: number;
  doneCount: number;
  view: string;
  setView: (v: string) => void;
  scanning: boolean;
  runScan: () => void;
}

export default function Topbar({ critCount, focusCount, openCount, doneCount, view, setView, scanning, runScan }: TopbarProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {/* LEFT: logo + stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 11, letterSpacing: 4, color: T.textSec, fontWeight: 500 }}>COMMAND CENTER</div>
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 800, letterSpacing: 1, color: T.text, lineHeight: 1 }}>ROSENMOND</div>
        </div>
        <div style={{ width: 1, height: 36, background: T.border }} />
        {[
          { l: "CRITICAL", v: critCount, c: "#d45c5c" },
          { l: "FOCUS", v: focusCount, c: "#8abf5c" },
          { l: "OPEN", v: openCount, c: "#5c8fd4" },
          { l: "DONE", v: doneCount, c: "#5bbf8e" },
        ].map(s => (
          <div key={s.l} style={{ textAlign: "center", minWidth: 40 }}>
            <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 9, letterSpacing: 1, color: T.textSec, fontFamily: SANS, fontWeight: 500 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* RIGHT: clock + view toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: T.textSec, letterSpacing: 1 }}>
            {now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
          </div>
          <div style={{ fontSize: 16, fontFamily: MONO, fontWeight: 500, color: T.text, letterSpacing: 2, lineHeight: 1, opacity: 0.8 }}>
            {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
        <div style={{ width: 1, height: 36, background: T.border }} />
        <button onClick={runScan} disabled={scanning} style={{
          padding: "8px 18px", fontSize: 10, letterSpacing: 1, fontFamily: SANS, fontWeight: 600,
          background: scanning ? "rgba(138,191,92,0.08)" : "rgba(138,191,92,0.06)",
          border: "1px solid rgba(138,191,92,0.25)", color: scanning ? "rgba(138,191,92,0.5)" : "#8abf5c",
          cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", gap: 5,
        }}>
          {scanning ? <span style={{ animation: "blink 0.7s infinite" }}>SCANNING...</span> : "\u2295 SCAN FIELD"}
        </button>
        <div style={{ display: "flex", gap: 4, background: T.input, padding: 4, borderRadius: 8, border: `1px solid ${T.borderSub}` }}>
          {([["map", "\u2B21 MAP"], ["board", "\u2261 BOARD"], ["personal", "\u2726 PERSONAL"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 18px", fontSize: 11, letterSpacing: 0.5, fontFamily: SANS, fontWeight: 600,
              background: view === v ? `${T.accent}20` : "transparent",
              border: `1px solid ${view === v ? `${T.accent}55` : "transparent"}`,
              color: view === v ? T.accent : T.textSec, cursor: "pointer", borderRadius: 6,
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
