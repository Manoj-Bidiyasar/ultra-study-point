import RoleBadge from "./RoleBadge";
import AccessToggle from "./AccessToggle";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function UserTable({ users }) {
  const updateStatus = async (user, status) => {
    if (user.isProtected) {
      alert("Protected Super Admin cannot be modified.");
      return;
    }

    const ref = doc(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "users",
      user.id
    );

    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <table style={ui.table}>
      <colgroup>
        <col style={{ width: "22%" }} />
        <col style={{ width: "26%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "10%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={ui.th}>Name</th>
          <th style={ui.th}>Email</th>
          <th style={ui.th}>Role</th>
          <th style={ui.th}>Status</th>
          <th style={ui.th}>Daily</th>
          <th style={ui.th}>Monthly</th>
          <th style={ui.th}>Notes</th>
        </tr>
      </thead>

      <tbody>
        {users.map((u) => (
          <tr
            key={u.id}
            style={{
              ...ui.tr,
              ...(u.status === "suspended"
                ? ui.rowSuspended
                : ui.rowActive),
            }}
          >
            <td style={ui.td}>{u.displayName || "—"}</td>
            <td style={{ ...ui.td, ...ui.emailCell }}>{u.email || "—"}</td>
            <td style={ui.td}>
              <div style={ui.roleCell}>
                <RoleBadge role={u.role} />
              </div>
            </td>

            <td style={ui.td}>
              <select
                value={u.status || "active"}
                disabled={u.isProtected || u.role === "super_admin"}
                onChange={(e) => updateStatus(u, e.target.value)}
                style={ui.select}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </td>

            <td style={ui.td}>
              <AccessToggle
                userId={u.id}
                accessKey="dailyCA"
                value={u.contentAccess?.dailyCA}
              />
            </td>

            <td style={ui.td}>
              <AccessToggle
                userId={u.id}
                accessKey="monthlyCA"
                value={u.contentAccess?.monthlyCA}
              />
            </td>

            <td style={ui.td}>
              <AccessToggle
                userId={u.id}
                accessKey="notes"
                value={u.contentAccess?.notes}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ui = {
  table: {
    width: "100%",
    background: "#fff",
    borderRadius: 10,
    borderCollapse: "collapse",
    overflow: "hidden",
    tableLayout: "auto",
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    color: "#6b7280",
    padding: "10px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    verticalAlign: "middle",
  },
  emailCell: {
    wordBreak: "break-all",
  },
  roleCell: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  tr: {
    background: "#fff",
  },
  rowActive: {
    background: "#f0fdf4",
  },
  rowSuspended: {
    background: "#fef2f2",
  },
  select: {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 12,
    minWidth: 100,
  },
};

