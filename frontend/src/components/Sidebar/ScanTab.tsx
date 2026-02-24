import React, { useState } from "react";
import { SANS, MONO, T } from "../../constants";
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

  React.useEffect(() => {
    if (scanHistory.length > 0 && activeScan === null) setActiveScan(0);
  }, [scanHistory.length, activeScan]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Scan history strip */}
      {scanHistory.length > 0 && (
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.borderSub}`, padding: "8px 12px", display: "flex", gap: 5, overflowX: "auto", background: T.input }}>
          {scanHistory.map((s, i) => {
            const dt = s.ts;
            const isToday = dt.toDateString() === new Date().toDateString();
            const grade = s.result?.health?.grade || "?";
            const gradeColor = grade === "A" || grade === "B" ? "#5bbf8e" : grade === "C" ? "#d4a35c" : "#d45c5c";
            return (
              <button key={i} onClick={() => setActiveScan(i)}
                style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontFamily: MONO, fontSize: 10, background: activeScan === i ? "rgba(138,191,92,0.1)" : T.surface, border: `1px solid ${activeScan === i ? "rgba(138,191,92,0.3)" : T.borderSub}`, color: activeScan === i ? "#8abf5c" : T.textSec, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ color: gradeColor, fontWeight: 700, fontSize: 13 }}>{grade}</span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>{isToday ? dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </button>
            );
          })}
        </div>
      )}

      {!scanResult && !scanning && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <div style={{ fontSize: 28, opacity: 0.1, color: T.text }}>{"\u2295"}</div>
          <div style={{ fontSize: 13, fontFamily: SANS, color: T.textSec, textAlign: "center", lineHeight: 1.8, letterSpacing: 1 }}>FIELD INTELLIGENCE<br />OFFLINE</div>
          <button onClick={runScan} style={{ marginTop: 10, padding: "10px 22px", background: "rgba(138,191,92,0.07)", border: "1px solid rgba(138,191,92,0.25)", color: "#8abf5c", cursor: "pointer", fontSize: 12, borderRadius: 6, fontFamily: SANS, fontWeight: 600, letterSpacing: 1 }}>{"\u2295"} RUN SCAN</button>
        </div>
      )}

      {scanning && !scanResult && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
          <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 600, color: "#8abf5c", letterSpacing: 2, animation: "blink 0.7s infinite" }}>SCANNING FIELD...</div>
          <div style={{ fontSize: 12, color: T.textSec, fontFamily: SANS, textAlign: "center", lineHeight: 2 }}>Reading all domains<br />Analyzing clients<br />Assessing team load<br />Flagging risks</div>
        </div>
      )}

      {scanResult && (
        <>
          {/* Health bar */}
          <div style={{ flexShrink: 0, padding: "12px 14px", borderBottom: `1px solid ${T.borderSub}`, background: T.input }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 22, fontFamily: MONO, fontWeight: 700, color: scanResult.health.score >= 80 ? "#5bbf8e" : scanResult.health.score >= 60 ? "#d4a35c" : "#d45c5c", lineHeight: 1 }}>{scanResult.health.grade}</div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: SANS, fontWeight: 600, color: T.textSec, letterSpacing: 1 }}>FIELD HEALTH</div>
                  <div style={{ fontSize: 13, fontFamily: SANS, color: T.text, lineHeight: 1.4, marginTop: 2, opacity: 0.8 }}>{scanResult.health.summary}</div>
                </div>
              </div>
              <button onClick={runScan} disabled={scanning} title="Re-scan" style={{ background: "none", border: "1px solid rgba(138,191,92,0.2)", color: "rgba(138,191,92,0.5)", cursor: "pointer", fontSize: 12, padding: "5px 10px", borderRadius: 6, fontFamily: SANS }}>{"\u21BB"}</button>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: T.borderSub, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${scanResult.health.score}%`, borderRadius: 2, background: scanResult.health.score >= 80 ? "#5bbf8e" : scanResult.health.score >= 60 ? "#d4a35c" : "#d45c5c", transition: "width 1s ease" }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 0 6px" }}>
            {/* NOW block */}
            {scanResult.now?.length > 0 && (
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.borderSub}` }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: "#8abf5c", fontFamily: SANS, fontWeight: 600, marginBottom: 8 }}>{"\u25B6"} ACT NOW</div>
                {scanResult.now.map((n, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: "10px 12px", background: "rgba(138,191,92,0.05)", border: "1px solid rgba(138,191,92,0.12)", borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 600, color: T.text, marginBottom: 3, opacity: 0.9 }}>{n.title}</div>
                    <div style={{ fontSize: 12, fontFamily: SANS, color: T.textSec, lineHeight: 1.5 }}>{n.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Flags */}
            {scanResult.flags?.length > 0 && (
              <div style={{ padding: "12px 14px 6px" }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, fontFamily: SANS, fontWeight: 600, marginBottom: 8 }}>{scanResult.flags.length} FLAGS</div>
                {scanResult.flags.map((f, i) => {
                  const SEV: Record<string, { color: string; bg: string; border: string }> = { RED: { color: "#d47272", bg: "rgba(212,114,114,0.06)", border: "rgba(212,114,114,0.18)" }, AMBER: { color: "#d4a35c", bg: "rgba(212,163,92,0.05)", border: "rgba(212,163,92,0.15)" }, INFO: { color: T.accent, bg: `${T.accent}08`, border: `${T.accent}20` } };
                  const s = SEV[f.severity] || SEV.INFO;
                  const CAT_ICON: Record<string, string> = { OPS: "\u2699", PM: "\u25CE", CLIENT: "\u25C8", CAPACITY: "\u25C9", RISK: "\u25C6" };
                  return (
                    <div key={i} style={{ marginBottom: 6, padding: "10px 12px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: s.color }}>{CAT_ICON[f.category] || "\u00B7"}</span>
                        <span style={{ fontSize: 10, fontFamily: SANS, fontWeight: 600, color: s.color, letterSpacing: 0.5 }}>{f.category}</span>
                        <span style={{ fontSize: 10, fontFamily: SANS, color: T.textSec, marginLeft: "auto" }}>{f.severity}</span>
                      </div>
                      <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.4, opacity: 0.9 }}>{f.title}</div>
                      <div style={{ fontSize: 12, fontFamily: SANS, color: T.textSec, lineHeight: 1.5, marginBottom: 6 }}>{f.detail}</div>
                      <div style={{ fontSize: 12, fontFamily: SANS, color: s.color, borderTop: `1px solid ${s.border}`, paddingTop: 6, lineHeight: 1.4 }}>{"\u2192"} {f.action}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Thread */}
            {scanThread.length > 0 && (
              <div style={{ padding: "8px 14px", borderTop: `1px solid ${T.borderSub}` }}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, fontFamily: SANS, fontWeight: 600, marginBottom: 8 }}>DISCUSSION</div>
                {scanThread.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 8, fontSize: 13, fontFamily: SANS, lineHeight: 1.6, color: msg.role === "user" ? T.text : T.textSec, borderLeft: `2px solid ${msg.role === "user" ? T.accent : "rgba(138,191,92,0.3)"}`, paddingLeft: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: msg.role === "user" ? T.accent : "#8abf5c", marginBottom: 3, opacity: 0.7 }}>{msg.role === "user" ? "YOU" : "FIELD INTEL"}</div>
                    {msg.text}
                  </div>
                ))}
                {scanning && <div style={{ fontSize: 13, color: "#8abf5c", borderLeft: "2px solid rgba(138,191,92,0.3)", paddingLeft: 10, animation: "blink 0.7s infinite" }}>thinking...</div>}
              </div>
            )}
          </div>

          {/* Reply input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.borderSub}`, flexShrink: 0, background: T.surface }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReply()} placeholder="ask about any flag..."
                style={{ flex: 1, background: T.input, border: `1px solid ${T.borderSub}`, color: T.text, padding: "10px 12px", fontSize: 13, fontFamily: SANS, borderRadius: 6 }}
                onFocus={e => e.target.style.borderColor = "rgba(138,191,92,0.35)"}
                onBlur={e => e.target.style.borderColor = T.borderSub} />
              <button onClick={handleReply} disabled={scanning} style={{ padding: "10px 14px", background: "rgba(138,191,92,0.08)", border: "1px solid rgba(138,191,92,0.2)", color: "#8abf5c", cursor: "pointer", fontSize: 13, borderRadius: 6, flexShrink: 0, fontFamily: SANS, fontWeight: 600 }}>{"\u25B6"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
