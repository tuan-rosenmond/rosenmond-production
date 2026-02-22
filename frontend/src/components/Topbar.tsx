import React, { useState, useEffect } from "react";

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
    <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(123,104,238,0.12)", background: "#111318", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {/* LEFT: logo + stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: 6, color: "rgba(123,104,238,0.55)" }}>COMMAND CENTER</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#e4e4e7", lineHeight: 1 }}>ROSENMOND</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(123,104,238,0.12)" }} />
        {[
          { l: "CRITICAL", v: critCount, c: "#ff3333" },
          { l: "FOCUS", v: focusCount, c: "#a3e635" },
          { l: "OPEN", v: openCount, c: "#7ed321" },
          { l: "DONE", v: doneCount, c: "#4a9f4a" },
        ].map(s => (
          <div key={s.l} style={{ textAlign: "center", minWidth: 36 }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 7, letterSpacing: 1, color: "#6aaccc" }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* RIGHT: clock + view toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
            {now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
          </div>
          <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: 2, lineHeight: 1 }}>
            {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(123,104,238,0.12)" }} />
        <button onClick={runScan} disabled={scanning} style={{
          padding: "5px 14px", fontSize: 8, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace",
          background: scanning ? "rgba(163,230,53,0.08)" : "rgba(163,230,53,0.06)",
          border: "1px solid rgba(163,230,53,0.3)", color: scanning ? "rgba(163,230,53,0.5)" : "#a3e635",
          cursor: "pointer", borderRadius: 3, display: "flex", alignItems: "center", gap: 5,
        }}>
          {scanning ? <span style={{ animation: "blink 0.7s infinite" }}>SCANNING_</span> : "\u2295 SCAN FIELD"}
        </button>
        <div style={{ display: "flex", gap: 3, background: "rgba(0,0,0,0.4)", padding: 3, borderRadius: 4, border: "1px solid rgba(123,104,238,0.09)" }}>
          {([["map", "\u2B21 MAP"], ["board", "\u2261 BOARD"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 16px", fontSize: 8, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace",
              background: view === v ? "rgba(123,104,238,0.15)" : "transparent",
              border: `1px solid ${view === v ? "rgba(123,104,238,0.4)" : "transparent"}`,
              color: view === v ? "#7B68EE" : "#6a9aaa", cursor: "pointer", borderRadius: 3,
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
