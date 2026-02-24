import React, { useState } from "react";
import { FL } from "./ui";
import { DISCIPLINES, DISC_COLOR, PRI_COLOR, STATUS_CFG, STATUSES, PRIORITIES, THREAT_COLOR, SANS, MONO, T } from "../constants";
import type { Task, Client, TeamMember } from "../types";

interface NodeModalProps {
  id: string;
  label: string;
  color: string;
  isSynthetic: boolean;
  tasks: Task[];
  clients: Client[];
  team: TeamMember[];
  onUpdateTask: (pid: string, tid: string, field: string, value: unknown) => void;
  onAddTask: (pid: string) => void;
  onDeleteTask: (pid: string, tid: string) => void;
  onUpdateClient: (cid: string, field: string, value: unknown) => void;
  onClose: () => void;
}

export default function NodeModal({ id, label, color, isSynthetic, tasks, clients, team, onUpdateTask, onAddTask, onDeleteTask, onUpdateClient, onClose }: NodeModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const client = clients?.find(c => c.id === id);
  const crit = tasks.filter(t => t.priority === "CRITICAL" && t.status !== "DONE").length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 680, maxHeight: "82vh", background: T.surface, border: `1px solid ${color}40`, borderTop: `3px solid ${color}`, display: "flex", flexDirection: "column", pointerEvents: "auto", boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 32px 80px rgba(0,0,0,0.6), 0 0 40px ${color}08`, borderRadius: 10, animation: "modalIn 0.18s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* HEADER */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color}18`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, background: `linear-gradient(to right,${color}06,transparent)` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, letterSpacing: 4, color: T.textSec, marginBottom: 3 }}>{isSynthetic ? "AGGREGATE VIEW" : "CLIENT"}</div>
            <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 700, letterSpacing: 4, color, lineHeight: 1 }}>{label.toUpperCase()}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
              {client?.disciplines?.map(d => <span key={d} style={{ padding: "2px 7px", borderRadius: 6, fontSize: 8, background: `${DISC_COLOR[d]}18`, color: DISC_COLOR[d], border: `1px solid ${DISC_COLOR[d]}44` }}>{d}</span>)}
              <span style={{ fontSize: 10, color: T.textSec }}>{tasks.length} tasks{crit > 0 && <span style={{ color: "#d45c5c" }}> &middot; {"\u25C6"} {crit} critical</span>}</span>
            </div>
            {/* Threat level selector */}
            {client && !isSynthetic && (
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {(["NORMAL", "HIGH", "CRITICAL", "IN_PROGRESS"] as const).map(t => (
                  <span key={t} onClick={() => onUpdateClient(id, "threat", t)}
                    style={{ padding: "2px 8px", borderRadius: 6, fontSize: 7, cursor: "pointer", letterSpacing: 1, background: client.threat === t ? `${THREAT_COLOR[t]}25` : T.input, color: client.threat === t ? THREAT_COLOR[t] : T.textSec, border: `1px solid ${client.threat === t ? THREAT_COLOR[t] + "55" : T.borderSub}` }}>{t}</span>
                ))}
              </div>
            )}
          </div>
          {client && !isSynthetic && (
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              {[{ role: "LEAD 1", field: "lead" as const, sub: "Project Manager" }, { role: "LEAD 2", field: "lead2" as const, sub: "Discipline Lead" }].map(g => {
                const member = team.find(m => m.id === client[g.field]);
                return (
                  <div key={g.field}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: T.textSec, marginBottom: 5 }}>{g.role}</div>
                    <select value={client[g.field] || ""} onChange={e => onUpdateClient(id, g.field, e.target.value || null)}
                      style={{ background: T.input, border: `1px solid ${member ? member.color + "66" : T.border}`, color: member ? member.color : T.textSec, padding: "5px 10px", fontSize: 11, fontFamily: SANS, borderRadius: 6, outline: "none", cursor: "pointer", minWidth: 110 }}>
                      <option value="" style={{ background: T.input, color: T.textSec }}>&mdash; assign</option>
                      {team.map(m => <option key={m.id} value={m.id} style={{ background: T.input, color: m.color }}>{m.name}</option>)}
                    </select>
                    {member && <div style={{ fontSize: 9, color: T.textSec, marginTop: 4 }}>{g.sub}</div>}
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textSec, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}>{"\u2715"}</button>
        </div>

        {/* TASK LIST */}
        <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
          {tasks.length === 0 && <div style={{ color: T.textSec, fontSize: 10, letterSpacing: 2, padding: "20px 0", textAlign: "center", fontFamily: SANS }}>NO TASKS</div>}
          {tasks.map(t => {
            const st = STATUS_CFG[t.status];
            const m = team.find(x => x.id === t.assignee);
            const open = expandedId === t.id;
            const hasMeta = t._plabel !== undefined;
            const catLabel = t._ptype === "client" ? "CLIENT" : (t._plabel || "").toUpperCase().slice(0, 5);
            const catColor = t._pcolor || color;
            const GT = hasMeta ? "20px 70px 120px 1fr 90px 116px 80px 70px 24px 30px" : "20px 1fr 56px 120px 116px 80px";
            return (
              <div key={t.id} style={{ borderBottom: `1px solid ${T.borderSub}`, background: open ? `${color}08` : "transparent" }}>
                <div style={{ display: "grid", gridTemplateColumns: GT, gap: 0, padding: "10px 14px 10px 10px", cursor: "pointer", alignItems: "center" }}
                  onClick={() => setExpandedId(open ? null : t.id)}
                  onMouseEnter={e => e.currentTarget.style.background = T.hover}
                  onMouseLeave={e => e.currentTarget.style.background = open ? `${color}08` : "transparent"}>
                  {/* dot */}
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRI_COLOR[t.priority], flexShrink: 0 }} />
                  {/* CAT badge */}
                  {hasMeta && <div style={{ paddingRight: 8 }}><span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 9, fontFamily: MONO, fontWeight: 500, background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40`, whiteSpace: "nowrap", display: "inline-block" }}>{catLabel}</span></div>}
                  {/* PROJ name */}
                  {hasMeta && <div style={{ fontSize: 12, fontFamily: SANS, fontWeight: 600, color: catColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{t._plabel}</div>}
                  {/* TASK */}
                  <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 400, color: T.text, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{t.task}</div>
                  {/* ASSIGNEE */}
                  {hasMeta
                    ? <div style={{ fontSize: 11, fontFamily: SANS, color: T.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m ? m.name : "-"}</div>
                    : <div style={{ display: "flex", gap: 3, alignItems: "center" }}>{(t.disciplines || []).map(d => <span key={d} title={d} style={{ width: 7, height: 7, borderRadius: "50%", background: DISC_COLOR[d], display: "inline-block", flexShrink: 0 }} />)}</div>
                  }
                  {/* STATUS (non-meta has extra assignee col) */}
                  {!hasMeta && <div>{m ? <span style={{ fontSize: 11, fontFamily: SANS, color: m.color, opacity: 0.9 }}>{m.name}</span> : <span style={{ fontSize: 10, color: T.textSec }}>&mdash;</span>}</div>}
                  <div><span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 9, fontFamily: MONO, fontWeight: 500, letterSpacing: 0.5, background: st?.bg, color: st?.color, border: `1px solid ${st?.border || "transparent"}`, whiteSpace: "nowrap", display: "inline-block" }}>{st?.label}</span></div>
                  {/* PRIORITY */}
                  <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 700, color: PRI_COLOR[t.priority] }}>{t.priority}</div>
                  {/* DUE DATE */}
                  {hasMeta && <div style={{ fontSize: 10, fontFamily: MONO, color: t.dueDate ? T.accent : `${T.text}22`, cursor: "pointer" }} onClick={e => { e.stopPropagation(); const d = prompt("Due date (YYYY-MM-DD):", t.dueDate || ""); if (d !== null) onUpdateTask(id, t.id, "dueDate", d || null); }}>{t.dueDate ? t.dueDate.slice(5).replace("-", ".") : "\u2014"}</div>}
                  {hasMeta && <div style={{ textAlign: "center", fontSize: 13, opacity: 0.3 }}>&middot;</div>}
                  {hasMeta && <div style={{ textAlign: "center" }}><button onClick={e => { e.stopPropagation(); setExpandedId(open ? null : t.id); }} style={{ background: T.input, border: `1px solid ${T.borderSub}`, color: T.textSec, cursor: "pointer", borderRadius: 6, fontSize: 10, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25B8"}</button></div>}
                </div>

                {/* EXPANDED DETAIL */}
                {open && (
                  <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${color}15`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <FL>TASK NAME</FL>
                      <input value={t.task} onChange={e => onUpdateTask(id, t.id, "task", e.target.value)}
                        style={{ width: "100%", background: T.input, border: `1px solid ${T.border}`, color: T.text, padding: "7px 10px", fontSize: 12, fontFamily: SANS, borderRadius: 6, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <FL>NOTES</FL>
                      <textarea value={t.notes || ""} onChange={e => onUpdateTask(id, t.id, "notes", e.target.value)} rows={2}
                        style={{ width: "100%", background: T.input, border: `1px solid ${T.borderSub}`, color: T.textSec, padding: "7px 10px", fontSize: 12, fontFamily: SANS, borderRadius: 6, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                        placeholder="Context, links, blockers..." />
                    </div>
                    <div>
                      <FL>STATUS</FL>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {STATUSES.map(s => { const sc = STATUS_CFG[s]; return <span key={s} onClick={() => onUpdateTask(id, t.id, "status", s)} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 8, letterSpacing: 1, cursor: "pointer", background: t.status === s ? sc.bg : T.input, color: t.status === s ? sc.color : T.textSec, border: `1px solid ${t.status === s ? sc.color + "55" : T.borderSub}` }}>{sc.label}</span>; })}
                      </div>
                    </div>
                    <div>
                      <FL>PRIORITY</FL>
                      <div style={{ display: "flex", gap: 4 }}>
                        {PRIORITIES.map(p => <span key={p} onClick={() => onUpdateTask(id, t.id, "priority", p)} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 8, cursor: "pointer", background: t.priority === p ? `${PRI_COLOR[p]}20` : T.input, color: t.priority === p ? PRI_COLOR[p] : T.textSec, border: `1px solid ${t.priority === p ? PRI_COLOR[p] + "55" : T.borderSub}` }}>{p}</span>)}
                      </div>
                    </div>
                    <div>
                      <FL>ASSIGNEE</FL>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <span onClick={() => onUpdateTask(id, t.id, "assignee", null)} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 8, cursor: "pointer", background: !t.assignee ? `${T.text}12` : T.input, color: !t.assignee ? T.textSec : T.textSec, border: `1px solid ${T.borderSub}` }}>&mdash;</span>
                        {team.map(m => <span key={m.id} onClick={() => onUpdateTask(id, t.id, "assignee", m.id)} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 8, cursor: "pointer", background: t.assignee === m.id ? `${m.color}20` : T.input, color: t.assignee === m.id ? m.color : T.textSec, border: `1px solid ${t.assignee === m.id ? m.color + "55" : T.borderSub}` }}>{m.name}</span>)}
                      </div>
                    </div>
                    <div>
                      <FL>DISCIPLINES</FL>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {DISCIPLINES.map(d => { const on = (t.disciplines || []).includes(d); return <span key={d} onClick={() => { const cur = t.disciplines || []; onUpdateTask(id, t.id, "disciplines", on ? cur.filter(x => x !== d) : [...cur, d]); }} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 8, cursor: "pointer", background: on ? `${DISC_COLOR[d]}20` : T.input, color: on ? DISC_COLOR[d] : T.textSec, border: `1px solid ${on ? DISC_COLOR[d] + "55" : T.borderSub}` }}>{d}</span>; })}
                      </div>
                    </div>
                    {/* Delete */}
                    <div style={{ gridColumn: "1/-1", borderTop: "1px solid rgba(212,114,114,0.1)", paddingTop: 10, marginTop: 2 }}>
                      {confirmId === t.id ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, color: "#d47272" }}>Permanently delete this task?</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { onDeleteTask(id, t.id); setConfirmId(null); setExpandedId(null); }} style={{ background: "rgba(212,114,114,0.15)", border: "1px solid rgba(212,114,114,0.4)", color: "#d47272", cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 6, fontFamily: SANS, letterSpacing: 1 }}>DELETE</button>
                            <button onClick={() => setConfirmId(null)} style={{ background: T.input, border: `1px solid ${T.borderSub}`, color: T.textSec, cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 6, fontFamily: SANS }}>CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmId(t.id); }} style={{ background: "none", border: "1px solid rgba(212,114,114,0.15)", color: "rgba(212,114,114,0.5)", cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 6, fontFamily: SANS, letterSpacing: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,114,114,0.4)"; e.currentTarget.style.color = "#d47272"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,114,114,0.15)"; e.currentTarget.style.color = "rgba(212,114,114,0.5)"; }}>
                          DELETE TASK
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isSynthetic && (
          <div style={{ padding: "8px 20px", borderTop: `1px solid ${color}12`, flexShrink: 0 }}>
            <button onClick={() => onAddTask(id)} style={{ padding: "6px 16px", background: `${color}10`, border: `1px solid ${color}30`, color, cursor: "pointer", fontSize: 9, letterSpacing: 2, borderRadius: 6, fontFamily: SANS }}>+ ADD TASK</button>
          </div>
        )}
      </div>
    </div>
  );
}
