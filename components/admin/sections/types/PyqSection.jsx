"use client";

export default function PyqSection({
  value = {},
  isLocked,
  onChange,
}) {
  return (
    <div style={ui.grid}>
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

      <div>
        <label>Year</label>
        <input
          type="text"
          disabled={isLocked}
          value={value.year || ""}
          onChange={(e) =>
            onChange({ ...value, year: e.target.value })
          }
        />
      </div>

      <div>
        <label>Subject</label>
        <input
          type="text"
          disabled={isLocked}
          value={value.subject || ""}
          onChange={(e) =>
            onChange({ ...value, subject: e.target.value })
          }
        />
      </div>

      <div>
        <label>Public Answers</label>
        <select
          disabled={isLocked}
          value={value.hideAnswersDefault ? "hide" : "show"}
          onChange={(e) =>
            onChange({
              ...value,
              hideAnswersDefault: e.target.value === "hide",
            })
          }
        >
          <option value="hide">Hide by default</option>
          <option value="show">Show by default</option>
        </select>
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
