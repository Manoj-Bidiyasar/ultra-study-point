export default function DailySection({
  value,
  isLocked,
  onChange,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          CADate
        </label>

        <input
          type="date"
          disabled={isLocked}
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
      </div>

    </div>
  );
}
