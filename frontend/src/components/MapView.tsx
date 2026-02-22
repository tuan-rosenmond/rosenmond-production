import React, { useRef, useCallback, useState } from "react";
import { DISCIPLINES, DISC_COLOR, PRI_COLOR, THREAT_COLOR, THREAT_SHADOW } from "../constants";
import type { Task, Client, Domain, TeamMember } from "../types";

interface MapViewProps {
  clients: Client[];
  team: TeamMember[];
  domains: Domain[];
  getT: (id: string) => Task[];
  allFlat: Task[];
  mapMode: string;
  setMapMode: (m: string) => void;
  discFilter: string | null;
  setDiscFilter: (d: string | null) => void;
  openDrawer: (id: string, label: string, color: string, isSynthetic?: boolean, syntheticTasks?: Task[] | null) => void;
  setShowAdd: (v: boolean) => void;
  onUpdateClientPos: (cid: string, x: number, y: number) => void;
}

export default function MapView({ clients, team, domains, getT, allFlat, mapMode, setMapMode, discFilter, setDiscFilter, openDrawer, setShowAdd, onUpdateClientPos }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const nodeDrag = useRef<string | null>(null);
  const panDrag = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const onNodeDown = (e: React.MouseEvent, id: string) => { e.preventDefault(); e.stopPropagation(); nodeDrag.current = id; };
  const onMapDown = useCallback((e: React.MouseEvent) => { if (nodeDrag.current) return; panDrag.current = true; panStart.current = { x: e.clientX, y: e.clientY }; }, []);
  const onMapMove = useCallback((e: React.MouseEvent) => {
    if (nodeDrag.current && mapRef.current) {
      const r = mapRef.current.getBoundingClientRect();
      const x = Math.max(2, Math.min(98, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.max(2, Math.min(68, ((e.clientY - r.top) / r.height) * 100));
      onUpdateClientPos(nodeDrag.current, x, y);
    } else if (panDrag.current) {
      const dx = e.clientX - panStart.current.x, dy = e.clientY - panStart.current.y;
      panStart.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }
  }, [onUpdateClientPos]);
  const onMapUp = useCallback(() => { nodeDrag.current = null; panDrag.current = false; }, []);

  const ns = (x: number, y: number): React.CSSProperties => ({ position: "absolute", left: `calc(${x}% + ${pan.x}px)`, top: `calc(${y}% + ${pan.y}px)`, transform: "translate(-50%,-50%)", zIndex: 3 });

  return (
    <div ref={mapRef} onMouseDown={onMapDown} onMouseMove={onMapMove} onMouseUp={onMapUp} onMouseLeave={onMapUp}
      style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", cursor: "default" }}>
      {/* Grid backgrounds */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(123,104,238,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(123,104,238,0.07) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(123,104,238,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(123,104,238,0.035) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 55% at 50% 35%,rgba(0,20,55,0.25) 0%,transparent 100%)" }} />
      {/* Horizontal rail */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "72%", height: "1px", background: "linear-gradient(90deg,transparent 0%,rgba(123,104,238,0.2) 15%,rgba(123,104,238,0.2) 85%,transparent 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28%", background: "linear-gradient(to top,rgba(0,8,24,0.7) 0%,transparent 100%)", borderTop: "none" }} />
      <div style={{ position: "absolute", left: 14, top: 10, fontSize: 8, letterSpacing: 1, color: "rgba(123,104,238,0.55)", pointerEvents: "none" }}>CLIENT FIELD</div>
      <div style={{ position: "absolute", left: 14, top: "74%", fontSize: 8, letterSpacing: 1, color: "rgba(123,104,238,0.45)", pointerEvents: "none" }}>ROSENMOND BASE</div>
      <div style={{ position: "absolute", left: 0, right: 0, height: "2px", pointerEvents: "none", background: "linear-gradient(90deg,transparent,rgba(123,104,238,0.08),transparent)", animation: "scan 12s linear infinite" }} />

      {/* MODE SWITCHER */}
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 3, zIndex: 10, background: "rgba(13,17,23,0.9)", padding: 3, borderRadius: 4, border: "1px solid rgba(123,104,238,0.12)" }}>
        {([["THREAT", "\u25C8 CLIENT"], ["PRIORITY", "\u25C9 PRIORITY"], ["DISCIPLINE", "\u2B21 DISCIPLINE"]] as const).map(([mode, label]) => (
          <button key={mode} onClick={() => { setMapMode(mode); if (mode !== "DISCIPLINE") setDiscFilter(null); }}
            style={{ padding: "3px 10px", fontSize: 9, letterSpacing: 0, fontFamily: "'Inter',sans-serif", cursor: "pointer", borderRadius: 3, background: mapMode === mode ? "rgba(123,104,238,0.15)" : "transparent", border: `1px solid ${mapMode === mode ? "rgba(123,104,238,0.4)" : "transparent"}`, color: mapMode === mode ? "#7B68EE" : "#6a9aaa", transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>

      {/* DISCIPLINE PILLS */}
      {mapMode === "DISCIPLINE" && (
        <div style={{ position: "absolute", top: 10, right: 12, display: "flex", gap: 4, zIndex: 10 }}>
          {DISCIPLINES.map(d => {
            const on = discFilter === d;
            return <button key={d} onClick={() => setDiscFilter(on ? null : d)}
              style={{ padding: "3px 10px", fontSize: 9, letterSpacing: 0, fontFamily: "'Inter',sans-serif", cursor: "pointer", borderRadius: 3, background: on ? `${DISC_COLOR[d]}22` : "rgba(13,17,23,0.9)", border: `1px solid ${on ? DISC_COLOR[d] : "rgba(123,104,238,0.15)"}`, color: on ? DISC_COLOR[d] : "#6a9aaa", transition: "all 0.15s" }}>{d}</button>;
          })}
        </div>
      )}

      {/* CLIENT NODES */}
      {mapMode === "THREAT" && clients.map(cl => {
        const tc = THREAT_COLOR[cl.threat], pts = getT(cl.id);
        const critPts = pts.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        const lead = team.find(m => m.id === cl.lead), spec = team.find(m => m.id === cl.lead2);
        return (
          <div key={cl.id} className="cn" onMouseDown={e => onNodeDown(e, cl.id)}
            onClick={() => { if (nodeDrag.current) return; openDrawer(cl.id, cl.label, tc); }}
            style={ns(cl.x, cl.y)}>
            <div style={{ width: 50, height: 50, borderRadius: "5px", background: "rgba(3,10,24,0.94)", border: `1px solid ${tc}`, transform: "rotate(45deg)", boxShadow: THREAT_SHADOW[cl.threat], animation: cl.threat === "CRITICAL" ? "critPulse 2.2s ease-in-out infinite" : "none" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: tc, lineHeight: 1 }}>{pts.length}</div>
              <div style={{ fontSize: 6, color: "#6aaabb", letterSpacing: 1 }}>OPS</div>
            </div>
            {critPts > 0 && <div style={{ position: "absolute", top: -6, right: -6, width: 15, height: 15, borderRadius: "50%", background: "#ff3333", color: "#fff", fontSize: 8, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #020912", animation: "blink 1.3s infinite" }}>{critPts}</div>}
            {cl.disciplines.length > 0 && <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>
              {cl.disciplines.map(d => <div key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: DISC_COLOR[d], opacity: 0.5 }} />)}
            </div>}
            <div style={{ position: "absolute", top: "calc(100% + 22px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: 1, color: tc }}>{cl.label.toUpperCase()}</div>
              {(lead || spec) && <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 3 }}>
                {lead && <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: `${lead.color}20`, border: `1px solid ${lead.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, color: lead.color, fontWeight: "bold" }}>{lead.avatar}</div>
                  <span style={{ fontSize: 8, color: lead.color, opacity: 0.8 }}>{lead.name}</span>
                </div>}
                {spec && <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: `${spec.color}20`, border: `1px solid ${spec.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, color: spec.color, fontWeight: "bold" }}>{spec.avatar}</div>
                  <span style={{ fontSize: 8, color: spec.color, opacity: 0.65 }}>{spec.name}</span>
                </div>}
              </div>}
            </div>
          </div>
        );
      })}

      {/* PRIORITY NODES */}
      {mapMode === "PRIORITY" && [
        { id: "CRITICAL", label: "CRITICAL", color: "#ff3333", x: 25, y: 25, shadow: "0 0 0 1px rgba(255,51,51,0.7),0 0 28px rgba(255,51,51,0.35)" },
        { id: "HIGH", label: "HIGH", color: "#ff8c00", x: 50, y: 32, shadow: "0 0 0 1px rgba(255,140,0,0.6),0 0 18px rgba(255,140,0,0.25)" },
        { id: "NORMAL", label: "NORMAL", color: "#7ed321", x: 75, y: 25, shadow: "0 0 0 1px rgba(126,211,33,0.5),0 0 14px rgba(126,211,33,0.18)" },
      ].map(pn => {
        const matched = allFlat.filter(t => t.priority === pn.id && t.status !== "DONE");
        return (
          <div key={pn.id} className="cn" onClick={() => openDrawer("__pri__" + pn.id, pn.label, pn.color, true, matched)} style={ns(pn.x, pn.y)}>
            <div style={{ width: 70, height: 70, borderRadius: "7px", background: "rgba(3,10,24,0.94)", border: `1px solid ${pn.color}`, transform: "rotate(45deg)", boxShadow: pn.shadow, animation: pn.id === "CRITICAL" ? "critPulse 2.2s ease-in-out infinite" : "none" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: pn.color, lineHeight: 1 }}>{matched.length}</div>
              <div style={{ fontSize: 6, color: "#6aaabb", letterSpacing: 1 }}>TASKS</div>
            </div>
            <div style={{ position: "absolute", top: "calc(100% + 22px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: 1, color: pn.color }}>{pn.label}</div>
              <div style={{ fontSize: 7, color: "#5a7a9a", marginTop: 2 }}>{matched.length} active</div>
            </div>
          </div>
        );
      })}

      {/* DISCIPLINE NODES */}
      {mapMode === "DISCIPLINE" && DISCIPLINES.map((d, i) => {
        const dc = DISC_COLOR[d], matched = allFlat.filter(t => (t.disciplines || []).includes(d));
        const active = matched.filter(t => t.status !== "DONE"), x = 12 + i * 19;
        const isDim = discFilter !== null && discFilter !== d;
        return (
          <div key={d} className="cn" onClick={() => openDrawer("__disc__" + d, d, dc, true, matched)}
            style={{ ...ns(x, 30), opacity: isDim ? 0.15 : 1, transition: "opacity 0.25s" }}>
            <div style={{ width: 60, height: 60, borderRadius: "6px", background: "rgba(3,10,24,0.94)", border: `1px solid ${dc}`, transform: "rotate(45deg)", boxShadow: `0 0 0 1px ${dc}55,0 0 18px ${dc}22` }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700, color: dc, lineHeight: 1 }}>{active.length}</div>
              <div style={{ fontSize: 6, color: "#6aaabb", letterSpacing: 1 }}>ACTIVE</div>
            </div>
            <div style={{ position: "absolute", top: "calc(100% + 22px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: 1, color: dc }}>{d.toUpperCase()}</div>
              <div style={{ fontSize: 7, color: "#5a7a9a", marginTop: 2 }}>{matched.length} tasks</div>
            </div>
          </div>
        );
      })}

      {/* DOMAIN HEXAGONS */}
      {domains.map(dom => {
        const pts = getT(dom.id), critC = pts.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        return (
          <div key={dom.id} className="dh" onClick={() => openDrawer(dom.id, dom.label, dom.color)}
            style={{ position: "absolute", left: `${dom.x}%`, top: `${dom.y}%`, transform: "translate(-50%,-50%)", zIndex: 5 }}>
            <div style={{ width: 72, height: 72, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", background: "rgba(3,9,22,0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, boxShadow: `0 0 0 1px ${dom.color}55,0 0 18px ${dom.color}12`, transition: "all 0.2s" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: dom.color, lineHeight: 1 }}>{pts.length}</div>
              <div style={{ fontSize: 6, color: "#7aacbb", letterSpacing: 1 }}>TASKS</div>
            </div>
            {critC > 0 && <div style={{ position: "absolute", top: -3, right: 8, width: 14, height: 14, borderRadius: "50%", background: "#ff3333", color: "#fff", fontSize: 7, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #020912", animation: "blink 1.6s infinite" }}>{critC}</div>}
            <div style={{ position: "absolute", top: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: 0, color: dom.color }}>{dom.label}</div>
              <div style={{ fontSize: 6, color: "#4a7a9a", letterSpacing: 1, marginTop: 1 }}>{dom.sub}</div>
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAdd(true)} style={{ position: "absolute", bottom: 14, right: 14, padding: "5px 13px", background: "rgba(123,104,238,0.06)", border: "1px dashed rgba(123,104,238,0.28)", color: "rgba(123,104,238,0.8)", cursor: "pointer", fontSize: 8, letterSpacing: 2, borderRadius: 3, fontFamily: "inherit", zIndex: 6 }}>+ NEW CLIENT</button>
    </div>
  );
}
