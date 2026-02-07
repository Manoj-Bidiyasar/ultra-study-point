import { useState } from "react";

export default function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ ...user });

  const isSuperAdmin = user.role === "super_admin";

  return (
    <div style={modal}>
      <h2>Edit User</h2>

      <label>Display Name</label>
      <input
        value={form.displayName}
        onChange={e => setForm({ ...form, displayName: e.target.value })}
      />

      <label>Role</label>
      <input value={form.role} disabled />

      <h4>Content Access</h4>
      {Object.keys(form.contentAccess).map(key => (
        <label key={key}>
          <input
            type="checkbox"
            checked={form.contentAccess[key]}
            disabled={form.role === "editor" && key === "messages"}
            onChange={e =>
              setForm({
                ...form,
                contentAccess: {
                  ...form.contentAccess,
                  [key]: e.target.checked
                }
              })
            }
          />
          {key}
        </label>
      ))}

      <h4>Status</h4>
      <select
        value={form.status}
        disabled={isSuperAdmin}
        onChange={e => setForm({ ...form, status: e.target.value })}
      >
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => onSave(form)}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const modal = {
  background: "#fff",
  padding: 20,
  borderRadius: 8,
  position: "fixed",
  top: "10%",
  left: "50%",
  transform: "translateX(-50%)",
  width: 420,
};
