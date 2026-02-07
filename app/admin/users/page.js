"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import UserTable from "./components/UserTable";
import UserModal from "./components/UserModal";

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: currently edited user
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      // 🔐 role check
      const token = await user.getIdTokenResult();

      if (token.claims.role !== "super_admin") {
        router.replace("/admin/dashboard");
        return;
      }

      const snap = await getDocs(
        collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "users"
        )
      );

      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // ✅ NEW: save user changes
  const saveUser = async (updatedUser) => {
    // never allow editing super admin
    if (updatedUser.role === "super_admin") return;

    await updateDoc(
      doc(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "users",
        updatedUser.id
      ),
      {
        displayName: updatedUser.displayName,
        status: updatedUser.status,
        contentAccess: updatedUser.contentAccess,
        updatedAt: serverTimestamp(),
      }
    );

    // update UI instantly
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updatedUser.id ? { ...u, ...updatedUser } : u
      )
    );

    setActiveUser(null);
  };

  if (loading) return <p>Loading users…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        User Management
      </h1>

      {/* ✅ TABLE */}
      <UserTable
        users={users}
        onEdit={setActiveUser}
      />

      {/* ✅ MODAL */}
      {activeUser && (
        <UserModal
          user={activeUser}
          onClose={() => setActiveUser(null)}
          onSave={saveUser}
        />
      )}
    </div>
  );
}

