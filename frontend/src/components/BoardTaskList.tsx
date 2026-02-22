import React, { useState } from "react";
import { InlinePicker } from "./ui";
import { BOARD_GT, SANS, PRI_COLOR, STATUS_CFG, STATUSES, PRIORITIES } from "../constants";
import type { Task, TeamMember } from "../types";

interface BoardTaskListProps {
  tasks: Task[];
  projectId: string;
  onUpdate: (pid: string, tid: string, field: string, value: unknown) => void;
  onDelete: (pid: string, tid: string) => void;
  onAdd: (pid: string) => void;
  team: TeamMember[];
}

export default function BoardTaskList({ tasks, projectId, onUpdate, onDelete, onAdd, team }: BoardTaskListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ taskId: string; field: string } | null>(null);

  const stopEdit = () => setEditing(null);
  const isEdit = (tid: string, field: string) => editing?.taskId === tid && editing?.field === field;

  return (
    <div>
      {tasks.map(t => {
        const st = STATUS_CFG[t.status];
        const m = team.find(x => x.id === t.assignee);
        const pc = t._pcolor || "#7B68EE";
        const cat = t._ptype === "client" ? "CLIENTS" : (t._plabel || "").toUpperCase().slice(0, 6);
        const open = expandedId === t.id;
        const pid = t._pid || projectId;
        const upd = (field: string, val: unknown) => { onUpdate(pid, t.id, field, val); };

        if (confirmId === t.id) return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px 9px 10px", background: "rgba(255,68,68,0.05)", borderBottom: "1px solid #1a1d27" }}>
            <span style={{ fontSize: 11, color: "#ff8888", fontFamily: SANS, flex: 1 }}>Delete &quot;{t.task.slice(0, 60)}&quot;?</span>
            <button onClick={() => { onDelete(pid, t.id); setConfirmId(null); setExpandedId(null); }} style={{ background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.4)", color: "#ff6666", cursor: "pointer", fontSize: 9, padding: "3px 12px", borderRadius: 3, fontFamily: "inherit" }}>DELETE</button>
            <button onClick={() => setConfirmId(null)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#6a9aaa", cursor: "pointer", fontSize: 9, padding: "3px 12px", borderRadius: 3, fontFamily: "inherit" }}>CANCEL</button>
          </div>
        );

        return (
          <div key={t.id} style={{ borderBottom: "1px solid #1a1d27", background: open ? "rgba(123,104,238,0.04)" : "transparent" }}>
            {/* ROW */}
            <div style={{ display: "grid", gridTemplateColumns: BOARD_GT, alignItems: "center", padding: "0 14px 0 10px", minHeight: 38 }}
              onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}>

              {/* dot */}
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRI_COLOR[t.priority], flexShrink: 0, animation: t.priority === "FOCUS" ? "focusPulse 1.5s ease-in-out infinite" : undefined }} />

              {/* CAT */}
              <div style={{ padding: "9px 8px 9px 0" }}>
                <span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, background: `${pc}22`, color: pc, border: `1px solid ${pc}40`, whiteSpace: "nowrap" }}>{cat}</span>
              </div>

              {/* PROJ */}
              <div style={{ fontSize: 12, fontFamily: SANS, fontWeight: 600, color: pc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8, padding: "9px 8px 9px 0" }}>{t._plabel || ""}</div>

              {/* TASK */}
              <div style={{ position: "relative", padding: "6px 8px 6px 0" }} onClick={e => e.stopPropagation()}>
                {isEdit(t.id, "task") ? (
                  <input autoFocus value={t.task}
                    onChange={e => upd("task", e.target.value)}
                    onBlur={stopEdit} onKeyDown={e => { if (e.key === "Enter") stopEdit(); }}
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(123,104,238,0.5)", color: "#e4e4e7", padding: "3px 6px", fontSize: 13, fontFamily: SANS, borderRadius: 3, outline: "none", boxSizing: "border-box" }} />
                ) : (
                  <div title="Click to edit" onClick={() => setEditing({ taskId: t.id, field: "task" })}
                    style={{ fontSize: 13, fontFamily: SANS, fontWeight: 400, color: "rgba(228,228,231,0.92)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text", borderRadius: 2, padding: "2px 4px", margin: "-2px -4px" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{t.task}</div>
                )}
              </div>

              {/* ASSIGNEE */}
              <div style={{ position: "relative", padding: "6px 8px 6px 0" }} onClick={e => e.stopPropagation()}>
                <div title="Click to change" onClick={() => setEditing({ taskId: t.id, field: "assignee" })}
                  style={{ fontSize: 11, fontFamily: SANS, color: m ? m.color : "rgba(255,255,255,0.25)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRadius: 2, padding: "2px 4px", margin: "-2px -4px" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{m ? m.name : "\u2014 assign"}</div>
                {isEdit(t.id, "assignee") && (
                  <InlinePicker
                    onClose={stopEdit}
                    options={[null, ...team.map(x => x.id)]}
                    renderOption={(aid: string | null) => {
                      const mb = team.find(x => x.id === aid);
                      return (
                        <div key={aid || "none"} onClick={() => { upd("assignee", aid); stopEdit(); }}
                          style={{ padding: "5px 10px", borderRadius: 3, cursor: "pointer", fontSize: 11, fontFamily: SANS, color: mb ? mb.color : "rgba(255,255,255,0.35)", background: t.assignee === aid ? "rgba(255,255,255,0.06)" : "transparent" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                          onMouseLeave={e => e.currentTarget.style.background = t.assignee === aid ? "rgba(255,255,255,0.06)" : "transparent"}>
                          {mb ? mb.name : "\u2014 none"}
                        </div>
                      );
                    }}
                  />
                )}
              </div>

              {/* STATUS */}
              <div style={{ position: "relative", padding: "6px 8px 6px 0" }} onClick={e => e.stopPropagation()}>
                <div title="Click to change" onClick={() => setEditing({ taskId: t.id, field: "status" })}
                  style={{ display: "inline-block", padding: "3px 10px", borderRadius: 3, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, background: st?.bg, color: st?.color, border: `1px solid ${st?.border || "transparent"}`, whiteSpace: "nowrap", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>{st?.label}</div>
                {isEdit(t.id, "status") && (
                  <InlinePicker
                    onClose={stopEdit}
                    options={[...STATUSES]}
                    renderOption={(s: string) => {
                      const sc = STATUS_CFG[s];
                      return (
                        <div key={s} onClick={() => { upd("status", s); stopEdit(); }}
                          style={{ padding: "5px 10px", borderRadius: 3, cursor: "pointer", fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: t.status === s ? sc.color : "rgba(255,255,255,0.45)", background: t.status === s ? sc.bg : "transparent", border: t.status === s ? `1px solid ${sc.border || sc.color + "44"}` : "1px solid transparent" }}
                          onMouseEnter={e => e.currentTarget.style.background = sc.bg}
                          onMouseLeave={e => e.currentTarget.style.background = t.status === s ? sc.bg : "transparent"}>
                          {sc.label}
                        </div>
                      );
                    }}
                  />
                )}
              </div>

              {/* PRIORITY */}
              <div style={{ position: "relative", padding: "6px 4px 6px 0" }} onClick={e => e.stopPropagation()}>
                <div title="Click to change" onClick={() => setEditing({ taskId: t.id, field: "priority" })}
                  style={{ fontSize: 11, fontFamily: SANS, fontWeight: 700, color: PRI_COLOR[t.priority], cursor: "pointer", borderRadius: 2, padding: "2px 4px", margin: "-2px -4px", letterSpacing: t.priority === "FOCUS" ? 0.5 : 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{t.priority === "FOCUS" ? "\u25B6 FOCUS" : t.priority}</div>
                {isEdit(t.id, "priority") && (
                  <InlinePicker
                    onClose={stopEdit}
                    options={[...PRIORITIES]}
                    renderOption={(p: string) => (
                      <div key={p} onClick={() => { upd("priority", p); stopEdit(); }}
                        style={{ padding: "5px 10px", borderRadius: 3, cursor: "pointer", fontSize: 11, fontFamily: SANS, fontWeight: 700, color: PRI_COLOR[p], background: t.priority === p ? "rgba(255,255,255,0.06)" : "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = t.priority === p ? "rgba(255,255,255,0.06)" : "transparent"}>
                        {p}
                      </div>
                    )}
                  />
                )}
              </div>

              {/* DUE */}
              <div style={{ position: "relative", padding: "6px 4px 6px 0" }} onClick={e => e.stopPropagation()}>
                {isEdit(t.id, "due") ? (
                  <input autoFocus type="date" value={t.dueDate || ""} onChange={e => upd("dueDate", e.target.value || null)} onBlur={stopEdit}
                    style={{ background: "transparent", border: "none", color: "#7B68EE", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", outline: "none", cursor: "pointer", width: 64 }} />
                ) : (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                  const dueToday = t.dueDate === today;
                  return (
                    <div title="Click to set due date" onClick={() => setEditing({ taskId: t.id, field: "due" })}
                      style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: overdue ? "#f87171" : dueToday ? "#fbbf24" : t.dueDate ? "#7B68EE" : "rgba(255,255,255,0.12)", cursor: "pointer", borderRadius: 2, padding: "2px 3px", margin: "-2px -3px", fontWeight: (overdue || dueToday) ? 600 : 400 }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      {t.dueDate ? (overdue ? "\u26A0 " : dueToday ? "\u25CF " : "") + t.dueDate.slice(5).replace("-", ".") : "\u2014"}
                    </div>
                  );
                })()}
              </div>

              {/* DETAILS button */}
              <button title="Task details" onClick={e => { e.stopPropagation(); setEditing(null); setExpandedId(open ? null : t.id); }}
                style={{ background: open ? "rgba(123,104,238,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${open ? "rgba(123,104,238,0.5)" : "rgba(255,255,255,0.08)"}`, color: open ? "#7B68EE" : "rgba(255,255,255,0.3)", cursor: "pointer", borderRadius: 3, fontSize: 11, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(123,104,238,0.15)"; e.currentTarget.style.color = "#7B68EE"; }}
                onMouseLeave={e => { e.currentTarget.style.background = open ? "rgba(123,104,238,0.2)" : "rgba(255,255,255,0.04)"; e.currentTarget.style.color = open ? "#7B68EE" : "rgba(255,255,255,0.3)"; }}>{"\u229E"}</button>
            </div>

            {/* DETAIL PANEL */}
            {open && (
              <div style={{ padding: "12px 14px 14px 40px", borderTop: "1px solid rgba(123,104,238,0.08)", background: "rgba(123,104,238,0.02)" }}>
                <div style={{ fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>NOTES</div>
                <textarea value={t.notes || ""} onChange={e => upd("notes", e.target.value)} rows={2}
                  style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(123,104,238,0.15)", color: "rgba(228,228,231,0.65)", padding: "6px 10px", fontSize: 11, fontFamily: SANS, borderRadius: 3, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                  placeholder="Context, links, blockers..." />
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>
                    DUE: <input type="date" value={t.dueDate || ""} onChange={e => upd("dueDate", e.target.value || null)}
                      style={{ background: "transparent", border: "none", color: "#7B68EE", fontSize: 9, fontFamily: "'JetBrains Mono',monospace", outline: "none", cursor: "pointer" }} />
                  </div>
                  <button onClick={() => setConfirmId(t.id)}
                    style={{ background: "none", border: "1px solid rgba(255,68,68,0.2)", color: "rgba(255,80,80,0.45)", cursor: "pointer", fontSize: 9, padding: "3px 12px", borderRadius: 3, fontFamily: "inherit", letterSpacing: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.5)"; e.currentTarget.style.color = "#ff6666"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,68,68,0.2)"; e.currentTarget.style.color = "rgba(255,80,80,0.45)"; }}>DELETE TASK</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={() => onAdd(projectId)} style={{ margin: "4px 10px 6px", padding: "4px 12px", background: "rgba(123,104,238,0.05)", border: "1px dashed rgba(123,104,238,0.2)", color: "rgba(123,104,238,0.6)", cursor: "pointer", fontSize: 9, borderRadius: 3, fontFamily: "inherit", letterSpacing: 1, display: "block" }}>+ ADD TASK</button>
    </div>
  );
}
