import React from "react";
import BoardTaskList from "./BoardTaskList";
import { DISCIPLINES, DISC_COLOR, PRI_COLOR, STATUS_CFG, STATUSES, BOARD_GT, SANS, MONO, T } from "../constants";
import type { Task, Client, Domain, TeamMember } from "../types";

const PRIORITIES_LIST = ["FOCUS", "CRITICAL", "HIGH", "NORMAL"] as const;
const PRI_ORDER: Record<string, number> = { FOCUS: 0, CRITICAL: 1, HIGH: 2, NORMAL: 3 };
const STAT_ORDER: Record<string, number> = { BLOCKED: 0, CRITICAL: 0, IN_PROGRESS: 1, OPEN: 2, WAITING: 3, DELEGATED: 4, PARKED: 5, DONE: 6 };

interface BoardViewProps {
  clients: Client[];
  domains: Domain[];
  team: TeamMember[];
  getT: (id: string) => Task[];
  updateTask: (pid: string, tid: string, field: string, value: unknown) => void;
  deleteTask: (pid: string, tid: string) => void;
  addTask: (pid: string) => void;
  bGroup: string;
  setBGroup: (v: string) => void;
  bSort: string;
  setBSort: (v: string) => void;
  bFiltP: string[];
  setBFiltP: (v: string[] | ((p: string[]) => string[])) => void;
  bFiltS: string[];
  setBFiltS: (v: string[] | ((p: string[]) => string[])) => void;
  bFiltA: string[];
  setBFiltA: (v: string[] | ((p: string[]) => string[])) => void;
  bFiltD: string[];
  setBFiltD: (v: string[] | ((p: string[]) => string[])) => void;
  bSearch: string;
  setBSearch: (v: string) => void;
  threatColor: Record<string, string>;
}

