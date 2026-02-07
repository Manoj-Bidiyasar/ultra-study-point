"use client";

import { useEffect, useState } from "react";

export default function MonthlySection({
  value = {},
  isLocked,
  onChange,
}) {
  const {
    caDate = "",
    pdfUrl = "",
  } = value;
  const [editDate, setEditDate] = useState(false);

  useEffect(() => {
    setEditDate(!caDate);
  }, [caDate]);

  const monthValue =
    caDate && !isNaN(new Date(caDate))
      ? new Date(caDate).toISOString().slice(0, 7)
      : "";

  return (
    <div style={ui.wrapper}>

      {/* ================= MONTH ================= */}
      <div style={ui.field}>
        <label style={ui.label}>
          Month <span style={ui.required}>*</span>
        </label>

        <input
          type="month"
          style={ui.input}
          disabled={isLocked || !editDate}
          value={monthValue}
          onChange={(e) => {
            const v = e.target.value;

            if (!v) {
              onChange({
                ...value,
                caDate: "",
              });
              return;
            }

            const date = new Date(`${v}-01`);

            onChange({
              ...value,
              caDate: date.toISOString(),
            });
          }}
        />

        <span style={ui.hint}>
          Stored internally as timestamp (1st day of month)
        </span>
        {!isLocked && (
          <label style={ui.hint}>
            <input
              type="checkbox"
              checked={editDate}
              onChange={(e) => setEditDate(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Edit month
          </label>
        )}
      </div>

      {/* ================= PDF ================= */}
      <div style={ui.field}>
        <label style={ui.label}>
          PDF URL <span style={ui.optional}>(optional)</span>
        </label>

        <input
          style={ui.input}
          disabled={isLocked}
          placeholder="https://ultrastudypoint.in/pdfs/jan-2026.pdf"
          value={pdfUrl}
          onChange={(e) =>
            onChange({
              ...value,
              pdfUrl: e.target.value,
            })
          }
        />

        <span style={ui.hint}>
          Appears as download button on website
        </span>
      </div>

    </div>
  );
}

/* ================= UI ================= */

const ui = {
  wrapper: {
    display: "grid",
    gap: 18,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },

  required: {
    color: "#dc2626",
  },

  optional: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
  },

  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    background: "#fff",
  },

  hint: {
    fontSize: 12,
    color: "#6b7280",
  },
};
