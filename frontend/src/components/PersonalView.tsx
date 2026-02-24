import React, { useState } from "react";
import { InlinePicker } from "./ui";
import { PERSONAL_GT, SANS, MONO, T, PRI_COLOR, STATUS_CFG, STATUSES, PRIORITIES } from "../constants";
import type { PersonalTask, Task, Client, Domain } from "../types";

const PRI_ORDER: Record<string, number> = { FOCUS: 0, CRITICAL: 1, HIGH: 2, NORMAL: 3 };
const STAT_ORDER: Record<string, number> = { BLOCKED: 0, IN_PROGRESS: 1, OPEN: 2, WAITING: 3, DELEGATED: 4, PARKED: 5, DONE: 6 };

interface PersonalViewProps {
  personalTasks: PersonalTask[];
  allTeamTasks: Task[];
  clients: Client[];
  domains: Domain[];
  onAdd: (taskName: string) => void;
  onUpdate: (taskId: string, field: string, value: unknown) => void;
  onDelete: (taskId: string) => void;
  onPush: (taskId: string, projectId: string) => void;
  onPull: (teamTaskId: string, teamTask: Task) => void;
  onUnlink: (taskId: string) => void;
}

type GroupBy = "none" | "status" | "priority" | "client";
type SortBy = "priority" | "status" | "task" | "created";

