"use client";

import { useState } from "react";

export default function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
  right,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={ui.card}>
      <div
        style={ui.header}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={ui.titleRow}>
          <span style={ui.chevron}>
            {open ? "▼" : "▶"}
          </span>
          <h3 style={ui.title}>{title}</h3>
        </div>

        {right && <div>{right}</div>}
      </div>

      {open && <div style={ui.body}>{children}</div>}
    </div>
  );
}

const ui = {
  card: {
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 16,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    cursor: "pointer",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  chevron: {
    fontSize: 12,
    color: "#6b7280",
  },

  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },

  body: {
    padding: 14,
  },
};
