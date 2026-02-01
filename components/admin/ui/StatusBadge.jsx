"use client";

export default function StatusBadge({ status }) {
  const color = getColor(status);

  return (
    <span
      style={{
        ...ui.badge,
        background: color.bg,
        color: color.text,
      }}
    >
      {status?.toUpperCase()}
    </span>
  );
}

function getColor(status) {
  switch (status) {
    case "published":
      return { bg: "#dcfce7", text: "#166534" };
    case "review":
      return { bg: "#fef9c3", text: "#854d0e" };
    case "scheduled":
      return { bg: "#e0f2fe", text: "#075985" };
    case "rejected":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "hidden":
      return { bg: "#f3f4f6", text: "#374151" };
    default:
      return { bg: "#e5e7eb", text: "#374151" };
  }
}

const ui = {
  badge: {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
};

