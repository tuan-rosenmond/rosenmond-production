import React from "react";
import { T, SANS } from "../constants";

interface LoginScreenProps {
  error: string | null;
  onLogin: () => void;
}

export default function LoginScreen({ error, onLogin }: LoginScreenProps) {
  return (
    <div style={{
      fontFamily: SANS,
      background: T.bg,
      color: T.text,
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 24,
      userSelect: "none",
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage:
          `radial-gradient(circle at 50% 50%, ${T.accent}08 0%, transparent 70%),` +
          `linear-gradient(${T.accent}06 1px, transparent 1px),` +
          `linear-gradient(90deg, ${T.accent}06 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 40px 40px, 40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 13, letterSpacing: 6, color: T.accent, marginBottom: 10, fontWeight: 600 }}>
          ROSENMOND
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: 2, marginBottom: 6 }}>
          WARBOARD
        </div>
        <div style={{ fontSize: 13, color: T.textSec, letterSpacing: 2, marginBottom: 48 }}>
          TACTICAL OPERATIONS CENTER
        </div>

        <button
          onClick={onLogin}
          style={{
            background: `${T.accent}18`,
            border: `1px solid ${T.accent}44`,
            color: T.accent,
            padding: "14px 32px",
            fontSize: 13,
            letterSpacing: 2,
            fontFamily: SANS,
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 6,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${T.accent}28`;
            e.currentTarget.style.borderColor = `${T.accent}66`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = `${T.accent}18`;
            e.currentTarget.style.borderColor = `${T.accent}44`;
          }}
        >
          AUTHENTICATE WITH GOOGLE
        </button>

        {error && (
          <div style={{
            marginTop: 18,
            padding: "12px 18px",
            background: "rgba(212,92,92,0.08)",
            border: "1px solid rgba(212,92,92,0.25)",
            color: "#d45c5c",
            fontSize: 13,
            borderRadius: 6,
            maxWidth: 320,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 56, fontSize: 11, color: T.textSec, letterSpacing: 2, opacity: 0.5 }}>
          SECURE ACCESS REQUIRED
        </div>
      </div>
    </div>
  );
}
