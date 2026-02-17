"use client";

const PYQ_EXAM_CATEGORY_OPTIONS = [
  { id: "ssc-exams", name: "SSC Exams" },
  { id: "banking", name: "Banking" },
  { id: "railways", name: "Railways" },
  { id: "state-exams", name: "State Exams" },
  { id: "teaching", name: "Teaching" },
  { id: "defence", name: "Defence" },
];

const PYQ_SUBJECT_CATEGORY_OPTIONS = [
  { id: "current-affairs", name: "Current Affairs" },
  { id: "science-tech", name: "Science & Tech" },
  { id: "computer", name: "Computer" },
  { id: "math", name: "Math" },
  { id: "reasoning", name: "Reasoning" },
  { id: "english", name: "English" },
  { id: "hindi", name: "Hindi" },
  { id: "indian-polity", name: "Indian Polity" },
  { id: "indian-history", name: "Indian History" },
  { id: "indian-geography", name: "Indian Geography" },
  { id: "indian-economy", name: "Indian Economy" },
  { id: "indian-art-culture", name: "Indian Art & Culture" },
  { id: "indian-miscellaneous", name: "Indian Miscellaneous" },
  { id: "rajasthan-polity", name: "Rajasthan Polity" },
  { id: "rajasthan-history", name: "Rajasthan History" },
  { id: "rajasthan-geography", name: "Rajasthan Geography" },
  { id: "rajasthan-economy", name: "Rajasthan Economy" },
  { id: "rajasthan-art-culture", name: "Rajasthan Art & Culture" },
  { id: "rajasthan-miscellaneous", name: "Rajasthan Miscellaneous" },
];

const PYQ_COURSE_OPTIONS = [
  "SSC",
  "Banking",
  "Railways",
  "State Exams",
  "Teaching",
  "Defence",
];

const PYQ_TYPE_OPTIONS = [
  "Previous Year Paper",
  "Topic-wise PYQ Set",
  "Practice Set",
  "Mock Test",
];

function normalizeText(value) {
  return String(value || "").trim();
}

function topValue(values) {
  const freq = new Map();
  values
    .map(normalizeText)
    .filter(Boolean)
    .forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
  if (freq.size === 0) return "";
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function derivePyqDetailsFromQuestions(questions) {
  const list = Array.isArray(questions) ? questions : [];
  const subjects = [];
  const exams = [];
  const years = [];

  list.forEach((q) => {
    const meta = q?.meta || {};
    if (meta.subject) subjects.push(meta.subject);
    if (q?.subject) subjects.push(q.subject);

    const pyqRows = Array.isArray(meta.pyqData) ? meta.pyqData : [];
    pyqRows.forEach((row) => {
      if (row?.exam) exams.push(row.exam);
      if (row?.year) years.push(String(row.year));
    });

    if (meta.exam) exams.push(meta.exam);
    if (q?.exam) exams.push(q.exam);
    if (meta.year) years.push(String(meta.year));
    if (q?.year) years.push(String(q.year));
  });

  return {
    subject: topValue(subjects),
    exam: topValue(exams),
    year: topValue(years),
  };
}

export default function PyqSection({
  value = {},
  questions = [],
  isLocked,
  onChange,
}) {
  const categoryMode = value.categoryMode === "subject" ? "subject" : "exam";
  const examCategoryId = String(value.examCategoryId || "");
  const subjectCategoryId = String(value.subjectCategoryId || "");
  const pyqCategoryId =
    categoryMode === "exam" ? examCategoryId : subjectCategoryId;
  const derived = derivePyqDetailsFromQuestions(questions);

  const update = (patch) => {
    const next = { ...value, ...patch };
    const nextMode = next.categoryMode === "subject" ? "subject" : "exam";
    next.pyqCategoryId =
      nextMode === "exam"
        ? String(next.examCategoryId || "")
        : String(next.subjectCategoryId || "");
    onChange(next);
  };

  return (
    <div style={ui.wrap}>
      <div style={ui.card}>
        <div style={ui.cardTitle}>Category Mapping</div>
        <div style={ui.gridTwo}>
          <div style={ui.field}>
            <label style={ui.label}>Mapping Type</label>
            <select
              style={ui.input}
              disabled={isLocked}
              value={categoryMode}
              onChange={(e) =>
                update({
                  categoryMode: e.target.value === "subject" ? "subject" : "exam",
                })
              }
            >
              <option value="exam">Exam Category</option>
              <option value="subject">Subject Category</option>
            </select>
          </div>

          {categoryMode === "exam" ? (
            <div style={ui.field}>
              <label style={ui.label}>Exam Category Name</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={examCategoryId}
                onChange={(e) =>
                  update({
                    examCategoryId: String(e.target.value || ""),
                  })
                }
              >
                <option value="">Select exam category</option>
                {PYQ_EXAM_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <div style={ui.idLine}>Exam Category ID: <code>{examCategoryId || "-"}</code></div>
            </div>
          ) : (
            <div style={ui.field}>
              <label style={ui.label}>Subject Category Name</label>
              <select
                style={ui.input}
                disabled={isLocked}
                value={subjectCategoryId}
                onChange={(e) =>
                  update({
                    subjectCategoryId: String(e.target.value || ""),
                  })
                }
              >
                <option value="">Select subject category</option>
                {PYQ_SUBJECT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <div style={ui.idLine}>Subject Category ID: <code>{subjectCategoryId || "-"}</code></div>
            </div>
          )}
        </div>
        <div style={{ ...ui.idLine, marginTop: 8 }}>
          Public Category ID: <code>{pyqCategoryId || "-"}</code>
        </div>
      </div>

      <div style={ui.card}>
        <div style={ui.cardTitle}>PYQ Specific Details</div>
        <div style={ui.gridThree}>
          <div style={ui.field}>
            <label style={ui.label}>Course</label>
            <select
              style={ui.input}
              disabled={isLocked}
              value={value.course || ""}
              onChange={(e) => update({ course: e.target.value })}
            >
              <option value="">None</option>
              {PYQ_COURSE_OPTIONS.map((opt) => (
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
              onChange={(e) => update({ type: e.target.value })}
            >
              <option value="">None</option>
              {PYQ_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Exam (Auto from Questions)</label>
            <div style={ui.readOnlyBox}>{derived.exam || "-"}</div>
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Year (Auto from Questions)</label>
            <div style={ui.readOnlyBox}>{derived.year || "-"}</div>
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Subject (Auto from Questions)</label>
            <div style={ui.readOnlyBox}>{derived.subject || "-"}</div>
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
  readOnlyBox: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    color: "#0f172a",
    minHeight: 40,
    display: "flex",
    alignItems: "center",
  },
  idLine: {
    fontSize: 12,
    color: "#64748b",
  },
};
