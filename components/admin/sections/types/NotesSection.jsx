"use client";

import {
  CATEGORY_DEFINITIONS,
  SUBCATEGORY_CONFIG,
} from "@/lib/notes/taxonomy";

export default function NotesSection({
  value = {},
  isLocked,
  onChange,
}) {
  const {
    section = "subject",
    categoryId = "",
    categoryName = "",
    subCategoryId = "",
    subCategoryName = "",
    topic = "",
  } = value;

  /* ================= SUBCATEGORY FILTER ================= */

  const availableSubCategories = Object.entries(
    SUBCATEGORY_CONFIG
  ).filter(
    ([, meta]) => meta.category === categoryId
  );

  /* ================= HELPERS ================= */

  function handleCategoryChange(id) {
    const cat = CATEGORY_DEFINITIONS.find(
      (c) => c.id === id
    );

    onChange({
      ...value,
      section,
      categoryId: id,
      categoryName: cat?.name || "",
      subCategoryId: "",
      subCategoryName: "",
    });
  }

  function handleSectionChange(nextSection) {
    onChange({
      ...value,
      section: nextSection,
      categoryId: "",
      categoryName: "",
      subCategoryId: "",
      subCategoryName: "",
    });
  }

  function handleSubCategoryChange(id) {
    const meta = SUBCATEGORY_CONFIG[id];

    onChange({
      ...value,
      section,
      subCategoryId: id,
      subCategoryName: meta?.label || "",
    });
  }

  return (
    <div style={ui.wrapper}>
      {/* ================= SECTION ================= */}
      <div style={ui.field}>
        <label style={ui.label}>Section</label>
        <select
          style={ui.input}
          disabled={isLocked}
          value={section}
          onChange={(e) => handleSectionChange(e.target.value)}
        >
          <option value="subject">Subject Wise</option>
          <option value="exam">Exam Wise</option>
        </select>
      </div>

      {/* ================= CATEGORY ================= */}
      <div style={ui.field}>
        <label style={ui.label}>Category</label>

        <select
          style={ui.input}
          disabled={isLocked || section !== "subject"}
          value={categoryId}
          onChange={(e) =>
            handleCategoryChange(e.target.value)
          }
        >
          <option value="">Select category</option>
          {CATEGORY_DEFINITIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* manual override */}
        <input
          style={ui.inputMuted}
          disabled={isLocked || section !== "subject"}
          placeholder="Category ID (auto-filled, editable)"
          value={categoryId}
          onChange={(e) =>
            handleCategoryChange(e.target.value)
          }
        />
      </div>

      {/* ================= SUBCATEGORY ================= */}
      <div style={ui.field}>
        <label style={ui.label}>Subcategory</label>

        <select
          style={ui.input}
          disabled={!categoryId || isLocked || section !== "subject"}
          value={subCategoryId}
          onChange={(e) =>
            handleSubCategoryChange(e.target.value)
          }
        >
          <option value="">Select subcategory</option>

          {availableSubCategories.map(([id, meta]) => (
            <option key={id} value={id}>
              {meta.label}
            </option>
          ))}
        </select>

        {/* manual override */}
        <input
          style={ui.inputMuted}
          disabled={isLocked || section !== "subject"}
          placeholder="Subcategory ID (auto-filled, editable)"
          value={subCategoryId}
          onChange={(e) =>
            handleSubCategoryChange(e.target.value)
          }
        />
      </div>

      {/* ================= TOPIC ================= */}
      <div style={ui.field}>
        <label style={ui.label}>Topic</label>
        <input
          style={ui.input}
          disabled={isLocked}
          placeholder="Example: Mughal Empire"
          value={topic}
          onChange={(e) =>
            onChange({
              ...value,
              topic: e.target.value,
            })
          }
        />
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

  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    background: "#fff",
  },

  inputMuted: {
    padding: "6px 10px",
    border: "1px dashed #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    color: "#6b7280",
    background: "#fafafa",
  },
};

