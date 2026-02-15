"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import { permissionsByRole } from "@/lib/admin/permissions";
import AdminSidebar from "@/app/admin/components/AdminSidebar";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    let stopUserDocListener = null;

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (stopUserDocListener) {
          stopUserDocListener();
          stopUserDocListener = null;
        }

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
        const localSessionId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("admin_session_id")
            : null;

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

        if (
          localSessionId &&
          userData.activeSessionId &&
          userData.activeSessionId !== localSessionId
        ) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("admin_session_id");
          }
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

        stopUserDocListener = onSnapshot(userRef, async (docSnap) => {
          if (!docSnap.exists()) return;
          const latest = docSnap.data();
          const localId =
            typeof window !== "undefined"
              ? window.localStorage.getItem("admin_session_id")
              : null;

          if (
            localId &&
            latest.activeSessionId &&
            latest.activeSessionId !== localId
          ) {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("admin_session_id");
            }
            await signOut(auth);
            router.replace("/admin/login");
          }
        });

        setLoading(false);
      } catch (err) {
        console.error("Admin auth error:", err);
        await signOut(auth);
        router.replace("/admin/login");
      }
    });

    return () => {
      if (stopUserDocListener) stopUserDocListener();
      unsub();
    };
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
      {/* ===== BODY ===== */}
      <div style={styles.body}>
        {/* SIDEBAR */}
        <AdminSidebar
          permissions={adminUser.permissions}
          role={adminUser.role}
          user={adminUser}
          onLogout={async () => {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("admin_session_id");
            }
            await signOut(auth);
            router.replace("/admin/login");
          }}
        />

        {/* MAIN CONTENT */}
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  body: {
    minHeight: "100vh",
  },
  content: {
    marginLeft: 274,
    padding: 24,
    background: "#f8fafc",
    minWidth: 0,
    overflowX: "auto",
  },
};

