"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import { permissionsByRole } from "@/lib/admin/permissions";
import AdminSidebar from "@/app/admin/components/AdminSidebar";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        /* 🚫 Not logged in */
        if (!user) {
          if (!pathname.startsWith("/admin/login")) {
            router.replace("/admin/login");
          }
          setLoading(false);
          return;
        }

        /* 🔎 Fetch user from Firestore (CORRECT PATH) */
        const userRef = doc(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "users",
          user.uid
        );

        const snap = await getDoc(userRef);

        /* ❌ User doc missing */
        if (!snap.exists()) {
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }

        const userData = snap.data();

        /* ❌ Disabled user */
        if (userData.status && userData.status !== "active") {
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }

        /* ❌ Invalid role */
        if (!permissionsByRole[userData.role]) {
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }

        /* ✅ Authorized admin */
        setAdminUser({
          uid: user.uid,
          email: user.email,
          ...userData,
          permissions: permissionsByRole[userData.role],
        });

        setLoading(false);
      } catch (err) {
        console.error("Admin auth error:", err);
        await signOut(auth);
        router.replace("/admin/login");
      }
    });

    return () => unsub();
  }, [router, pathname]);

  /* ⏳ Loading */
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Checking admin access…
      </div>
    );
  }

  /* 🔐 Login page should not use admin layout */
  if (pathname.startsWith("/admin/login")) {
    return children;
  }

  /* 🚫 Safety guard */
  if (!adminUser) {
    return null;
  }

  /* 🧱 Admin Shell */
  return (
    <div className="admin-layout">
      {/* ===== TOP BAR ===== */}
      <header style={styles.header}>
        {/* LEFT: Name + Role */}
        <div style={styles.left}>
          <span style={styles.name}>
            {adminUser.displayName || "Admin"}
          </span>

          <span style={styles.roleBadge}>
            {adminUser.role.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* RIGHT: Email + Logout */}
        <div style={styles.right}>
          <span style={styles.email}>{adminUser.email}</span>

          <button
            style={styles.logout}
            onClick={async () => {
              await signOut(auth);
              router.replace("/admin/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div style={styles.body}>
        {/* SIDEBAR */}
        <AdminSidebar
          permissions={adminUser.permissions}
          role={adminUser.role}
        />

        {/* MAIN CONTENT */}
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  header: {
    height: 56,
    padding: "0 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#ffffff",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontWeight: 600,
    fontSize: 15,
  },
  roleBadge: {
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#e0e7ff",
    color: "#1e40af",
    fontWeight: 600,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  email: {
    fontSize: 13,
    color: "#64748b",
  },
  logout: {
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  body: {
    display: "flex",
    minHeight: "calc(100vh - 56px)",
  },
  content: {
    flex: 1,
    padding: 24,
    background: "#f8fafc",
    minWidth: 0,
    overflowX: "auto",
  },
};