export default function PersonalView({
  personalTasks, allTeamTasks, clients, domains,
  onAdd, onUpdate, onDelete, onPush, onPull, onUnlink,
}: PersonalViewProps) {
  const [quickAdd, setQuickAdd] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ taskId: string; field: string } | null>(null);
  const [showPull, setShowPull] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);

  const stopEdit = () => setEditing(null);
  const isEdit = (tid: string, field: string) => editing?.taskId === tid && editing?.field === field;

  const handleQuickAdd = () => {
    const trimmed = quickAdd.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setQuickAdd("");
  };

  // Sort tasks
  const sortFns: Record<string, (a: PersonalTask, b: PersonalTask) => number> = {
    priority: (a, b) => (PRI_ORDER[a.priority] ?? 9) - (PRI_ORDER[b.priority] ?? 9),
    status: (a, b) => (STAT_ORDER[a.status] ?? 9) - (STAT_ORDER[b.status] ?? 9),
    task: (a, b) => a.task.localeCompare(b.task),
    created: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  };
  const sorted = [...personalTasks].sort(sortFns[sortBy] || sortFns.priority);

  // Group tasks
  let groups: { key: string; label: string; color: string; tasks: PersonalTask[] }[] = [];
  if (groupBy === "none") {
    groups = [{ key: "all", label: "", color: "", tasks: sorted }];
  } else if (groupBy === "status") {
    groups = [...STATUSES].map(s => ({
      key: s, label: STATUS_CFG[s]?.label || s, color: STATUS_CFG[s]?.color || "#888",
      tasks: sorted.filter(t => t.status === s),
    })).filter(g => g.tasks.length > 0);
  } else if (groupBy === "priority") {
    groups = (["FOCUS", "CRITICAL", "HIGH", "NORMAL"] as const).map(p => ({
      key: p, label: p, color: PRI_COLOR[p],
      tasks: sorted.filter(t => t.priority === p),
    })).filter(g => g.tasks.length > 0);
  } else if (groupBy === "client") {
    const clientMap = new Map(clients.map(c => [c.id, c.label]));
    const grouped: Record<string, PersonalTask[]> = {};
    sorted.forEach(t => {
      const k = t.clientId || "__none__";
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(t);
    });
    groups = Object.entries(grouped).map(([k, tasks]) => ({
      key: k,
      label: k === "__none__" ? "No Client" : clientMap.get(k) || k,
      color: k === "__none__" ? T.textSec : T.accent,
      tasks,
    }));
  }

  // Team tasks available for pulling (not already linked to a personal task)
  const linkedTeamIds = new Set(personalTasks.filter(t => t.linkedTeamTaskId).map(t => t.linkedTeamTaskId));
  const pullableTeamTasks = allTeamTasks.filter(t => !linkedTeamIds.has(t.id) && t.status !== "DONE");

  // Projects list for push picker (clients + domains)
  const projectOptions = [
    ...clients.map(c => ({ id: c.id, label: c.label })),
    ...domains.map(d => ({ id: d.id, label: d.label })),
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* QUICK ADD BAR */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.borderSub}`, padding: "9px 18px", display: "flex", alignItems: "center", gap: 10, background: T.surface }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1 }}>
          <span style={{ position: "absolute", left: 10, fontSize: 12, color: T.accent, pointerEvents: "none", opacity: 0.5 }}>+</span>
          <input
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleQuickAdd(); }}
            placeholder="Type a task and press Enter..."
            style={{
              width: "100%", paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              background: T.input, border: `1px solid ${T.borderSub}`, borderRadius: 6,
              color: T.text, fontSize: 12, fontFamily: SANS, outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = `${T.accent}55`}
            onBlur={e => e.target.style.borderColor = T.borderSub}
          />
        </div>
        <button onClick={() => setShowPull(true)} style={{
          padding: "7px 14px", fontSize: 10, letterSpacing: 1, fontFamily: SANS, fontWeight: 600,
          background: `${T.accent2}10`, border: `1px solid ${T.accent2}33`,
          color: T.accent2, cursor: "pointer", borderRadius: 6, whiteSpace: "nowrap",
        }}>PULL FROM TEAM</button>
      </div>

      {/* TOOLBAR */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.borderSub}`, padding: "6px 18px", display: "flex", alignItems: "center", gap: 8, background: T.input }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, letterSpacing: 1, color: T.textSec }}>GROUP</span>
          {([["none", "NONE"], ["status", "STATUS"], ["priority", "PRIORITY"], ["client", "CLIENT"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setGroupBy(v as GroupBy)} style={{
              padding: "3px 9px", fontSize: 9, letterSpacing: 0, fontFamily: SANS, cursor: "pointer", borderRadius: 6,
              background: groupBy === v ? `${T.accent}15` : "transparent",
              border: `1px solid ${groupBy === v ? `${T.accent}40` : T.borderSub}`,
              color: groupBy === v ? T.accent : T.textSec,
            }}>{l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 16, background: T.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, letterSpacing: 1, color: T.textSec }}>SORT</span>
          {([["priority", "PRIORITY"], ["status", "STATUS"], ["task", "A\u2013Z"], ["created", "NEWEST"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v as SortBy)} style={{
              padding: "3px 9px", fontSize: 9, letterSpacing: 0, fontFamily: SANS, cursor: "pointer", borderRadius: 6,
              background: sortBy === v ? `${T.accent}15` : "transparent",
              border: `1px solid ${sortBy === v ? `${T.accent}40` : T.borderSub}`,
              color: sortBy === v ? T.accent : T.textSec,
            }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 9, color: T.textSec, opacity: 0.6 }}>{personalTasks.length} tasks</div>
      </div>

      {/* TASK LIST */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
        {/* Column header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: T.bg, borderBottom: `1px solid ${T.borderSub}` }}>
          <div style={{ display: "grid", gridTemplateColumns: PERSONAL_GT, gap: 0, padding: "6px 14px 6px 10px" }}>
            {["", "TASK", "STATUS", "PRIORITY", "CLIENT", "DUE", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 8, letterSpacing: 1, color: T.textSec, fontFamily: MONO, fontWeight: 400, opacity: 0.6 }}>{h}</div>
            ))}
          </div>
        </div>

        {groups.map(g => (
          <div key={g.key} style={{ marginBottom: groupBy !== "none" ? 16 : 0 }}>
            {groupBy !== "none" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 0, padding: "4px 10px", background: `${g.color}08`, borderLeft: `2px solid ${g.color}`, borderBottom: `1px solid ${T.borderSub}` }}>
                <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: g.color, flex: 1 }}>{g.label}</div>
                <div style={{ fontSize: 9, color: T.textSec, fontFamily: SANS, background: `${T.text}08`, padding: "1px 7px", borderRadius: 10 }}>{g.tasks.length}</div>
              </div>
            )}

            {g.tasks.map(t => {
              const st = STATUS_CFG[t.status];
              const open = expandedId === t.id;
              const clientLabel = t.clientId ? clients.find(c => c.id === t.clientId)?.label : null;
              const isLinked = !!t.linkedTeamTaskId;

              if (confirmId === t.id) return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px 9px 10px", background: "rgba(212,114,114,0.05)", borderBottom: `1px solid ${T.borderSub}` }}>
                  <span style={{ fontSize: 11, color: "#d47272", fontFamily: SANS, flex: 1 }}>Delete &quot;{t.task.slice(0, 60)}&quot;?</span>
                  <button onClick={() => { onDelete(t.id); setConfirmId(null); setExpandedId(null); }} style={{ background: "rgba(212,114,114,0.15)", border: "1px solid rgba(212,114,114,0.4)", color: "#d47272", cursor: "pointer", fontSize: 9, padding: "3px 12px", borderRadius: 6, fontFamily: SANS }}>DELETE</button>
                  <button onClick={() => setConfirmId(null)} style={{ background: T.input, border: `1px solid ${T.borderSub}`, color: T.textSec, cursor: "pointer", fontSize: 9, padding: "3px 12px", borderRadius: 6, fontFamily: SANS }}>CANCEL</button>
                </div>
              );

              return (
                <div key={t.id} style={{ borderBottom: `1px solid ${T.borderSub}`, background: open ? `${T.accent}06` : "transparent" }}>
                  {/* ROW */}
                  <div style={{ display: "grid", gridTemplateColumns: PERSONAL_GT, alignItems: "center", padding: "0 14px 0 10px", minHeight: 38 }}
                    onMouseEnter={e => { if (!open) e.currentTarget.style.background = T.hover; }}
                    onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}>

                    {/* dot */}
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRI_COLOR[t.priority], flexShrink: 0, animation: t.priority === "FOCUS" ? "focusPulse 1.5s ease-in-out infinite" : undefined }} />

                    {/* TASK */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 0", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                      {isEdit(t.id, "task") ? (
                        <input autoFocus value={t.task}
                          onChange={e => onUpdate(t.id, "task", e.target.value)}
                          onBlur={stopEdit} onKeyDown={e => { if (e.key === "Enter") stopEdit(); }}
                          style={{ width: "100%", background: T.input, border: `1px solid ${T.accent}55`, color: T.text, padding: "3px 6px", fontSize: 13, fontFamily: SANS, borderRadius: 6, outline: "none", boxSizing: "border-box" }} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", flex: 1 }}>
                          <div title="Click to edit" onClick={() => setEditing({ taskId: t.id, field: "task" })}
                            style={{ fontSize: 13, fontFamily: SANS, fontWeight: 400, color: T.text, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text", borderRadius: 6, padding: "2px 4px", margin: "-2px -4px" }}
                            onMouseEnter={e => e.currentTarget.style.background = T.hover}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{t.task}</div>
                          {isLinked && (
                            <span title={`${t.linkDirection === "pushed" ? "Pushed to" : "Pulled from"} team`}
                              style={{ fontSize: 10, color: T.accent2, opacity: 0.7, flexShrink: 0 }}>
                              {t.linkDirection === "pushed" ? "\u2191" : "\u2193"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* STATUS */}
                    <div style={{ position: "relative", padding: "6px 8px 6px 0" }} onClick={e => e.stopPropagation()}>
                      <div title="Click to change" onClick={() => setEditing({ taskId: t.id, field: "status" })}
                        style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 9, fontFamily: MONO, fontWeight: 500, background: st?.bg, color: st?.color, border: `1px solid ${st?.border || "transparent"}`, whiteSpace: "nowrap", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}>{st?.label}</div>
                      {isEdit(t.id, "status") && (
                        <InlinePicker onClose={stopEdit} options={[...STATUSES]}
                          renderOption={(s: string) => {
                            const sc = STATUS_CFG[s];
                            return (
                              <div key={s} onClick={() => { onUpdate(t.id, "status", s); stopEdit(); }}
                                style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 9, fontFamily: MONO, color: t.status === s ? sc.color : T.textSec, background: t.status === s ? sc.bg : "transparent", border: t.status === s ? `1px solid ${sc.border || sc.color + "44"}` : "1px solid transparent" }}
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
                        style={{ fontSize: 11, fontFamily: SANS, fontWeight: 700, color: PRI_COLOR[t.priority], cursor: "pointer", borderRadius: 6, padding: "2px 4px", margin: "-2px -4px", letterSpacing: t.priority === "FOCUS" ? 0.5 : 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = T.hover}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{t.priority === "FOCUS" ? "\u25B6 FOCUS" : t.priority}</div>
                      {isEdit(t.id, "priority") && (
                        <InlinePicker onClose={stopEdit} options={[...PRIORITIES]}
                          renderOption={(p: string) => (
                            <div key={p} onClick={() => { onUpdate(t.id, "priority", p); stopEdit(); }}
                              style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: SANS, fontWeight: 700, color: PRI_COLOR[p], background: t.priority === p ? T.hover : "transparent" }}
                              onMouseEnter={e => e.currentTarget.style.background = T.hover}
                              onMouseLeave={e => e.currentTarget.style.background = t.priority === p ? T.hover : "transparent"}>
                              {p}
                            </div>
                          )}
                        />
                      )}
                    </div>

                    {/* CLIENT */}
                    <div style={{ fontSize: 10, fontFamily: SANS, color: clientLabel ? T.text : `${T.text}30`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "6px 8px 6px 0" }}>
                      {clientLabel || "\u2014"}
                    </div>

                    {/* DUE */}
                    <div style={{ position: "relative", padding: "6px 4px 6px 0" }} onClick={e => e.stopPropagation()}>
                      {isEdit(t.id, "due") ? (
                        <input autoFocus type="date" value={t.dueDate || ""} onChange={e => onUpdate(t.id, "dueDate", e.target.value || null)} onBlur={stopEdit}
                          style={{ background: "transparent", border: "none", color: T.accent, fontSize: 10, fontFamily: MONO, outline: "none", cursor: "pointer", width: 64 }} />
                      ) : (() => {
                        const today = new Date().toISOString().slice(0, 10);
                        const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                        const dueToday = t.dueDate === today;
                        return (
                          <div title="Click to set due date" onClick={() => setEditing({ taskId: t.id, field: "due" })}
                            style={{ fontSize: 10, fontFamily: MONO, color: overdue ? "#d47272" : dueToday ? "#d4a35c" : t.dueDate ? T.accent : `${T.text}18`, cursor: "pointer", borderRadius: 6, padding: "2px 3px", margin: "-2px -3px", fontWeight: (overdue || dueToday) ? 600 : 400 }}
                            onMouseEnter={e => e.currentTarget.style.background = T.hover}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            {t.dueDate ? (overdue ? "\u26A0 " : dueToday ? "\u25CF " : "") + t.dueDate.slice(5).replace("-", ".") : "\u2014"}
                          </div>
                        );
                      })()}
                    </div>

                    {/* DETAILS button */}
                    <button title="Task details" onClick={e => { e.stopPropagation(); setEditing(null); setExpandedId(open ? null : t.id); }}
                      style={{ background: open ? `${T.accent}20` : T.input, border: `1px solid ${open ? `${T.accent}55` : T.borderSub}`, color: open ? T.accent : T.textSec, cursor: "pointer", borderRadius: 6, fontSize: 11, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${T.accent}15`; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.background = open ? `${T.accent}20` : T.input; e.currentTarget.style.color = open ? T.accent : T.textSec; }}>{"\u229E"}</button>
                  </div>

                  {/* DETAIL PANEL */}
                  {open && (
                    <div style={{ padding: "12px 14px 14px 40px", borderTop: `1px solid ${T.border}`, background: `${T.accent}04` }}>
                      <div style={{ fontSize: 8, letterSpacing: 1, color: T.textSec, fontFamily: MONO, marginBottom: 5, opacity: 0.6 }}>NOTES</div>
                      <textarea value={t.notes || ""} onChange={e => onUpdate(t.id, "notes", e.target.value)} rows={2}
                        style={{ width: "100%", background: T.input, border: `1px solid ${T.borderSub}`, color: T.text, opacity: 0.8, padding: "6px 10px", fontSize: 11, fontFamily: SANS, borderRadius: 6, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                        placeholder="Context, links, blockers..." />

                      {/* Client picker */}
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 9, color: T.textSec, fontFamily: MONO }}>CLIENT:</span>
                          <select value={t.clientId || ""} onChange={e => onUpdate(t.id, "clientId", e.target.value || null)}
                            style={{ background: T.input, border: `1px solid ${T.borderSub}`, color: T.text, padding: "3px 6px", fontSize: 10, fontFamily: SANS, borderRadius: 6, outline: "none", cursor: "pointer" }}>
                            <option value="">&mdash; none</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        <div style={{ fontSize: 9, color: T.textSec, fontFamily: MONO }}>
                          DUE: <input type="date" value={t.dueDate || ""} onChange={e => onUpdate(t.id, "dueDate", e.target.value || null)}
                            style={{ background: "transparent", border: "none", color: T.accent, fontSize: 9, fontFamily: MONO, outline: "none", cursor: "pointer" }} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        {!isLinked && (
                          <div style={{ position: "relative" }}>
                            <button onClick={() => setPushingId(pushingId === t.id ? null : t.id)} style={{
                              background: `${T.accent2}10`, border: `1px solid ${T.accent2}30`, color: T.accent2,
                              cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 6, fontFamily: SANS, letterSpacing: 0.5,
                            }}>PUSH TO TEAM {"\u25B8"}</button>
                            {pushingId === t.id && (
                              <InlinePicker onClose={() => setPushingId(null)}
                                options={projectOptions}
                                renderOption={(opt: { id: string; label: string }) => (
                                  <div key={opt.id} onClick={() => { onPush(t.id, opt.id); setPushingId(null); }}
                                    style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: SANS, color: T.text }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.hover}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    {opt.label}
                                  </div>
                                )}
                              />
                            )}
                          </div>
                        )}
                        {isLinked && (
                          <button onClick={() => onUnlink(t.id)} style={{
                            background: "none", border: `1px solid ${T.borderSub}`, color: T.textSec,
                            cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 6, fontFamily: SANS,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.accent}55`; e.currentTarget.style.color = T.accent; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderSub; e.currentTarget.style.color = T.textSec; }}>UNLINK</button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button onClick={() => setConfirmId(t.id)} style={{
                          background: "none", border: "1px solid rgba(212,114,114,0.2)", color: "rgba(212,114,114,0.45)",
                          cursor: "pointer", fontSize: 9, padding: "4px 12px", borderRadius: 6, fontFamily: SANS, letterSpacing: 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,114,114,0.5)"; e.currentTarget.style.color = "#d47272"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,114,114,0.2)"; e.currentTarget.style.color = "rgba(212,114,114,0.45)"; }}>DELETE</button>
                      </div>

                      {isLinked && (
                        <div style={{ marginTop: 8, fontSize: 9, color: T.accent2, fontFamily: MONO, opacity: 0.6 }}>
                          {t.linkDirection === "pushed" ? "\u2191 Pushed to team" : "\u2193 Pulled from team"} &middot; {t.linkedTeamTaskId}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {personalTasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: T.textSec, fontSize: 12, fontFamily: SANS }}>
            No personal tasks yet. Type above to add one.
          </div>
        )}
      </div>

      {/* PULL FROM TEAM MODAL */}
      {showPull && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(3px)" }}
          onClick={() => setShowPull(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, width: 480, maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 0 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, letterSpacing: 3, color: T.accent2, marginBottom: 14 }}>PULL FROM TEAM</div>
            <div style={{ fontSize: 10, color: T.textSec, marginBottom: 14, fontFamily: SANS }}>Select a team task to add to your personal list. {pullableTeamTasks.length} available.</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {pullableTeamTasks.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: T.textSec, fontSize: 11, fontFamily: SANS }}>No unlinked team tasks available.</div>
              )}
              {pullableTeamTasks.map(tt => {
                const tst = STATUS_CFG[tt.status];
                return (
                  <div key={tt.id}
                    onClick={() => { onPull(tt.id, tt); setShowPull(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", border: `1px solid transparent` }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.hover; e.currentTarget.style.borderColor = `${T.accent2}33`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: PRI_COLOR[tt.priority], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, fontFamily: SANS, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tt.task}</div>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 8, fontFamily: MONO, background: tst?.bg, color: tst?.color, border: `1px solid ${tst?.border || "transparent"}`, whiteSpace: "nowrap" }}>{tst?.label}</span>
                    <span style={{ fontSize: 9, fontFamily: SANS, fontWeight: 700, color: PRI_COLOR[tt.priority] }}>{tt.priority}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowPull(false)} style={{ padding: "7px 14px", background: "none", border: `1px solid ${T.borderSub}`, color: T.textSec, cursor: "pointer", fontSize: 10, borderRadius: 6, fontFamily: SANS }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
