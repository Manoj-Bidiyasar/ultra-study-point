"use client";

export default function ExitPreviewButton() {
  return (
    <button
      onClick={() => window.close()}
      style={{
        background: "#dc2626",
        color: "#fff",
        border: "none",
        padding: "6px 12px",
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      Exit Preview
    </button>
  );
}
