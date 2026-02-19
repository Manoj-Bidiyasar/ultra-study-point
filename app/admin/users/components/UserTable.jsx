import RoleBadge from "./RoleBadge";
import AccessToggle from "./AccessToggle";
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

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

  const updateMaxSessions = async (user, value) => {
    if (user.isProtected || user.role === "super_admin") return;
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
      maxConcurrentSessions: Number(value) >= 2 ? 2 : 1,
      updatedAt: serverTimestamp(),
    });
  };

  const forceLogoutAll = async (user) => {
    if (user.isProtected || user.role === "super_admin") return;
    const sessionsRef = collection(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "users",
      user.id,
      "sessions"
    );
    const active = await getDocs(query(sessionsRef, where("revoked", "==", false)));
    await Promise.all(
      active.docs.map((d) =>
        updateDoc(d.ref, {
          revoked: true,
          revokedReason: "force_logout_by_super_admin",
          revokedBy: auth.currentUser?.uid || null,
          revokedAt: serverTimestamp(),
        })
      )
    );
    alert("All active sessions were logged out.");
  };

  return (
    <table style={ui.table}>
      <colgroup>
        <col style={{ width: "18%" }} />
        <col style={{ width: "24%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "6%" }} />
        <col style={{ width: "6%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "10%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={ui.th}>Name</th>
          <th style={ui.th}>Email</th>
          <th style={ui.th}>Role</th>
          <th style={ui.th}>Status</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>Daily</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>Monthly</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>Notes</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>Quiz</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>PYQ</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>Max Login</th>
          <th style={{ ...ui.th, ...ui.centerCell }}>Sessions</th>
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

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <AccessToggle
                userId={u.id}
                accessKey="dailyCA"
                value={u.contentAccess?.dailyCA}
              />
            </td>

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <AccessToggle
                userId={u.id}
                accessKey="monthlyCA"
                value={u.contentAccess?.monthlyCA}
              />
            </td>

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <AccessToggle
                userId={u.id}
                accessKey="notes"
                value={u.contentAccess?.notes}
              />
            </td>

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <AccessToggle
                userId={u.id}
                accessKey="quizzes"
                value={u.contentAccess?.quizzes}
              />
            </td>

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <AccessToggle
                userId={u.id}
                accessKey="pyqs"
                value={u.contentAccess?.pyqs}
              />
            </td>

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <select
                value={String(Number(u.maxConcurrentSessions || 1) >= 2 ? 2 : 1)}
                disabled={u.isProtected || u.role === "super_admin"}
                onChange={(e) => updateMaxSessions(u, e.target.value)}
                style={ui.select}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </td>

            <td style={{ ...ui.td, ...ui.centerCell }}>
              <button
                disabled={u.isProtected || u.role === "super_admin"}
                onClick={() => forceLogoutAll(u)}
                style={ui.logoutBtn}
              >
                Logout All
              </button>
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
    tableLayout: "fixed",
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
  centerCell: {
    textAlign: "center",
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
  logoutBtn: {
    border: "1px solid #dc2626",
    borderRadius: 6,
    background: "#fff1f2",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 8px",
    cursor: "pointer",
  },
};

