import { useEffect, useState } from "react";

export default function DailySection({
  value,
  isLocked,
  onChange,
}) {
  const [editDate, setEditDate] = useState(false);

  useEffect(() => {
    setEditDate(!value?.caDate);
  }, [value?.caDate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          CADate
        </label>

        <input
          type="date"
          disabled={isLocked || !editDate}
          value={value.caDate || ""}
          onChange={(e) =>
            onChange({ caDate: e.target.value })
          }
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />

        {!isLocked && (
          <label style={{ fontSize: 12, color: "#6b7280" }}>
            <input
              type="checkbox"
              checked={editDate}
              onChange={(e) => setEditDate(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Edit date
          </label>
        )}
      </div>

    </div>
  );
}
