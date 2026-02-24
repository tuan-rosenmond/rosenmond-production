import React from "react";
import { DISCIPLINES, DISC_COLOR, THREAT_COLOR, T, SANS } from "../../constants";
import type { Task, Client, Domain, TeamMember } from "../../types";

interface IntelTabProps {
  domains: Domain[];
  clients: Client[];
  team: TeamMember[];
  getT: (id: string) => Task[];
  discFilter: string | null;
  setDiscFilter: (d: string | null) => void;
  openDrawer: (id: string, label: string, color: string) => void;
  setShowAdd: (v: boolean) => void;
}

export default function IntelTab({ domains, clients, team, getT, discFilter, setDiscFilter, openDrawer, setShowAdd }: IntelTabProps) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, marginBottom: 8, paddingLeft: 2, fontFamily: SANS, fontWeight: 600 }}>DOMAINS</div>
      {domains.map(dom => {
        const pts = getT(dom.id), critC = pts.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        return (
          <div key={dom.id} className="ir" onClick={() => openDrawer(dom.id, dom.label, dom.color)}
            style={{ marginBottom: 3, padding: "8px 10px", border: `1px solid ${T.borderSub}`, display: "flex", alignItems: "center", gap: 8, borderRadius: 6 }}>
            <div style={{ width: 6, height: 6, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", background: dom.color, flexShrink: 0 }} />
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: 0.5, color: dom.color, flex: 1 }}>{dom.label}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {critC > 0 && <span style={{ fontSize: 10, color: "#d45c5c" }}>{"\u25C6"}{critC}</span>}
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: dom.color, opacity: 0.8 }}>{pts.length}</span>
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, margin: "14px 0 8px", paddingLeft: 2, fontFamily: SANS, fontWeight: 600 }}>CLIENTS</div>
      {clients.map(cl => {
        const pts = getT(cl.id), tc = THREAT_COLOR[cl.threat], critC = pts.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        const lead = team.find(m => m.id === cl.lead), spec = team.find(m => m.id === cl.lead2);
        return (
          <div key={cl.id} className="ir" onClick={() => openDrawer(cl.id, cl.label, tc)}
            style={{ marginBottom: 3, padding: "8px 10px", border: `1px solid ${tc}15`, display: "flex", alignItems: "center", gap: 8, borderRadius: 6 }}>
            <div style={{ width: 6, height: 6, background: tc, transform: "rotate(45deg)", borderRadius: 1, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: 0.5, color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.label.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 3, marginTop: 2, alignItems: "center" }}>
                {cl.disciplines.map(d => <span key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: DISC_COLOR[d], display: "inline-block" }} />)}
                {lead && <span style={{ fontSize: 9, color: lead.color, marginLeft: 4, opacity: 0.8 }}>{lead.avatar}</span>}
                {spec && <span style={{ fontSize: 9, color: spec.color, opacity: 0.7 }}>{spec.avatar}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: tc, lineHeight: 1 }}>{pts.length}</div>
              {critC > 0 && <div style={{ fontSize: 9, color: "#d45c5c" }}>{"\u25C6"}{critC}</div>}
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAdd(true)} style={{ width: "100%", marginTop: 10, padding: "8px", background: `${T.accent}08`, border: `1px dashed ${T.accent}30`, color: `${T.accent}aa`, cursor: "pointer", fontSize: 11, borderRadius: 6, fontFamily: SANS, fontWeight: 600, letterSpacing: 1 }}>+ NEW CLIENT</button>

      <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, margin: "16px 0 8px", paddingLeft: 2, fontFamily: SANS, fontWeight: 600 }}>DISCIPLINES</div>
      {DISCIPLINES.map(d => {
        const count = clients.filter(c => c.disciplines.includes(d)).length;
        return (
          <div key={d} onClick={() => setDiscFilter(discFilter === d ? null : d)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", marginBottom: 2, borderRadius: 6, cursor: "pointer", background: discFilter === d ? `${DISC_COLOR[d]}12` : "transparent", border: `1px solid ${discFilter === d ? DISC_COLOR[d] + "35" : "transparent"}` }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: DISC_COLOR[d] }} />
            <div style={{ fontSize: 13, fontFamily: SANS, color: DISC_COLOR[d], flex: 1 }}>{d}</div>
            <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 500, color: DISC_COLOR[d], opacity: 0.7 }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}
