import React, { useState } from "react";
import { SANS } from "../../constants";
import type { Scan, ScanResult } from "../../types";

interface ScanTabProps {
  scanHistory: Scan[];
  scanning: boolean;
  runScan: () => void;
  replyScan: (scanId: string, message: string) => void;
}

export default function ScanTab({ scanHistory, scanning, runScan, replyScan }: ScanTabProps) {
  const [activeScan, setActiveScan] = useState<number | null>(scanHistory.length > 0 ? 0 : null);
  const [scanInput, setScanInput] = useState("");

  const scanResult: ScanResult | null = activeScan !== null ? scanHistory[activeScan]?.result : null;
  const scanThread = activeScan !== null ? scanHistory[activeScan]?.thread : [];
  const scanId = activeScan !== null ? scanHistory[activeScan]?.id : null;

  const handleReply = () => {
    if (!scanInput.trim() || !scanId) return;
    replyScan(scanId, scanInput.trim());
    setScanInput("");
  };

  // Update activeScan when new scans come in
  React.useEffect(() => {
    if (scanHistory.length > 0 && activeScan === null) setActiveScan(0);
  }, [scanHistory.length, activeScan]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Scan history strip */}
      {scanHistory.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "5px 8px", display: "flex", gap: 4, overflowX: "auto", background: "rgba(0,0,0,0.15)" }}>
          {scanHistory.map((s, i) => {
            const dt = s.ts;
            const isToday = dt.toDateString() === new Date().toDateString();
            const grade = s.result?.health?.grade || "?";
            const gradeColor = grade === "A" || grade === "B" ? "#34d399" : grade === "C" ? "#f59e0b" : "#ef4444";
            return (
              <button key={i} onClick={() => setActiveScan(i)}
                style={{ flexShrink: 0, padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 8, background: activeScan === i ? "rgba(163,230,53,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${activeScan === i ? "rgba(163,230,53,0.35)" : "rgba(255,255,255,0.06)"}`, color: activeScan === i ? "#a3e635" : "rgba(255,255,255,0.35)", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span style={{ color: gradeColor, fontWeight: 700, fontSize: 10 }}>{grade}</span>
                <span style={{ fontSize: 7, opacity: 0.7 }}>{isToday ? dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </button>
            );
          })}
        </div>
      )}

      {!scanResult && !scanning && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }}>
          <div style={{ fontSize: 24, opacity: 0.15 }}>{"\u2295"}</div>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.8, letterSpacing: 1 }}>FIELD INTELLIGENCE<br />OFFLINE</div>
          <button onClick={runScan} style={{ marginTop: 8, padding: "7px 18px", background: "rgba(163,230,53,0.07)", border: "1px solid rgba(163,230,53,0.3)", color: "#a3e635", cursor: "pointer", fontSize: 9, borderRadius: 3, fontFamily: "inherit", letterSpacing: 1 }}>{"\u2295"} RUN SCAN</button>
        </div>
      )}

      {scanning && !scanResult && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 20 }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "#a3e635", letterSpacing: 2, animation: "blink 0.7s infinite" }}>SCANNING FIELD_</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", textAlign: "center", lineHeight: 2 }}>Reading all domains<br />Analyzing clients<br />Assessing team load<br />Flagging risks</div>
        </div>
      )}

      {scanResult && (
        <>
          {/* Health bar */}
          <div style={{ flexShrink: 0, padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 18, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: scanResult.health.score >= 80 ? "#34d399" : scanResult.health.score >= 60 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>{scanResult.health.grade}</div>
                <div>
                  <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>FIELD HEALTH</div>
                  <div style={{ fontSize: 10, fontFamily: SANS, color: "rgba(255,255,255,0.6)", lineHeight: 1.3, marginTop: 1 }}>{scanResult.health.summary}</div>
                </div>
              </div>
              <button onClick={runScan} disabled={scanning} title="Re-scan" style={{ background: "none", border: "1px solid rgba(163,230,53,0.2)", color: "rgba(163,230,53,0.5)", cursor: "pointer", fontSize: 9, padding: "3px 8px", borderRadius: 3, fontFamily: "inherit" }}>{"\u21BB"}</button>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${scanResult.health.score}%`, borderRadius: 2, background: scanResult.health.score >= 80 ? "#34d399" : scanResult.health.score >= 60 ? "#f59e0b" : "#ef4444", transition: "width 1s ease" }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 0 4px" }}>
            {/* NOW block */}
            {scanResult.now?.length > 0 && (
              <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "#a3e635", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>{"\u25B6"} ACT NOW</div>
                {scanResult.now.map((n, i) => (
                  <div key={i} style={{ marginBottom: 6, padding: "6px 8px", background: "rgba(163,230,53,0.04)", border: "1px solid rgba(163,230,53,0.12)", borderRadius: 3 }}>
                    <div style={{ fontSize: 10, fontFamily: SANS, fontWeight: 600, color: "rgba(228,228,231,0.9)", marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 9, fontFamily: SANS, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{n.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Flags */}
            {scanResult.flags?.length > 0 && (
              <div style={{ padding: "8px 10px 4px" }}>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>{scanResult.flags.length} FLAGS</div>
                {scanResult.flags.map((f, i) => {
                  const SEV: Record<string, { color: string; bg: string; border: string }> = { RED: { color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)" }, AMBER: { color: "#fbbf24", bg: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.18)" }, INFO: { color: "#7B68EE", bg: "rgba(123,104,238,0.05)", border: "rgba(123,104,238,0.15)" } };
                  const s = SEV[f.severity] || SEV.INFO;
                  const CAT_ICON: Record<string, string> = { OPS: "\u2699", PM: "\u25CE", CLIENT: "\u25C8", CAPACITY: "\u25C9", RISK: "\u25C6" };
                  return (
                    <div key={i} style={{ marginBottom: 5, padding: "7px 8px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                        <span style={{ fontSize: 8, color: s.color }}>{CAT_ICON[f.category] || "\u00B7"}</span>
                        <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: s.color, letterSpacing: 1 }}>{f.category}</span>
                        <span style={{ fontSize: 7, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.15)", marginLeft: "auto" }}>{f.severity}</span>
                      </div>
                      <div style={{ fontSize: 10, fontFamily: SANS, fontWeight: 600, color: "rgba(228,228,231,0.88)", marginBottom: 3, lineHeight: 1.3 }}>{f.title}</div>
                      <div style={{ fontSize: 9, fontFamily: SANS, color: "rgba(255,255,255,0.4)", lineHeight: 1.4, marginBottom: 4 }}>{f.detail}</div>
                      <div style={{ fontSize: 9, fontFamily: SANS, color: s.color, borderTop: `1px solid ${s.border}`, paddingTop: 4, lineHeight: 1.3 }}>{"\u2192"} {f.action}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Thread */}
            {scanThread.length > 0 && (
              <div style={{ padding: "6px 10px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>DISCUSSION</div>
                {scanThread.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 6, fontSize: 10, fontFamily: SANS, lineHeight: 1.6, color: msg.role === "user" ? "#c8d8e8" : "#5a9abb", borderLeft: `2px solid ${msg.role === "user" ? "rgba(123,104,238,0.55)" : "rgba(163,230,53,0.2)"}`, paddingLeft: 7 }}>
                    <div style={{ fontSize: 6, letterSpacing: 1, color: msg.role === "user" ? "rgba(123,104,238,0.6)" : "rgba(163,230,53,0.5)", marginBottom: 2 }}>{msg.role === "user" ? "TUAN" : "FIELD INTEL"}</div>
                    {msg.text}
                  </div>
                ))}
                {scanning && <div style={{ fontSize: 9, color: "#a3e635", borderLeft: "2px solid rgba(163,230,53,0.2)", paddingLeft: 7, animation: "blink 0.7s infinite" }}>thinking_</div>}
              </div>
            )}
          </div>

          {/* Reply input */}
          <div style={{ padding: "7px 8px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <input value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReply()} placeholder="ask about any flag..."
                style={{ flex: 1, background: "rgba(163,230,53,0.03)", border: "1px solid rgba(163,230,53,0.12)", color: "#c8d8e8", padding: "6px 9px", fontSize: 10, fontFamily: SANS, borderRadius: 3, outline: "none" }}
                onFocus={e => e.target.style.borderColor = "rgba(163,230,53,0.3)"}
                onBlur={e => e.target.style.borderColor = "rgba(163,230,53,0.12)"} />
              <button onClick={handleReply} disabled={scanning} style={{ padding: "6px 10px", background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.2)", color: "#a3e635", cursor: "pointer", fontSize: 11, borderRadius: 3, flexShrink: 0 }}>{"\u25B6"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