export default function BoardView({ clients, domains, team, getT, updateTask, deleteTask, addTask, bGroup, setBGroup, bSort, setBSort, bFiltP, setBFiltP, bFiltS, setBFiltS, bFiltA, setBFiltA, bFiltD, setBFiltD, bSearch, setBSearch, threatColor }: BoardViewProps) {
  // Build flat task list with project metadata
  let allTasks: Task[] = [
    ...domains.map(d => getT(d.id).map(t => ({ ...t, _pid: d.id, _plabel: d.label, _pcolor: d.color, _ptype: "domain" as const }))).flat(),
    ...clients.map(c => { const tc = threatColor[c.threat]; return getT(c.id).map(t => ({ ...t, _pid: c.id, _plabel: c.label, _pcolor: tc, _ptype: "client" as const })); }).flat(),
  ];

  // Apply filters
  if (bFiltP.length) allTasks = allTasks.filter(t => bFiltP.includes(t.priority));
  if (bFiltS.length) allTasks = allTasks.filter(t => bFiltS.includes(t.status));
  if (bFiltA.length) allTasks = allTasks.filter(t => bFiltA.includes(t.assignee || "__none__"));
  if (bFiltD.length) allTasks = allTasks.filter(t => (t.disciplines || []).some(d => bFiltD.includes(d)));
  if (bSearch.trim()) allTasks = allTasks.filter(t => t.task.toLowerCase().includes(bSearch.toLowerCase().trim()) || t._plabel?.toLowerCase().includes(bSearch.toLowerCase().trim()));

  // Sort
  const sortFns: Record<string, (a: Task, b: Task) => number> = {
    priority: (a, b) => (PRI_ORDER[a.priority] ?? 9) - (PRI_ORDER[b.priority] ?? 9),
    status: (a, b) => (STAT_ORDER[a.status] ?? 9) - (STAT_ORDER[b.status] ?? 9),
    task: (a, b) => a.task.localeCompare(b.task),
    assignee: (a, b) => (a.assignee || "zzz").localeCompare(b.assignee || "zzz"),
  };
  allTasks.sort(sortFns[bSort] || sortFns.priority);

  // Group
  let groups: { key: string; label: string; color: string; sub: string | null; tasks: Task[] }[] = [];
  if (bGroup === "project") {
    const seen: Record<string, { key: string; label: string; color: string; sub: string | null }> = {};
    [...domains.map(d => ({ key: d.id, label: d.label, color: d.color, sub: d.sub })), ...clients.map(c => ({ key: c.id, label: c.label, color: threatColor[c.threat], sub: null }))].forEach(p => { seen[p.key] = p; });
    groups = Object.values(seen).map(p => ({ ...p, tasks: allTasks.filter(t => t._pid === p.key) })).filter(g => g.tasks.length > 0 || (!bFiltP.length && !bFiltS.length && !bFiltA.length && !bFiltD.length));
  } else if (bGroup === "priority") {
    groups = PRIORITIES_LIST.map(p => ({ key: p, label: p, color: PRI_COLOR[p], sub: null, tasks: allTasks.filter(t => t.priority === p) }));
  } else if (bGroup === "status") {
    groups = [...STATUSES].map(s => ({ key: s, label: STATUS_CFG[s]?.label || s, color: STATUS_CFG[s]?.color || "#888", sub: null, tasks: allTasks.filter(t => t.status === s) })).filter(g => g.tasks.length > 0);
  } else if (bGroup === "assignee") {
    const aIds = [...new Set(allTasks.map(t => t.assignee || "__none__"))];
    groups = aIds.map(aid => { const m = team.find(x => x.id === aid); return { key: aid, label: m ? m.name : "Unassigned", color: m ? m.color : T.textSec, sub: null, tasks: allTasks.filter(t => (t.assignee || "__none__") === aid) }; });
  } else if (bGroup === "discipline") {
    groups = DISCIPLINES.map(d => ({ key: d, label: d, color: DISC_COLOR[d], sub: null, tasks: allTasks.filter(t => (t.disciplines || []).includes(d)) })).filter(g => g.tasks.length > 0);
  }

  const toggleFilter = (arr: string[], setArr: (v: string[] | ((p: string[]) => string[])) => void, val: string) => setArr((p: string[]) => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
  const activeFilters = bFiltP.length + bFiltS.length + bFiltA.length + bFiltD.length + (bSearch ? 1 : 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* TOOLBAR */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.borderSub}`, padding: "9px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: T.surface }}>
        {/* SEARCH */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 8, fontSize: 11, color: T.textSec, pointerEvents: "none", opacity: 0.5 }}>{"\u2315"}</span>
          <input value={bSearch} onChange={e => setBSearch(e.target.value)} placeholder="Search tasks\u2026"
            style={{ paddingLeft: 24, paddingRight: bSearch ? 24 : 8, paddingTop: 4, paddingBottom: 4, background: T.input, border: `1px solid ${T.borderSub}`, borderRadius: 6, color: T.text, fontSize: 11, fontFamily: SANS, outline: "none", width: 180, transition: "border 0.15s" }}
            onFocus={e => e.target.style.borderColor = `${T.accent}55`}
            onBlur={e => e.target.style.borderColor = T.borderSub} />
          {bSearch && <span onClick={() => setBSearch("")} style={{ position: "absolute", right: 7, fontSize: 12, color: T.textSec, cursor: "pointer", lineHeight: 1 }}>{"\u2715"}</span>}
        </div>
        <div style={{ width: 1, height: 18, background: T.border }} />
        {/* GROUP BY */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, letterSpacing: 1, color: T.textSec }}>GROUP</span>
          {([["project", "PROJECT"], ["priority", "PRIORITY"], ["status", "STATUS"], ["assignee", "ASSIGNEE"], ["discipline", "DISCIPLINE"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setBGroup(v)} style={{ padding: "3px 9px", fontSize: 9, letterSpacing: 0, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bGroup === v ? `${T.accent}15` : "transparent", border: `1px solid ${bGroup === v ? `${T.accent}40` : T.borderSub}`, color: bGroup === v ? T.accent : T.textSec }}>{l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: T.border }} />
        {/* SORT BY */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, letterSpacing: 1, color: T.textSec }}>SORT</span>
          {([["priority", "PRIORITY"], ["status", "STATUS"], ["task", "A\u2013Z"], ["assignee", "ASSIGNEE"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setBSort(v)} style={{ padding: "3px 9px", fontSize: 9, letterSpacing: 0, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bSort === v ? `${T.accent}15` : "transparent", border: `1px solid ${bSort === v ? `${T.accent}40` : T.borderSub}`, color: bSort === v ? T.accent : T.textSec }}>{l}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: T.border }} />
        {/* FILTER: priority */}
        {PRIORITIES_LIST.map(p => (
          <button key={p} onClick={() => toggleFilter(bFiltP, setBFiltP, p)} style={{ padding: "3px 9px", fontSize: 9, letterSpacing: 0, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bFiltP.includes(p) ? `${PRI_COLOR[p]}20` : "transparent", border: `1px solid ${bFiltP.includes(p) ? PRI_COLOR[p] + "55" : T.borderSub}`, color: bFiltP.includes(p) ? PRI_COLOR[p] : T.textSec }}>{p}</button>
        ))}
        <div style={{ width: 1, height: 18, background: T.border }} />
        {/* FILTER: status */}
        {STATUSES.map(s => (
          <button key={s} onClick={() => toggleFilter(bFiltS, setBFiltS, s)} style={{ padding: "3px 9px", fontSize: 9, letterSpacing: 0, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bFiltS.includes(s) ? `${STATUS_CFG[s]?.color}20` : "transparent", border: `1px solid ${bFiltS.includes(s) ? STATUS_CFG[s]?.color + "55" : T.borderSub}`, color: bFiltS.includes(s) ? STATUS_CFG[s]?.color : T.textSec }}>{STATUS_CFG[s]?.label || s}</button>
        ))}
        {activeFilters > 0 && <button onClick={() => { setBFiltP([]); setBFiltS([]); setBFiltA([]); setBFiltD([]); setBSearch(""); }} style={{ padding: "3px 9px", fontSize: 8, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: "rgba(212,114,114,0.1)", border: "1px solid rgba(212,114,114,0.3)", color: "#d47272", letterSpacing: 1 }}>{"\u2715"} CLEAR {activeFilters}</button>}
      </div>

      {/* DISCIPLINE + ASSIGNEE FILTER ROW */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.borderSub}`, padding: "6px 18px", display: "flex", alignItems: "center", gap: 8, background: T.input }}>
        <span style={{ fontSize: 9, letterSpacing: 1, color: T.textSec }}>FILTER</span>
        {DISCIPLINES.map(d => (
          <button key={d} onClick={() => toggleFilter(bFiltD, setBFiltD, d)} style={{ padding: "2px 8px", fontSize: 8, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bFiltD.includes(d) ? `${DISC_COLOR[d]}20` : "transparent", border: `1px solid ${bFiltD.includes(d) ? DISC_COLOR[d] + "55" : T.borderSub}`, color: bFiltD.includes(d) ? DISC_COLOR[d] : T.textSec }}>{d}</button>
        ))}
        <div style={{ width: 1, height: 16, background: T.border }} />
        {team.map(m => (
          <button key={m.id} onClick={() => toggleFilter(bFiltA, setBFiltA, m.id)} style={{ padding: "2px 8px", fontSize: 8, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bFiltA.includes(m.id) ? `${m.color}20` : "transparent", border: `1px solid ${bFiltA.includes(m.id) ? m.color + "55" : T.borderSub}`, color: bFiltA.includes(m.id) ? m.color : T.textSec }}>{m.name}</button>
        ))}
        <button onClick={() => toggleFilter(bFiltA, setBFiltA, "__none__")} style={{ padding: "2px 8px", fontSize: 8, fontFamily: SANS, cursor: "pointer", borderRadius: 6, background: bFiltA.includes("__none__") ? `${T.text}15` : "transparent", border: `1px solid ${bFiltA.includes("__none__") ? `${T.text}33` : T.borderSub}`, color: bFiltA.includes("__none__") ? T.text : T.textSec }}>Unassigned</button>
        <div style={{ marginLeft: "auto", fontSize: 9, color: T.textSec, opacity: 0.6 }}>{allTasks.length} tasks</div>
      </div>

      {/* TABLE */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
        {/* Sticky column header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: T.bg, borderBottom: `1px solid ${T.borderSub}`, marginBottom: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: BOARD_GT, gap: 0, padding: "6px 14px 6px 10px" }}>
            {["", "CAT", "PROJ / ITEM", "TASK / CONTEXT", "ASSIGNEE", "STATUS", "PRIORITY", "DUE", "\u229E"].map((h, i) => (
              <div key={i} style={{ fontSize: 8, letterSpacing: 1, color: T.textSec, fontFamily: MONO, fontWeight: 400, opacity: 0.6 }}>{h}</div>
            ))}
          </div>
        </div>
        {groups.map(g => (
          <div key={g.key} style={{ marginBottom: 16 }}>
            {bGroup !== "project" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 0, padding: "4px 10px", background: `${g.color}08`, borderLeft: `2px solid ${g.color}`, borderBottom: `1px solid ${T.borderSub}` }}>
                <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: g.color, flex: 1 }}>{g.label.toUpperCase()}</div>
                {g.sub && <div style={{ fontSize: 9, color: T.textSec, fontFamily: SANS }}>{g.sub}</div>}
                <div style={{ fontSize: 9, color: T.textSec, fontFamily: SANS, background: `${T.text}08`, padding: "1px 7px", borderRadius: 10 }}>{g.tasks.length}</div>
              </div>
            )}
            {g.tasks.length === 0
              ? <div style={{ fontSize: 9, color: T.textSec, paddingLeft: 10, paddingTop: 6, fontFamily: SANS }}>No tasks</div>
              : <BoardTaskList tasks={g.tasks} projectId={g.key} onUpdate={updateTask} onDelete={deleteTask} onAdd={addTask} team={team} />
            }
          </div>
        ))}
      </div>
    </div>
  );
}
