"use client";

export default function BasicInfoSection({
  state,
  role,
  isLocked,
  onChange,
}) {
  function update(key, value) {
    onChange({
      ...state,
      [key]: value,
    });
  }

  return (
    <div style={ui.card}>
      <h3 style={ui.title}>Basic Information</h3>

      {/* ROW 1 */}
      <div style={ui.row}>
        <Field label="Title" hint="Main headline shown on website">
          <input
            style={ui.input}
            disabled={isLocked}
            value={state.title}
            onChange={(e) =>
              update("title", e.target.value)
            }
          />
        </Field>

        <Field
          label="Document ID"
          hint="Unique ID (cannot be changed)"
        >
          <input
            style={ui.input}
            disabled
            value={state.id}
          />
        </Field>
      </div>

      {/* ROW 2 */}
      <div style={ui.row}>
        <Field label="Slug" hint="URL-friendly identifier">
          <input
            style={ui.input}
            disabled={isLocked}
            value={state.slug}
            onChange={(e) =>
              update("slug", e.target.value)
            }
          />
        </Field>

        <Field
          label="Language"
          hint="Optional content language"
        >
          <select
            style={ui.select}
            disabled={isLocked}
            value={state.language ?? ""}
            onChange={(e) =>
              update(
                "language",
                e.target.value || null
              )
            }
          >
            <option value="">
              — Not specified —
            </option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </Field>
      </div>

      {/* ROW 3 */}
      <div style={ui.row}>
        <Field label="Status" hint="Publishing state">
          <select
            style={ui.select}
            disabled={isLocked && role === "editor"}
            value={state.status}
            onChange={(e) =>
              update("status", e.target.value)
            }
          >
            {role === "editor" && (
              <option value="draft">
                Draft
              </option>
            )}

            {(role === "admin" ||
              role === "super_admin") && (
              <>
                <option value="draft">Draft</option>
                <option value="hidden">
                  Hidden
                </option>
                <option value="rejected">
                  Rejected
                </option>
                <option value="scheduled">
                  Scheduled
                </option>
                <option value="published">
                  Published
                </option>
              </>
            )}
          </select>
        </Field>

        {state.status === "scheduled" ? (
          <Field
            label="Publish Date & Time"
            hint="Article goes live automatically"
          >
            <input
              type="datetime-local"
              style={ui.input}
              value={state.publishedAt || ""}
              onChange={(e) =>
                update(
                  "publishedAt",
                  e.target.value
                )
              }
            />
          </Field>
        ) : (
          <div />
        )}
      </div>

      {/* SUMMARY */}
      <Field
        label="Summary"
        hint="Short description shown in listings"
      >
        <textarea
          style={ui.textarea}
          rows={3}
          value={state.summary}
          onChange={(e) =>
            update("summary", e.target.value)
          }
        />
      </Field>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Field({ label, hint, children }) {
  return (
    <div style={ui.field}>
      <div style={ui.labelRow}>
        <label style={ui.label}>
          {label}
        </label>
        {hint && (
          <span style={ui.hint}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ---------------- styles ---------------- */

const ui = {
  card: {
    background: "#ffffff",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 10,
  },
  labelRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
  },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: "100%",
  },
  textarea: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: "100%",
    resize: "vertical",
  },
  select: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: "100%",
    background: "#fff",
  },
};
