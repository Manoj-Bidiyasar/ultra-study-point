import RoleBadge from "./RoleBadge";
import AccessToggle from "./AccessToggle";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UserTable({ users }) {
  const updateRole = async (user, role) => {
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
      role,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <table style={{ width: "100%", background: "#fff", borderRadius: 8 }}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Daily</th>
          <th>Monthly</th>
          <th>Notes</th>
        </tr>
      </thead>

      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.displayName}</td>
            <td>{u.email}</td>
            <td>
              <RoleBadge role={u.role} />
              {!u.isProtected && (
                <select
                  value={u.role}
                  onChange={(e) => updateRole(u, e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              )}
            </td>

            <td>
              <AccessToggle
                userId={u.id}
                accessKey="dailyCA"
                value={u.contentAccess?.dailyCA}
              />
            </td>

            <td>
              <AccessToggle
                userId={u.id}
                accessKey="monthlyCA"
                value={u.contentAccess?.monthlyCA}
              />
            </td>

            <td>
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
