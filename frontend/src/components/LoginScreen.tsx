import React from "react";

interface LoginScreenProps {
  error: string | null;
  onLogin: () => void;
}

export default function LoginScreen({ error, onLogin }: LoginScreenProps) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono','Courier New',monospace",
      background: "#0d1117",
      color: "#b8ccd8",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 24,
      userSelect: "none",
    }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(123,104,238,0.04) 0%, transparent 70%)," +
          "linear-gradient(rgba(123,104,238,0.03) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(123,104,238,0.03) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 40px 40px, 40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        {/* Logo / Title */}
        <div style={{ fontSize: 10, letterSpacing: 6, color: "#7B68EE", marginBottom: 8 }}>
          ROSENMOND
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", letterSpacing: 2, marginBottom: 4 }}>
          WARBOARD
        </div>
        <div style={{ fontSize: 9, color: "#5a7a8a", letterSpacing: 2, marginBottom: 40 }}>
          TACTICAL OPERATIONS CENTER
        </div>

        {/* Login button */}
        <button
          onClick={onLogin}
          style={{
            background: "rgba(123,104,238,0.12)",
            border: "1px solid rgba(123,104,238,0.3)",
            color: "#7B68EE",
            padding: "10px 28px",
            fontSize: 11,
            letterSpacing: 2,
            fontFamily: "'JetBrains Mono',monospace",
            cursor: "pointer",
            borderRadius: 2,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(123,104,238,0.2)";
            e.currentTarget.style.borderColor = "rgba(123,104,238,0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(123,104,238,0.12)";
            e.currentTarget.style.borderColor = "rgba(123,104,238,0.3)";
          }}
        >
          AUTHENTICATE WITH GOOGLE
        </button>

        {/* Error display */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: "8px 16px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444",
            fontSize: 10,
            letterSpacing: 1,
            borderRadius: 2,
            maxWidth: 300,
          }}>
            {error}
          </div>
        )}

        {/* Decorative */}
        <div style={{ marginTop: 48, fontSize: 8, color: "#2a3a4a", letterSpacing: 2 }}>
          SECURE ACCESS REQUIRED
        </div>
      </div>
    </div>
  );
}
