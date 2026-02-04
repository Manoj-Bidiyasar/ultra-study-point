export default function Charts({ data }) {
  if (!data) return null;

  const rows = [
    { label: "CA Draft", value: data.caDraft },
    { label: "CA Published", value: data.caPublished },
    { label: "Notes Draft", value: data.notesDraft },
    { label: "Notes Published", value: data.notesPublished },
  ];

  const max = Math.max(
    1,
    ...rows.map((r) => Number(r.value || 0))
  );

  return (
    <div style={{ marginTop: 40 }}>
      <h3>Overview</h3>
      <div style={{ marginTop: 12 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 50px",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13 }}>{r.label}</div>
            <div
              style={{
                height: 10,
                background: "#e5e7eb",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(Number(r.value || 0) / max) * 100}%`,
                  background: "#60a5fa",
                }}
              />
            </div>
            <div style={{ fontSize: 12, textAlign: "right" }}>
              {r.value || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
