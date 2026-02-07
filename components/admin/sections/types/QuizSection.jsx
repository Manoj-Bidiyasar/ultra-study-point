"use client";

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

  return (
    <div style={ui.grid}>
      <div>
        <label>Category</label>
        <select
          disabled={isLocked}
          value={value.category || ""}
          onChange={(e) =>
            onChange({
              ...value,
              category: e.target.value,
              quizDate:
                e.target.value === "Daily CA" && !value.quizDate
                  ? todayValue
                  : e.target.value === "Monthly CA" && !value.quizDate
                  ? monthStartValue
                  : value.quizDate || "",
            })
          }
        >
          <option value="">Select category</option>
          <option value="Daily CA">Daily CA</option>
          <option value="Monthly CA">Monthly CA</option>
          <option value="Mock Test">Mock Test</option>
          <option value="Practice">Practice</option>
        </select>
      </div>

      <div>
        <label>Quiz Date</label>
        <input
          type="date"
          disabled={isLocked}
          value={value.quizDate || ""}
          onChange={(e) =>
            onChange({ ...value, quizDate: e.target.value })
          }
        />
      </div>

      <div>
        <label>Course</label>
        <input
          type="text"
          disabled={isLocked}
          value={value.course || ""}
          onChange={(e) =>
            onChange({ ...value, course: e.target.value })
          }
        />
      </div>

      <div>
        <label>Type</label>
        <input
          type="text"
          disabled={isLocked}
          value={value.type || ""}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value })
          }
        />
      </div>

      <div>
        <label>Exam</label>
        <input
          type="text"
          disabled={isLocked}
          value={value.exam || ""}
          onChange={(e) =>
            onChange({ ...value, exam: e.target.value })
          }
        />
      </div>
    </div>
  );
}

const ui = {
  grid: {
    display: "grid",
    gap: 12,
  },
};
