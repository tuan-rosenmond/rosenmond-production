import React from "react";
import { DISCIPLINES, DISC_COLOR, THREAT_COLOR } from "../../constants";
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
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
      <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.25)", marginBottom: 4, paddingLeft: 2, fontFamily: "'Inter',sans-serif", fontWeight: 600, textTransform: "uppercase" }}>DOMAINS</div>
      {domains.map(dom => {
        const pts = getT(dom.id), critC = pts.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        return (
          <div key={dom.id} className="ir" onClick={() => openDrawer(dom.id, dom.label, dom.color)}
            style={{ marginBottom: 2, padding: "4px 7px", border: "1px solid rgba(123,104,238,0.07)", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", background: dom.color, flexShrink: 0 }} />
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 1, color: dom.color, flex: 1 }}>{dom.label}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {critC > 0 && <span style={{ fontSize: 7, color: "#ff4444" }}>{"\u25C6"}{critC}</span>}
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: dom.color, opacity: 0.8 }}>{pts.length}</span>
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.25)", margin: "8px 0 4px", paddingLeft: 2, fontFamily: "'Inter',sans-serif", fontWeight: 600, textTransform: "uppercase" }}>CLIENTS</div>
      {clients.map(cl => {
        const pts = getT(cl.id), tc = THREAT_COLOR[cl.threat], critC = pts.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        const lead = team.find(m => m.id === cl.lead), spec = team.find(m => m.id === cl.lead2);
        return (
          <div key={cl.id} className="ir" onClick={() => openDrawer(cl.id, cl.label, tc)}
            style={{ marginBottom: 2, padding: "4px 7px", border: `1px solid ${tc}18`, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, background: tc, transform: "rotate(45deg)", borderRadius: 1, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: 1, color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.label.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 2, marginTop: 1, alignItems: "center" }}>
                {cl.disciplines.map(d => <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: DISC_COLOR[d], display: "inline-block" }} />)}
                {lead && <span style={{ fontSize: 6, color: lead.color, marginLeft: 3, opacity: 0.8 }}>{lead.avatar}</span>}
                {spec && <span style={{ fontSize: 6, color: spec.color, opacity: 0.7 }}>{spec.avatar}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: tc, lineHeight: 1 }}>{pts.length}</div>
              {critC > 0 && <div style={{ fontSize: 6, color: "#ff4444" }}>{"\u25C6"}{critC}</div>}
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAdd(true)} style={{ width: "100%", marginTop: 6, padding: "5px", background: "rgba(123,104,238,0.04)", border: "1px dashed rgba(123,104,238,0.18)", color: "rgba(123,104,238,0.7)", cursor: "pointer", fontSize: 7, borderRadius: 3, fontFamily: "inherit", letterSpacing: 2 }}>+ NEW CLIENT</button>

      <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.25)", margin: "10px 0 4px", paddingLeft: 2, fontFamily: "'Inter',sans-serif", fontWeight: 600, textTransform: "uppercase" }}>DISCIPLINES</div>
      {DISCIPLINES.map(d => {
        const count = clients.filter(c => c.disciplines.includes(d)).length;
        return (
          <div key={d} onClick={() => setDiscFilter(discFilter === d ? null : d)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 7px", marginBottom: 1, borderRadius: 2, cursor: "pointer", background: discFilter === d ? `${DISC_COLOR[d]}10` : "transparent", border: `1px solid ${discFilter === d ? DISC_COLOR[d] + "44" : "transparent"}` }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: DISC_COLOR[d] }} />
            <div style={{ fontSize: 9, fontFamily: "'Inter',sans-serif", color: DISC_COLOR[d], flex: 1 }}>{d}</div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 400, color: DISC_COLOR[d], opacity: 0.7 }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}
