import React, { useState } from "react";
import { AddOperative } from "../ui";
import { PRI_COLOR, STATUS_CFG } from "../../constants";
import type { Task, Client, TeamMember } from "../../types";

interface SquadTabProps {
  team: TeamMember[];
  clients: Client[];
  allFlat: Task[];
  unassigned: number;
  onAddTeamMember: (m: TeamMember) => void;
}

export default function SquadTab({ team, clients, allFlat, unassigned, onAddTeamMember }: SquadTabProps) {
  const [squadMember, setSquadMember] = useState<string | null>(null);

  const getMT = (mid: string) => allFlat.filter(t => t.assignee === mid);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
      <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.25)", marginBottom: 5, paddingLeft: 2, fontFamily: "'Inter',sans-serif", fontWeight: 600, textTransform: "uppercase" }}>FIELD OPERATIVES</div>
      {team.map(m => {
        const mT = getMT(m.id), critC = mT.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        const isActive = squadMember === m.id, load = mT.length, lc = load >= 8 ? "#ff3333" : load >= 5 ? "#ff8c00" : "#7ed321";
        const leadsC = clients.filter(c => c.lead === m.id), specC = clients.filter(c => c.lead2 === m.id);
        return (
          <div key={m.id} onClick={() => setSquadMember(isActive ? null : m.id)}
            style={{ marginBottom: 4, padding: "6px 7px", background: isActive ? `${m.color}0e` : "rgba(123,104,238,0.03)", border: `1px solid ${isActive ? m.color + "44" : "rgba(123,104,238,0.07)"}`, borderRadius: 3, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 2, background: `${m.color}15`, border: `1px solid ${m.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: m.color, fontWeight: "bold", flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: m.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 9, fontFamily: "'Inter',sans-serif", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.role}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: lc, lineHeight: 1 }}>{load}</div>
                <div style={{ fontSize: 6, color: "#5a8aaa", lineHeight: 1 }}>OPS</div>
              </div>
            </div>
            {(leadsC.length > 0 || specC.length > 0) && <div style={{ fontSize: 7, display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3, paddingTop: 3, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {leadsC.length > 0 && <span style={{ color: m.color, opacity: 0.7 }}>L1: {leadsC.map(c => c.label).join(", ")}</span>}
              {specC.length > 0 && <span style={{ color: m.color, opacity: 0.5 }}>L2: {specC.map(c => c.label).join(", ")}</span>}
            </div>}
            <div style={{ height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, marginTop: 4 }}>
              <div style={{ height: "100%", width: `${Math.min((load / 12) * 100, 100)}%`, background: lc, borderRadius: 1, opacity: 0.6 }} />
            </div>
            {isActive && <div style={{ marginTop: 5 }}>
              {mT.map(t => (
                <div key={t.id} style={{ display: "flex", gap: 4, padding: "2px 0", alignItems: "baseline" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: PRI_COLOR[t.priority], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 9, fontFamily: "'Inter',sans-serif", fontWeight: 400, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.task}</div>
                  <div style={{ fontSize: 7, color: STATUS_CFG[t.status]?.color, opacity: 0.8, whiteSpace: "nowrap", flexShrink: 0 }}>{STATUS_CFG[t.status]?.label.split(" ")[0]}</div>
                </div>
              ))}
            </div>}
            {!isActive && critC > 0 && <div style={{ fontSize: 7, color: "#ff4444", marginTop: 3 }}>{"\u25C6"} {critC} CRITICAL</div>}
            {!isActive && load === 0 && <div style={{ fontSize: 7, color: "#3a7a5a", marginTop: 3 }}>AVAILABLE</div>}
          </div>
        );
      })}
      <div style={{ padding: "5px 7px", background: "rgba(255,140,0,0.04)", border: "1px solid rgba(255,140,0,0.1)", borderRadius: 3, marginTop: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 7, color: "#ff8c00", letterSpacing: 2 }}>{"\u26A0"} UNASSIGNED</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: "#ff8c00" }}>{unassigned}</span>
        </div>
      </div>
      <AddOperative onAdd={onAddTeamMember} />
    </div>
  );
}
