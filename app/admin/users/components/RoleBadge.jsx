export default function RoleBadge({ role }) {
  const colors = {
    editor: { bg: "#e0f2fe", color: "#0369a1" },
    admin: { bg: "#ede9fe", color: "#5b21b6" },
    super_admin: { bg: "#fee2e2", color: "#991b1b" },
  };

  const style = colors[role] || {};

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {role}
    </span>
  );
}
