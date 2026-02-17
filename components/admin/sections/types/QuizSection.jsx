"use client";

import {
  QUIZ_TAXONOMY,
  QUIZ_COURSE_OPTIONS,
  QUIZ_TYPE_OPTIONS,
  QUIZ_EXAM_OPTIONS,
} from "@/lib/quiz/taxonomy";

export default function QuizSection({
  value = {},
  isLocked,
  onChange,
}) {
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthStartValue = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-01`;
  const selectedCategoryId = String(value.categoryId || "");
  const selectedCategory = QUIZ_TAXONOMY.find((c) => c.id === selectedCategoryId) || null;
  const selectedSubcategoryId = String(value.subcategoryId || "");
  const categoryOptions = QUIZ_TAXONOMY;
  const subcategoryOptions = selectedCategory?.subcategories || [];
  const isCurrentAffairs = selectedCategoryId === "current-affairs";
  const isDailyCa = selectedSubcategoryId === "daily-ca";
  const isMonthlyCa = selectedSubcategoryId === "monthly-ca";

  const dailyDateValue = String(value.quizDate || "").slice(0, 10);
  const monthlyDateValue = String(value.quizDate || "").slice(0, 7);

  const formatDailyLabel = (raw) => {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const formatMonthlyLabel = (raw) => {
    const src = raw && raw.length === 7 ? `${raw}-01` : raw;
    const d = new Date(src);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div style={ui.wrap}>
      <div style={ui.card}>
        <div style={ui.cardTitle}>Category Mapping</div>
        <div style={ui.gridTwo}>
      <div style={ui.field}>
        <label style={ui.label}>Category Name</label>
        <select
          style={ui.input}
          disabled={isLocked}
          value={selectedCategoryId}
          onChange={(e) => {
            const nextCategoryId = String(e.target.value || "");
            const nextCategory =
              categoryOptions.find((c) => c.id === nextCategoryId) || null;
            const nextCategoryName = nextCategory?.name || "";
            onChange({
              ...value,
              categoryId: nextCategoryId,
              category: nextCategoryName,
              subcategoryId: "",
              subcategory: "",
              quizDate:
                (nextCategoryName === "Daily CA" || nextCategoryName === "Current Affairs") && !value.quizDate
                  ? todayValue
                  : nextCategoryName === "Monthly CA" && !value.quizDate
                  ? monthStartValue
                  : value.quizDate || "",
            });
          }}
        >
          <option value="">Select category</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <div style={ui.idLine}>Category ID: <code>{selectedCategoryId || "-"}</code></div>
      </div>

      <div style={ui.field}>
        <label style={ui.label}>Subcategory Name</label>
        <select
          style={ui.input}
          disabled={isLocked || !selectedCategory}
          value={selectedSubcategoryId}
          onChange={(e) => {
            const nextSubcategoryId = String(e.target.value || "");
            const nextSubcategory =
              subcategoryOptions.find((s) => s.id === nextSubcategoryId) || null;
            const nextQuizDate =
              nextSubcategoryId === "daily-ca" && !value.quizDate
                ? todayValue
                : nextSubcategoryId === "monthly-ca" && !value.quizDate
                ? monthStartValue
                : value.quizDate || "";
            onChange({
              ...value,
              subcategoryId: nextSubcategoryId,
              subcategory: nextSubcategory?.name || "",
              quizDate: nextQuizDate,
            });
          }}
        >
          <option value="">Select subcategory</option>
          {subcategoryOptions.map((subcat) => (
            <option key={subcat.id} value={subcat.id}>
              {subcat.name}
            </option>
          ))}
        </select>
        <div style={ui.idLine}>Subcategory ID: <code>{selectedSubcategoryId || "-"}</code></div>
      </div>
      </div>
      </div>

      <div style={ui.card}>
        <div style={ui.cardTitle}>Quiz Specific Details</div>
        <div style={ui.gridThree}>
      {isCurrentAffairs && (
        <div style={ui.field}>
          <label style={ui.label}>Quiz Date</label>
          {isDailyCa && (
            <>
              <input
                style={ui.input}
                type="date"
                disabled={isLocked}
                value={dailyDateValue}
                onChange={(e) =>
                  onChange({ ...value, quizDate: e.target.value })
                }
              />
              <div style={ui.idLine}>
                Timestamp: <code>{formatDailyLabel(dailyDateValue) || "-"}</code>
              </div>
            </>
          )}
          {isMonthlyCa && (
            <>
              <input
                style={ui.input}
                type="month"
                disabled={isLocked}
                value={monthlyDateValue}
                onChange={(e) =>
                  onChange({ ...value, quizDate: e.target.value })
                }
              />
              <div style={ui.idLine}>
                Timestamp: <code>{formatMonthlyLabel(monthlyDateValue) || "-"}</code>
              </div>
            </>
          )}
          {!isDailyCa && !isMonthlyCa && (
            <div style={ui.idLine}>
              Select subcategory as <code>Daily CA</code> or <code>Monthly CA</code> to set timestamp.
            </div>
          )}
        </div>
      )}

      <div style={ui.field}>
        <label style={ui.label}>Course</label>
        <select
          style={ui.input}
          disabled={isLocked}
          value={value.course || ""}
          onChange={(e) => onChange({ ...value, course: e.target.value })}
        >
          <option value="">None</option>
          {QUIZ_COURSE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div style={ui.field}>
        <label style={ui.label}>Type</label>
        <select
          style={ui.input}
          disabled={isLocked}
          value={value.type || ""}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
        >
          <option value="">None</option>
          {QUIZ_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div style={ui.field}>
        <label style={ui.label}>Exam</label>
        <select
          style={ui.input}
          disabled={isLocked}
          value={value.exam || ""}
          onChange={(e) => onChange({ ...value, exam: e.target.value })}
        >
          <option value="">None</option>
          {QUIZ_EXAM_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      </div>
      </div>
    </div>
  );
}

const ui = {
  wrap: {
    display: "grid",
    gap: 12,
  },
  card: {
    border: "1px solid #dbe3ef",
    borderRadius: 12,
    background: "#f8fafc",
    padding: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 10,
  },
  gridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
  },
  idLine: {
    fontSize: 12,
    color: "#64748b",
  },
};
