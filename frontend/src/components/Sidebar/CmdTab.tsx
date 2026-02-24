import React, { useState, useRef, useEffect } from "react";
import { T, SERIF, SANS } from "../../constants";

interface ChatMsg {
  role: "user" | "sys";
  text: string;
}

interface CmdTabProps {
  loading: boolean;
  sendCmd: (message: string) => Promise<{ message: string; changes: Record<string, number> }>;
}

export default function CmdTab({ loading, sendCmd }: CmdTabProps) {
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([{ role: "sys", text: "Ready to help. Tell me what needs updating." }]);
  const [cmdInput, setCmdInput] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
      textareaRef.current.style.height = Math.max(52, textareaRef.current.scrollHeight) + "px";
    }
  }, [cmdInput]);

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
      {/* Header */}
      <div style={{ flexShrink: 0, padding: "14px 16px", borderBottom: `1px solid ${T.borderSub}`, background: T.surface }}>
        <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 600, letterSpacing: 1, color: T.accent, marginBottom: 4 }}>COMMAND</div>
        <div style={{ fontSize: 14, fontFamily: SERIF, color: T.textSec, lineHeight: 1.6 }}>Talk freely. I'll update tasks, statuses, priorities + client threat levels.</div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        {chatMsgs.map((msg, i) => (
          <div key={i} style={{
            fontSize: 16,
            fontFamily: SERIF,
            lineHeight: 1.75,
            color: msg.role === "user" ? T.text : T.textSec,
            background: msg.role === "user" ? T.userBub : "transparent",
            padding: msg.role === "user" ? "14px 16px" : "0",
            borderRadius: msg.role === "user" ? 10 : 0,
            whiteSpace: "pre-wrap",
          }}>
            <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 600, letterSpacing: 1, color: msg.role === "user" ? T.accent : T.textSec, marginBottom: 6, opacity: 0.7 }}>{msg.role === "user" ? "YOU" : "ROSENMOND"}</div>
            {msg.text}
          </div>
        ))}
        {loading && <div style={{ fontSize: 16, fontFamily: SERIF, color: T.textSec, padding: 0 }}>
          <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 600, letterSpacing: 1, color: T.textSec, marginBottom: 6, opacity: 0.7 }}>ROSENMOND</div>
          <span style={{ animation: "blink 0.7s infinite", opacity: 0.5 }}>thinking...</span>
        </div>}
        <div ref={chatEnd} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.borderSub}`, flexShrink: 0, background: T.surface }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={cmdInput}
            onChange={e => setCmdInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type your update..."
            style={{
              flex: 1,
              background: T.input,
              border: `1px solid ${T.borderSub}`,
              color: T.text,
              padding: "14px 16px",
              fontSize: 16,
              fontFamily: SERIF,
              lineHeight: 1.75,
              borderRadius: 10,
              resize: "none",
              overflow: "hidden",
              minHeight: 52,
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = T.cmdAccent; e.target.style.boxShadow = `0 0 0 2px rgba(218,119,86,0.2)`; }}
            onBlur={e => { e.target.style.borderColor = T.borderSub; e.target.style.boxShadow = "none"; }}
          />
          <button onClick={handleSend} disabled={loading} style={{
            padding: "14px 20px",
            background: T.cmdAccent,
            border: "none",
            color: "#fff",
            cursor: loading ? "default" : "pointer",
            fontSize: 15,
            borderRadius: 10,
            fontFamily: SANS,
            fontWeight: 600,
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
            transition: "opacity 0.15s",
            minHeight: 52,
          }}>{"\u25B6"}</button>
        </div>
      </div>
    </>
  );
}
