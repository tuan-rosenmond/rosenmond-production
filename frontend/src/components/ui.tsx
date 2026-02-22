import React, { useState, useRef, useEffect } from "react";
import { DISCIPLINES, DISC_COLOR, PRI_COLOR, STATUS_CFG, STATUSES, PRIORITIES, SANS, THREAT_COLOR } from "../constants";
import type { TeamMember } from "../types";

// ─── FL: Field Label ──────────────────────────────────────────────────────

export function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, letterSpacing: 3, color: "#5a9abb", marginBottom: 6 }}>{children}</div>;
}

// ─── InlinePicker ─────────────────────────────────────────────────────────

export function InlinePicker<T>({ options, renderOption, onClose }: {
  options: T[];
  renderOption: (o: T) => React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);
  return (
    <div ref={ref} style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, marginTop: 3,
      background: "#1C1E26", border: "1px solid #292D3E", borderRadius: 4,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: "4px", minWidth: 130, display: "flex", flexDirection: "column", gap: 2 }}>
      {options.map(renderOption)}
    </div>
  );
}

// ─── EditCell ─────────────────────────────────────────────────────────────

export function EditCell({ value, type, options, onChange, team }: {
  value: unknown;
  type: "text" | "status" | "priority" | "assignee" | "disciplines";
  options?: string[];
  onChange: (v: unknown) => void;
  team?: TeamMember[];
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);
  const commit = (v?: unknown) => { onChange(v ?? val); setEditing(false); };

  if (!editing) {
    if (type === "status") {
      const s = STATUS_CFG[val as string];
      return <span onClick={() => setEditing(true)} style={{ padding: "2px 8px", borderRadius: 2, fontSize: 10, letterSpacing: 1, background: s?.bg, color: s?.color, cursor: "pointer", whiteSpace: "nowrap" }}>{s?.label || (val as string)}</span>;
    }
    if (type === "priority") {
      return <span onClick={() => setEditing(true)} style={{ padding: "2px 8px", borderRadius: 2, fontSize: 10, background: `${PRI_COLOR[val as string]}15`, color: PRI_COLOR[val as string], cursor: "pointer" }}>{val as string}</span>;
    }
    if (type === "assignee") {
      const m = team?.find(t => t.id === val);
      return (
        <div onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          {m
            ? <><div style={{ width: 16, height: 16, borderRadius: 3, background: `${m.color}18`, border: `1px solid ${m.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: m.color, fontWeight: "bold" }}>{m.avatar}</div><span style={{ fontSize: 12, opacity: 0.9 }}>{m.name}</span></>
            : <span style={{ fontSize: 11, color: "#5a9abb" }}>— assign</span>}
        </div>
      );
    }
    if (type === "disciplines") {
      const cur = (val as string[]) || [];
      return (
        <div onClick={() => setEditing(true)} style={{ display: "flex", gap: 3, flexWrap: "wrap", cursor: "pointer", minWidth: 60 }}>
          {cur.length === 0 && <span style={{ fontSize: 11, color: "#5a9abb" }}>+ disc</span>}
          {cur.map(d => <span key={d} style={{ padding: "1px 5px", borderRadius: 2, fontSize: 9, background: `${DISC_COLOR[d]}18`, color: DISC_COLOR[d], border: `1px solid ${DISC_COLOR[d]}44` }}>{d}</span>)}
        </div>
      );
    }
    return <span onClick={() => setEditing(true)} style={{ cursor: "pointer", opacity: 0.9, fontSize: 13 }}>{(val as string) || <span style={{ opacity: 0.3 }}>—</span>}</span>;
  }

  if (type === "text") return (
    <input ref={ref as React.RefObject<HTMLInputElement>} value={val as string} onChange={e => setVal(e.target.value)}
      onBlur={() => commit()} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      style={{ background: "rgba(123,104,238,0.09)", border: "1px solid rgba(123,104,238,0.45)", color: "#c8d8e8", padding: "3px 6px", fontSize: 13, fontFamily: "inherit", borderRadius: 3, width: "100%", outline: "none" }} />
  );

  if (type === "disciplines") {
    const cur = (val as string[]) || [];
    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "2px 0" }}>
        {DISCIPLINES.map(d => {
          const on = cur.includes(d);
          return <span key={d} onClick={() => commit(on ? cur.filter(x => x !== d) : [...cur, d])}
            style={{ padding: "2px 7px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: on ? `${DISC_COLOR[d]}25` : "rgba(255,255,255,0.06)", color: on ? DISC_COLOR[d] : "#7aaabb", border: `1px solid ${on ? DISC_COLOR[d] + "55" : "rgba(255,255,255,0.12)"}` }}>{d}</span>;
        })}
        <span onClick={() => setEditing(false)} style={{ padding: "2px 7px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: "rgba(123,104,238,0.09)", color: "#7B68EE", border: "1px solid rgba(123,104,238,0.3)" }}>✓</span>
      </div>
    );
  }

  return (
    <select ref={ref as React.RefObject<HTMLSelectElement>} value={val as string} onChange={e => commit(e.target.value)} onBlur={() => setEditing(false)}
      style={{ background: "#060f20", border: "1px solid rgba(123,104,238,0.45)", color: "#c8d8e8", padding: "3px 6px", fontSize: 10, fontFamily: "inherit", borderRadius: 3, outline: "none", cursor: "pointer" }}>
      {type === "assignee" && <option value="">— unassigned</option>}
      {(type === "assignee"
        ? (team || []).map(m => ({ id: m.id, label: m.name }))
        : (options || (type === "status" ? [...STATUSES] : [...PRIORITIES])).map(o => ({ id: o, label: STATUS_CFG[o]?.label || o }))
      ).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

// ─── AddClientModal ───────────────────────────────────────────────────────

export function AddClientModal({ onAdd, onClose, team }: {
  onAdd: (cl: { id: string; label: string; x: number; y: number; threat: string; disciplines: string[]; lead: string | null; lead2: string | null }) => void;
  onClose: () => void;
  team: TeamMember[];
}) {
  const [name, setName] = useState("");
  const [threat, setThreat] = useState("NORMAL");
  const [discs, setDiscs] = useState<string[]>([]);
  const [lead, setLead] = useState("");
  const [spec, setSpec] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: name.toLowerCase().replace(/\s+/g, "_") + Date.now(), label: name.trim(), x: 45 + Math.random() * 15, y: 20 + Math.random() * 25, threat, disciplines: discs, lead: lead || null, lead2: spec || null });
    onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(3px)" }}>
      <div style={{ background: "#040c1e", border: "1px solid rgba(123,104,238,0.3)", borderRadius: 6, padding: 24, width: 360, boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}>
        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 3, color: "#7B68EE", marginBottom: 18 }}>NEW CLIENT</div>
        <FL>CLIENT NAME</FL>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} autoFocus placeholder="e.g. Dermaflora"
          style={{ width: "100%", background: "rgba(123,104,238,0.06)", border: "1px solid rgba(123,104,238,0.3)", color: "#c8d8e8", padding: "8px 10px", fontSize: 12, fontFamily: "inherit", borderRadius: 3, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
        <FL>STATUS</FL>
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {(["NORMAL", "HIGH", "CRITICAL", "IN_PROGRESS"] as const).map(t => (
            <span key={t} onClick={() => setThreat(t)} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: threat === t ? `${THREAT_COLOR[t]}20` : "rgba(255,255,255,0.05)", color: threat === t ? THREAT_COLOR[t] : "#7a9aaa", border: `1px solid ${threat === t ? THREAT_COLOR[t] + "55" : "rgba(255,255,255,0.08)"}` }}>{t}</span>
          ))}
        </div>
        <FL>DISCIPLINES</FL>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
          {DISCIPLINES.map(d => (
            <span key={d} onClick={() => setDiscs(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} style={{ padding: "3px 9px", borderRadius: 2, fontSize: 8, cursor: "pointer", background: discs.includes(d) ? `${DISC_COLOR[d]}20` : "rgba(255,255,255,0.05)", color: discs.includes(d) ? DISC_COLOR[d] : "#7a9aaa", border: `1px solid ${discs.includes(d) ? DISC_COLOR[d] + "55" : "rgba(255,255,255,0.08)"}` }}>{d}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div><FL>LEAD 1 (PM)</FL>
            <select value={lead} onChange={e => setLead(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(123,104,238,0.22)", color: "#8899aa", padding: "6px 8px", fontSize: 10, fontFamily: "inherit", borderRadius: 3, outline: "none", boxSizing: "border-box" }}>
              <option value="">— assign</option>{team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></div>
          <div><FL>LEAD 2</FL>
            <select value={spec} onChange={e => setSpec(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(123,104,238,0.22)", color: "#8899aa", padding: "6px 8px", fontSize: 10, fontFamily: "inherit", borderRadius: 3, outline: "none", boxSizing: "border-box" }}>
              <option value="">— assign</option>{team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#6a9aaa", cursor: "pointer", fontSize: 10, borderRadius: 3, fontFamily: "inherit" }}>CANCEL</button>
          <button onClick={submit} style={{ padding: "7px 18px", background: "rgba(123,104,238,0.12)", border: "1px solid rgba(123,104,238,0.4)", color: "#7B68EE", cursor: "pointer", fontSize: 10, borderRadius: 3, fontFamily: "inherit", letterSpacing: 1 }}>DEPLOY</button>
        </div>
      </div>
    </div>
  );
}

// ─── AddOperative ─────────────────────────────────────────────────────────

export function AddOperative({ onAdd }: { onAdd: (m: TeamMember) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [color, setColor] = useState("#7B68EE");
  const COLORS = ["#7B68EE", "#f472b6", "#a78bfa", "#34d399", "#fb923c", "#fbbf24", "#f87171", "#38bdf8", "#4ade80", "#e879a0"];
  const submit = () => {
    if (!name.trim()) return;
    const av = name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    onAdd({ id: name.trim().toLowerCase().replace(/\s+/g, "_") + Date.now(), name: name.trim(), role: role || "Operative", color, avatar: av, disciplines: [], active: true });
    setName(""); setRole(""); setColor("#7B68EE"); setOpen(false);
  };
  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ width: "100%", marginTop: 10, padding: "7px", background: "rgba(123,104,238,0.04)", border: "1px dashed rgba(123,104,238,0.18)", color: "rgba(123,104,238,0.7)", cursor: "pointer", fontSize: 8, borderRadius: 3, fontFamily: "inherit", letterSpacing: 2 }}>+ ADD OPERATIVE</button>
  );
  return (
    <div style={{ marginTop: 10, padding: "12px 10px", background: "rgba(123,104,238,0.04)", border: "1px solid rgba(123,104,238,0.15)", borderRadius: 4 }}>
      <div style={{ fontSize: 7, letterSpacing: 1, color: "#5a9abb", marginBottom: 8 }}>NEW OPERATIVE</div>
      <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Full name" autoFocus
        style={{ width: "100%", background: "rgba(123,104,238,0.07)", border: "1px solid rgba(123,104,238,0.22)", color: "#c8d8e8", padding: "6px 8px", fontSize: 12, fontFamily: "inherit", borderRadius: 3, boxSizing: "border-box", marginBottom: 8 }} />
      <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (e.g. Designer)"
        style={{ width: "100%", background: "rgba(123,104,238,0.07)", border: "1px solid rgba(123,104,238,0.22)", color: "#c8d8e8", padding: "6px 8px", fontSize: 10, fontFamily: "inherit", borderRadius: 3, boxSizing: "border-box", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {COLORS.map(c => (
          <div key={c} onClick={() => setColor(c)} style={{ width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer", border: `2px solid ${color === c ? "#fff" : "transparent"}`, boxSizing: "border-box" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "5px", background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#5a7a9a", cursor: "pointer", fontSize: 9, borderRadius: 3, fontFamily: "inherit" }}>CANCEL</button>
        <button onClick={submit} style={{ flex: 1, padding: "5px", background: "rgba(123,104,238,0.09)", border: "1px solid rgba(123,104,238,0.3)", color: "#7B68EE", cursor: "pointer", fontSize: 9, borderRadius: 3, fontFamily: "inherit", letterSpacing: 1 }}>DEPLOY</button>
      </div>
    </div>
  );
}
