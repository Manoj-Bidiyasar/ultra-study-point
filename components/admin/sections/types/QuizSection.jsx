"use client";

export default function QuizSection({
  value = {},
  isLocked,
  onChange,
}) {
  return (
    <div style={{ display: "grid", gap:  predominately }}>
      
      <div>
        <label>Quiz Duration (minutes)</label>
        <input
          type="number"
          min="1"
          disabled={isLocked}
          value={value.duration || ""}
          onChange={(e) =>
            onChange({ duration: Number(e.target.value) })
          }
        />
      </div>

      <div>
        <label>Total Marks</label>
        <input
          type="number"
          min="1"
          disabled={isLocked}
          value={value.totalMarks || ""}
          onChange={(e) =>
            onChange({ totalMarks: Number(e.target.value) })
          }
        />
      </div>

      <div>
        <label>Negative Marking</label>
        <input
          type="number"
          step="0.25"
          disabled={isLocked}
          value={value.negativeMarks || ""}
          onChange={(e) =>
            onChange({ negativeMarks: Number(e.target.value) })
          }
        />
      </div>

      <div>
        <label>Passing Percentage</label>
        <input
          type="number"
          min="0"
          max="100"
          disabled={isLocked}
          value={value.passPercentage || ""}
          onChange={(e) =>
            onChange({ passPercentage: Number(e.target.value) })
          }
        />
      </div>

    </div>
  );
}
