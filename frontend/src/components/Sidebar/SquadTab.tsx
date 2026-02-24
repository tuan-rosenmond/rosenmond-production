import React, { useState } from "react";
import { AddOperative } from "../ui";
import { PRI_COLOR, STATUS_CFG, T, SANS } from "../../constants";
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
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: T.textSec, marginBottom: 8, paddingLeft: 2, fontFamily: SANS, fontWeight: 600 }}>FIELD OPERATIVES</div>
      {team.map(m => {
        const mT = getMT(m.id), critC = mT.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;
        const isActive = squadMember === m.id, load = mT.length, lc = load >= 8 ? "#d45c5c" : load >= 5 ? "#d4a35c" : "#5bbf8e";
        const leadsC = clients.filter(c => c.lead === m.id), specC = clients.filter(c => c.lead2 === m.id);
        return (
          <div key={m.id} onClick={() => setSquadMember(isActive ? null : m.id)}
            style={{ marginBottom: 5, padding: "10px 10px", background: isActive ? `${m.color}0e` : T.input, border: `1px solid ${isActive ? m.color + "35" : T.borderSub}`, borderRadius: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${m.color}15`, border: `1px solid ${m.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: m.color, fontWeight: "bold", flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: m.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 11, fontFamily: SANS, color: T.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.role}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: lc, lineHeight: 1 }}>{load}</div>
                <div style={{ fontSize: 9, color: T.textSec, lineHeight: 1.4 }}>OPS</div>
              </div>
            </div>
            {(leadsC.length > 0 || specC.length > 0) && <div style={{ fontSize: 10, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 5, paddingTop: 5, borderTop: `1px solid ${T.borderSub}` }}>
              {leadsC.length > 0 && <span style={{ color: m.color, opacity: 0.7 }}>L1: {leadsC.map(c => c.label).join(", ")}</span>}
              {specC.length > 0 && <span style={{ color: m.color, opacity: 0.5 }}>L2: {specC.map(c => c.label).join(", ")}</span>}
            </div>}
            <div style={{ height: 3, background: T.borderSub, borderRadius: 2, marginTop: 6 }}>
              <div style={{ height: "100%", width: `${Math.min((load / 12) * 100, 100)}%`, background: lc, borderRadius: 2, opacity: 0.6 }} />
            </div>
            {isActive && <div style={{ marginTop: 8 }}>
              {mT.map(t => (
                <div key={t.id} style={{ display: "flex", gap: 6, padding: "3px 0", alignItems: "baseline" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: PRI_COLOR[t.priority], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, fontFamily: SANS, fontWeight: 400, color: T.text, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.task}</div>
                  <div style={{ fontSize: 10, color: STATUS_CFG[t.status]?.color, opacity: 0.8, whiteSpace: "nowrap", flexShrink: 0 }}>{STATUS_CFG[t.status]?.label.split(" ")[0]}</div>
                </div>
              ))}
            </div>}
            {!isActive && critC > 0 && <div style={{ fontSize: 10, color: "#d45c5c", marginTop: 4 }}>{"\u25C6"} {critC} CRITICAL</div>}
            {!isActive && load === 0 && <div style={{ fontSize: 10, color: "#5bbf8e", marginTop: 4 }}>AVAILABLE</div>}
          </div>
        );
      })}
      <div style={{ padding: "8px 10px", background: "rgba(212,163,92,0.06)", border: "1px solid rgba(212,163,92,0.15)", borderRadius: 10, marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#d4a35c", fontFamily: SANS, fontWeight: 600, letterSpacing: 1 }}>{"\u26A0"} UNASSIGNED</span>
          <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: "#d4a35c" }}>{unassigned}</span>
        </div>
      </div>
      <AddOperative onAdd={onAddTeamMember} />
    </div>
  );
}
