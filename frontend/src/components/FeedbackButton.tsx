import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { T, SANS, MONO } from "../constants";

type FeedbackType = "bug" | "idea" | "tweak";
const TYPES: { key: FeedbackType; label: string; color: string }[] = [
  { key: "bug",   label: "BUG",   color: "#d47272" },
  { key: "tweak", label: "TWEAK", color: "#d4a35c" },
  { key: "idea",  label: "IDEA",  color: "#5bbf8e" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("tweak");
  const [note, setNote] = useState("");
  const [page, setPage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "feedback"), {
      type,
      note: trimmed,
      page: page.trim() || null,
      view: document.title,
      url: window.location.href,
      ts: serverTimestamp(),
    });
    setNote("");
    setPage("");
    setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); }, 1200);
  };

  return (
    <>
      {/* Floating trigger */}
      <button onClick={() => setOpen(true)} style={{
        position: "fixed", bottom: 18, right: 320, zIndex: 200,
        width: 32, height: 32, borderRadius: "50%",
        background: T.surface, border: `1px solid ${T.borderSub}`,
        color: T.textSec, cursor: "pointer", fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.accent}55`; e.currentTarget.style.color = T.accent; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderSub; e.currentTarget.style.color = T.textSec; }}
      title="Send feedback"
      >{"\u270E"}</button>

      {/* Modal */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(2px)" }}
          onClick={() => { if (!sent) setOpen(false); }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: 22, width: 380, boxShadow: "0 0 50px rgba(0,0,0,0.5)",
          }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "#5bbf8e", fontFamily: SANS, fontWeight: 600, letterSpacing: 1 }}>
                NOTED.
              </div>
            ) : (
              <>
                <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: 3, color: T.textSec, marginBottom: 14 }}>FEEDBACK</div>

                {/* Type chips */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {TYPES.map(t => (
                    <button key={t.key} onClick={() => setType(t.key)} style={{
                      padding: "4px 12px", fontSize: 9, letterSpacing: 1, fontFamily: MONO, fontWeight: 600,
                      background: type === t.key ? `${t.color}18` : "transparent",
                      border: `1px solid ${type === t.key ? `${t.color}55` : T.borderSub}`,
                      color: type === t.key ? t.color : T.textSec,
                      cursor: "pointer", borderRadius: 6,
                    }}>{t.label}</button>
                  ))}
                </div>

                {/* Note */}
                <textarea autoFocus value={note} onChange={e => setNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) submit(); }}
                  placeholder="What needs fixing or improving..."
                  rows={4} style={{
                    width: "100%", background: T.input, border: `1px solid ${T.borderSub}`,
                    color: T.text, padding: "8px 10px", fontSize: 12, fontFamily: SANS,
                    borderRadius: 6, outline: "none", resize: "vertical", boxSizing: "border-box",
                    lineHeight: 1.6,
                  }}
                  onFocus={e => e.target.style.borderColor = `${T.accent}44`}
                  onBlur={e => e.target.style.borderColor = T.borderSub} />

                {/* Where (optional) */}
                <input value={page} onChange={e => setPage(e.target.value)}
                  placeholder="Where? (e.g. Board toolbar, Map zoom) — optional"
                  style={{
                    width: "100%", marginTop: 8, background: T.input, border: `1px solid ${T.borderSub}`,
                    color: T.text, padding: "6px 10px", fontSize: 10, fontFamily: SANS,
                    borderRadius: 6, outline: "none", boxSizing: "border-box",
                  }} />

                {/* Actions */}
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: T.textSec, fontFamily: MONO, opacity: 0.5 }}>CMD+ENTER to send</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setOpen(false)} style={{ padding: "6px 14px", background: "none", border: `1px solid ${T.borderSub}`, color: T.textSec, cursor: "pointer", fontSize: 10, borderRadius: 6, fontFamily: SANS }}>CANCEL</button>
                    <button onClick={submit} disabled={!note.trim()} style={{
                      padding: "6px 16px", background: note.trim() ? `${T.accent}15` : "transparent",
                      border: `1px solid ${note.trim() ? `${T.accent}44` : T.borderSub}`,
                      color: note.trim() ? T.accent : T.textSec, cursor: note.trim() ? "pointer" : "default",
                      fontSize: 10, borderRadius: 6, fontFamily: SANS, letterSpacing: 1,
                    }}>SEND</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
