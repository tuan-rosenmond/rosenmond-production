import React, { useState } from "react";
import { FL } from "./ui";
import { DISCIPLINES, DISC_COLOR, PRI_COLOR, STATUS_CFG, STATUSES, PRIORITIES, THREAT_COLOR, SANS } from "../constants";
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
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto", background: "rgba(3,9,22,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 680, maxHeight: "82vh", background: "#030b1a", border: `1px solid ${color}40`, borderTop: `3px solid ${color}`, display: "flex", flexDirection: "column", pointerEvents: "auto", boxShadow: `0 0 0 1px rgba(0,0,0,0.8), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${color}12`, borderRadius: 6, animation: "modalIn 0.18s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* HEADER */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${color}18`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, background: `linear-gradient(to right,${color}06,transparent)` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, letterSpacing: 4, color: "#5a9abb", marginBottom: 3 }}>{isSynthetic ? "AGGREGATE VIEW" : "CLIENT"}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 4, color, lineHeight: 1 }}>{label.toUpperCase()}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
              {client?.disciplines?.map(d => <span key={d} style={{ padding: "2px 7px", borderRadius: 2, fontSize: 8, background: `${DISC_COLOR[d]}18`, color: DISC_COLOR[d], border: `1px solid ${DISC_COLOR[d]}44` }}>{d}</span>)}
              <span style={{ fontSize: 10, color: "#5a7a9a" }}>{tasks.length} tasks{crit > 0 && <span style={{ color: "#ff3333" }}> &middot; ◆ {crit} critical</span>}</span>
            </div>
            {/* Threat level selector */}
            {client && !isSynthetic && (
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {(["NORMAL", "HIGH", "CRITICAL", "IN_PROGRESS"] as const).map(t => (
                  <span key={t} onClick={() => onUpdateClient(id, "threat", t)}
                    style={{ padding: "2px 8px", borderRadius: 2, fontSize: 7, cursor: "pointer", letterSpacing: 1, background: client.threat === t ? `${THREAT_COLOR[t]}25` : "rgba(255,255,255,0.04)", color: client.threat === t ? THREAT_COLOR[t] : "#5a7a9a", border: `1px solid ${client.threat === t ? THREAT_COLOR[t] + "55" : "rgba(255,255,255,0.08)"}` }}>{t}</span>
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
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#5a9abb", marginBottom: 5 }}>{g.role}</div>
                    <select value={client[g.field] || ""} onChange={e => onUpdateClient(id, g.field, e.target.value || null)}
                      style={{ background: "#060f1e", border: `1px solid ${member ? member.color + "66" : "rgba(123,104,238,0.22)"}`, color: member ? member.color : "#7aaabb", padding: "5px 10px", fontSize: 11, fontFamily: "inherit", borderRadius: 3, outline: "none", cursor: "pointer", minWidth: 110 }}>
                      <option value="" style={{ background: "#060f1e", color: "#7aaabb" }}>&mdash; assign</option>
                      {team.map(m => <option key={m.id} value={m.id} style={{ background: "#060f1e", color: m.color }}>{m.name}</option>)}
                    </select>
                    {member && <div style={{ fontSize: 9, color: "#4a8aaa", marginTop: 4 }}>{g.sub}</div>}
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a8aaa", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}>{"\u2715"}</button>
        </div>

        {/* TASK LIST */}
        <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
          {tasks.length === 0 && <div style={{ color: "#4a7a9a", fontSize: 10, letterSpacing: 2, padding: "20px 0", textAlign: "center", fontFamily: "'Inter',sans-serif" }}>NO TASKS</div>}
          {tasks.map(t => {
            const st = STATUS_CFG[t.status];
            const m = team.find(x => x.id === t.assignee);
            const open = expandedId === t.id;
            const hasMeta = t._plabel !== undefined;
            const catLabel = t._ptype === "client" ? "CLIENT" : (t._plabel || "").toUpperCase().slice(0, 5);
            const catColor = t._pcolor || color;
            const GT = hasMeta ? "20px 70px 120px 1fr 90px 116px 80px 70px 24px 30px" : "20px 1fr 56px 120px 116px 80px";
            return (
              <div key={t.id} style={{ borderBottom: "1px solid #1a1d27", background: open ? `${color}08` : "transparent" }}>
                <div style={{ display: "grid", gridTemplateColumns: GT, gap: 0, padding: "10px 14px 10px 10px", cursor: "pointer", alignItems: "center" }}
                  onClick={() => setExpandedId(open ? null : t.id)}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = open ? `${color}08` : "transparent"}>
                  {/* dot */}
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRI_COLOR[t.priority], flexShrink: 0 }} />
                  {/* CAT badge */}
                  {hasMeta && <div style={{ paddingRight: 8 }}><span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40`, whiteSpace: "nowrap", display: "inline-block" }}>{catLabel}</span></div>}
                  {/* PROJ name */}
                  {hasMeta && <div style={{ fontSize: 12, fontFamily: "'Inter',sans-serif", fontWeight: 600, color: catColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{t._plabel}</div>}
                  {/* TASK */}
                  <div style={{ fontSize: 13, fontFamily: SANS, fontWeight: 400, color: "rgba(228,228,231,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{t.task}</div>
                  {/* ASSIGNEE */}
                  {hasMeta
                    ? <div style={{ fontSize: 11, fontFamily: "'Inter',sans-serif", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m ? m.name : "-"}</div>
                    : <div style={{ display: "flex", gap: 3, alignItems: "center" }}>{(t.disciplines || []).map(d => <span key={d} title={d} style={{ width: 7, height: 7, borderRadius: "50%", background: DISC_COLOR[d], display: "inline-block", flexShrink: 0 }} />)}</div>
                  }
                  {/* STATUS (non-meta has extra assignee col) */}
                  {!hasMeta && <div>{m ? <span style={{ fontSize: 11, fontFamily: "'Inter',sans-serif", color: m.color, opacity: 0.9 }}>{m.name}</span> : <span style={{ fontSize: 10, color: "#4a7a9a" }}>&mdash;</span>}</div>}
                  <div><span style={{ padding: "3px 10px", borderRadius: 3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, letterSpacing: 0.5, background: st?.bg, color: st?.color, border: `1px solid ${st?.border || "transparent"}`, whiteSpace: "nowrap", display: "inline-block" }}>{st?.label}</span></div>
                  {/* PRIORITY */}
                  <div style={{ fontSize: 11, fontFamily: "'Inter',sans-serif", fontWeight: 700, color: PRI_COLOR[t.priority] }}>{t.priority}</div>
                  {/* DUE DATE */}
                  {hasMeta && <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: t.dueDate ? "#7B68EE" : "rgba(255,255,255,0.15)", cursor: "pointer" }} onClick={e => { e.stopPropagation(); const d = prompt("Due date (YYYY-MM-DD):", t.dueDate || ""); if (d !== null) onUpdateTask(id, t.id, "dueDate", d || null); }}>{t.dueDate ? t.dueDate.slice(5).replace("-", ".") : "\u2014"}</div>}
                  {hasMeta && <div style={{ textAlign: "center", fontSize: 13, opacity: 0.3 }}>&middot;</div>}
                  {hasMeta && <div style={{ textAlign: "center" }}><button onClick={e => { e.stopPropagation(); setExpandedId(open ? null : t.id); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 3, fontSize: 10, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u25B8"}</button></div>}
                </div>

                {/* EXPANDED DETAIL */}
                {open && (
                  <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${color}15`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <FL>TASK NAME</FL>
                      <input value={t.task} onChange={e => onUpdateTask(id, t.id, "task", e.target.value)}
                        style={{ width: "100%", background: "rgba(123,104,238,0.07)", border: "1px solid rgba(123,104,238,0.22)", color: "#c8d8e8", padding: "7px 10px", fontSize: 12, fontFamily: "inherit", borderRadius: 3, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <FL>NOTES</FL>
                      <textarea value={t.notes || ""} onChange={e => onUpdateTask(id, t.id, "notes", e.target.value)} rows={2}
                        style={{ width: "100%", background: "rgba(123,104,238,0.05)", border: "1px solid rgba(123,104,238,0.18)", color: "#9aaccb", padding: "7px 10px", fontSize: 12, fontFamily: "inherit", borderRadius: 3, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                        placeholder="Context, links, blockers..." />
                    </div>
                    <div>
                      <FL>STATUS</FL>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {STATUSES.map(s => { const sc = STATUS_CFG[s]; return <span key={s} onClick={() => onUpdateTask(id, t.id, "status", s)} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, letterSpacing: 1, cursor: "pointer", background: t.status === s ? sc.bg : "rgba(255,255,255,0.04)", color: t.status === s ? sc.color : "#7a9aaa", border: `1px solid ${t.status === s ? sc.color + "55" : "rgba(255,255,255,0.08)"}` }}>{sc.label}</span>; })}
                      </div>
                    </div>
                    <div>
                      <FL>PRIORITY</FL>
                      <div style={{ display: "flex", gap: 4 }}>
                        {PRIORITIES.map(p => <span key={p} onClick={() => onUpdateTask(id, t.id, "priority", p)} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: t.priority === p ? `${PRI_COLOR[p]}20` : "rgba(255,255,255,0.04)", color: t.priority === p ? PRI_COLOR[p] : "#7a9aaa", border: `1px solid ${t.priority === p ? PRI_COLOR[p] + "55" : "rgba(255,255,255,0.08)"}` }}>{p}</span>)}
                      </div>
                    </div>
                    <div>
                      <FL>ASSIGNEE</FL>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <span onClick={() => onUpdateTask(id, t.id, "assignee", null)} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: !t.assignee ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", color: !t.assignee ? "#8899aa" : "#7a9aaa", border: "1px solid rgba(255,255,255,0.08)" }}>&mdash;</span>
                        {team.map(m => <span key={m.id} onClick={() => onUpdateTask(id, t.id, "assignee", m.id)} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: t.assignee === m.id ? `${m.color}20` : "rgba(255,255,255,0.04)", color: t.assignee === m.id ? m.color : "#7a9aaa", border: `1px solid ${t.assignee === m.id ? m.color + "55" : "rgba(255,255,255,0.08)"}` }}>{m.name}</span>)}
                      </div>
                    </div>
                    <div>
                      <FL>DISCIPLINES</FL>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {DISCIPLINES.map(d => { const on = (t.disciplines || []).includes(d); return <span key={d} onClick={() => { const cur = t.disciplines || []; onUpdateTask(id, t.id, "disciplines", on ? cur.filter(x => x !== d) : [...cur, d]); }} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: on ? `${DISC_COLOR[d]}20` : "rgba(255,255,255,0.04)", color: on ? DISC_COLOR[d] : "#7a9aaa", border: `1px solid ${on ? DISC_COLOR[d] + "55" : "rgba(255,255,255,0.08)"}` }}>{d}</span>; })}
                      </div>
                    </div>
                    {/* Delete */}
                    <div style={{ gridColumn: "1/-1", borderTop: "1px solid rgba(255,68,68,0.1)", paddingTop: 10, marginTop: 2 }}>
                      {confirmId === t.id ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, color: "#ff8888" }}>Permanently delete this task?</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { onDeleteTask(id, t.id); setConfirmId(null); setExpandedId(null); }} style={{ background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.4)", color: "#ff6666", cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 3, fontFamily: "inherit", letterSpacing: 1 }}>DELETE</button>
                            <button onClick={() => setConfirmId(null)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#6a9aaa", cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 3, fontFamily: "inherit" }}>CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmId(t.id); }} style={{ background: "none", border: "1px solid rgba(255,68,68,0.15)", color: "rgba(255,80,80,0.5)", cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 3, fontFamily: "inherit", letterSpacing: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.4)"; e.currentTarget.style.color = "#ff6666"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.15)"; e.currentTarget.style.color = "rgba(255,80,80,0.5)"; }}>
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
            <button onClick={() => onAddTask(id)} style={{ padding: "6px 16px", background: `${color}10`, border: `1px solid ${color}30`, color, cursor: "pointer", fontSize: 9, letterSpacing: 2, borderRadius: 3, fontFamily: "inherit" }}>+ ADD TASK</button>
          </div>
        )}
      </div>
    </div>
  );
}
