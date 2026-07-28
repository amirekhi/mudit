"use client";

const CHAR_SIZE = 30; // font size in px
const PULSE_DURATION_MS = 1000;

export default function MuditSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 0",
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: CHAR_SIZE,
          fontWeight: 500,
          letterSpacing: 2,
          display: "inline-block",
          backgroundImage:
            "linear-gradient(90deg, #AFA9EC, #7F77DD, #534AB7, #3C3489)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: `mudit-pulse ${PULSE_DURATION_MS}ms ease-in-out infinite`,
        }}
      >
        mudit
      </span>
      <style>{`
        @keyframes mudit-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}