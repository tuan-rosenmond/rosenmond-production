import React, { useState, useRef, useEffect } from "react";

interface ChatMsg {
  role: "user" | "sys";
  text: string;
}

interface CmdTabProps {
  loading: boolean;
  sendCmd: (message: string) => Promise<{ message: string; changes: Record<string, number> }>;
}

export default function CmdTab({ loading, sendCmd }: CmdTabProps) {
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([{ role: "sys", text: "ROSENMOND HQ \u2014 Online." }]);
  const [cmdInput, setCmdInput] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  const handleSend = async () => {
    if (!cmdInput.trim() || loading) return;
    const msg = cmdInput.trim();
    setCmdInput("");
    setChatMsgs(p => [...p, { role: "user", text: msg }]);
    const data = await sendCmd(msg);
    const summary = Object.entries(data.changes || {}).map(([k, v]) => `${v} ${k}`).join(" \u00B7 ");
    setChatMsgs(p => [...p, { role: "sys", text: data.message + (summary ? `\n\n${summary}` : "") }]);
  };

  return (
    <>
      <div style={{ flexShrink: 0, padding: "7px 8px", borderBottom: "1px solid rgba(123,104,238,0.07)", background: "rgba(123,104,238,0.03)" }}>
        <div style={{ fontSize: 7, letterSpacing: 1, color: "#7B68EE", marginBottom: 2 }}>{"\u2318"} OPS PROTOCOL</div>
        <div style={{ fontSize: 9, fontFamily: "'Inter',sans-serif", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>Talk freely. I'll update tasks, statuses, priorities + client threat levels.</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
        {chatMsgs.map((msg, i) => (
          <div key={i} style={{ fontSize: 10, fontFamily: "'Inter',sans-serif", lineHeight: 1.6, color: msg.role === "user" ? "#c8d8e8" : "#5a9abb", borderLeft: `2px solid ${msg.role === "user" ? "rgba(123,104,238,0.55)" : "rgba(123,104,238,0.15)"}`, paddingLeft: 7, whiteSpace: "pre-wrap" }}>
            <div style={{ fontSize: 6, letterSpacing: 1, color: msg.role === "user" ? "rgba(123,104,238,0.65)" : "#3a6a8a", marginBottom: 2 }}>{msg.role === "user" ? "TUAN" : "HQ"}</div>
            {msg.text}
          </div>
        ))}
        {loading && <div style={{ fontSize: 9, color: "#4a7a9a", borderLeft: "2px solid rgba(123,104,238,0.12)", paddingLeft: 7 }}>
          <div style={{ fontSize: 6, letterSpacing: 1, color: "#3a6a8a", marginBottom: 2 }}>HQ</div>
          <span style={{ animation: "blink 0.7s infinite" }}>updating board_</span>
        </div>}
        <div ref={chatEnd} />
      </div>
      <div style={{ padding: "7px 8px", borderTop: "1px solid rgba(123,104,238,0.08)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5 }}>
          <input value={cmdInput} onChange={e => setCmdInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="speak or type your update..."
            style={{ flex: 1, background: "rgba(123,104,238,0.05)", border: "1px solid rgba(123,104,238,0.15)", color: "#c8d8e8", padding: "7px 9px", fontSize: 10, fontFamily: "'Inter',sans-serif", borderRadius: 3 }} />
          <button onClick={handleSend} disabled={loading} style={{ padding: "7px 10px", background: "rgba(123,104,238,0.08)", border: "1px solid rgba(123,104,238,0.2)", color: "#7B68EE", cursor: "pointer", fontSize: 11, borderRadius: 3, fontFamily: "inherit", flexShrink: 0 }}>{"\u25B6"}</button>
        </div>
        <div style={{ marginTop: 5, fontSize: 7, color: "#2a4a6a", letterSpacing: 1 }}>BOARD UPDATES APPLY LIVE {"\u00B7"} AUTO-SAVED</div>
      </div>
    </>
  );
}
