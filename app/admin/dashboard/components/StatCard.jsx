export default function StatCard({ title, value }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: "#fff",
      }}
    >
      <p style={{ fontSize: 13, color: "#64748b" }}>{title}</p>
      <h2 style={{ marginTop: 6 }}>{value}</h2>
    </div>
  );
}
