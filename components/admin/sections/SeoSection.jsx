"use client";

export default function SeoSection({
  seo,
  tags,
  tagsInput,
  setTagsInput,
  isLocked,
  onChange,
  onTagsChange,
}) {
  function update(key, value) {
    onChange({
      ...seo,
      [key]: value,
    });
  }

  return (
    <div style={ui.card}>
      <h3 style={ui.title}>SEO & Meta</h3>

      {/* ================= ROW 1 ================= */}
      <div style={ui.twoCol}>
        <Field label="SEO Title" hint="Search engine title">
          <input
            style={ui.input}
            disabled={isLocked}
            value={seo.seoTitle || ""}
            onChange={(e) =>
              update("seoTitle", e.target.value)
            }
          />
        </Field>

        <Field label="Canonical URL" hint="Primary page URL">
          <input
            style={ui.input}
            disabled={isLocked}
            value={seo.canonicalUrl || ""}
            onChange={(e) =>
              update("canonicalUrl", e.target.value)
            }
          />
        </Field>
      </div>

      {/* ================= ROW 2 ================= */}
      <div style={ui.twoCol}>
        <Field label="Keywords" hint="Comma separated">
          <input
            style={ui.input}
            disabled={isLocked}
            value={seo.keywords || ""}
            onChange={(e) =>
              update("keywords", e.target.value)
            }
          />
        </Field>

        <Field
          label="News Keywords"
          hint="Google News keywords"
        >
          <input
            style={ui.input}
            disabled={isLocked}
            value={seo.newsKeywords || ""}
            onChange={(e) =>
              update("newsKeywords", e.target.value)
            }
          />
        </Field>
      </div>

      {/* ================= TAGS ================= */}
      <Field label="Tags" hint="Comma separated">
        <input
          style={ui.input}
          disabled={isLocked}
          value={tagsInput}
          onChange={(e) =>
            setTagsInput(e.target.value)
          }
          onBlur={() =>
            onTagsChange(
              tagsInput
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
            )
          }
          placeholder="economy, polity, environment"
        />
      </Field>

      {/* ================= DESCRIPTION ================= */}
      <Field label="SEO Description">
        <textarea
          style={ui.textarea}
          rows={3}
          disabled={isLocked}
          value={seo.seoDescription || ""}
          onChange={(e) =>
            update("seoDescription", e.target.value)
          }
        />
      </Field>
    </div>
  );
}

/* ================= FIELD ================= */

function Field({ label, hint, children }) {
  return (
    <div style={ui.field}>
      <div style={ui.labelRow}>
        <label style={ui.label}>{label}</label>
        {hint && (
          <span style={ui.hint}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ================= STYLES ================= */

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
    color: "#111827",
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
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
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
  },

  textarea: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    resize: "vertical",
  },
};
