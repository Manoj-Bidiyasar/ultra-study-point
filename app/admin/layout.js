"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import { permissionsByRole } from "@/lib/admin/permissions";
import AdminSidebar from "@/app/admin/components/AdminSidebar";
import { getOrCreateAdminDeviceId, normalizeAllowedDeviceIds } from "@/lib/admin/sessionClient";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    let stopUserDocListener = null;
    let stopSessionListener = null;
    let heartbeatTimer = null;

    const clearRuntimeSession = () => {
      if (stopUserDocListener) {
        stopUserDocListener();
        stopUserDocListener = null;
      }
      if (stopSessionListener) {
        stopSessionListener();
        stopSessionListener = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        clearRuntimeSession();

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
        const localSessionId = typeof window !== "undefined" ? window.localStorage.getItem("admin_session_id") : null;
        const localDeviceId = getOrCreateAdminDeviceId();
        const allowedDeviceIds = normalizeAllowedDeviceIds(userData.allowedDeviceIds);

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

        if (allowedDeviceIds.length > 0 && !allowedDeviceIds.includes(localDeviceId)) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("admin_session_id");
          }
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }

        if (!localSessionId) {
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }

        const sessionRef = doc(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "users",
          user.uid,
          "sessions",
          localSessionId
        );
        const sessionSnap = await getDoc(sessionRef);
        if (!sessionSnap.exists()) {
          await signOut(auth);
          router.replace("/admin/login");
          return;
        }
        const sessionData = sessionSnap.data();
        if (sessionData.revoked || sessionData.deviceId !== localDeviceId) {
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

        stopSessionListener = onSnapshot(sessionRef, async (docSnap) => {
          if (!docSnap.exists()) {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("admin_session_id");
            }
            await signOut(auth);
            router.replace("/admin/login");
            return;
          }
          const latest = docSnap.data();
          if (latest.revoked) {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("admin_session_id");
            }
            await signOut(auth);
            router.replace("/admin/login");
          }
        });

        heartbeatTimer = setInterval(async () => {
          try {
            await updateDoc(sessionRef, { lastSeenAt: serverTimestamp() });
          } catch {
            // Ignore heartbeat errors; snapshot listener still controls access.
          }
        }, 30_000);

        stopUserDocListener = onSnapshot(userRef, async (docSnap) => {
          if (!docSnap.exists()) return;
          const latest = docSnap.data();
          const allowedLatest = normalizeAllowedDeviceIds(latest.allowedDeviceIds);
          if (
            latest.status !== "active" ||
            (allowedLatest.length > 0 && !allowedLatest.includes(localDeviceId))
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
      clearRuntimeSession();
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
            const localId = typeof window !== "undefined" ? window.localStorage.getItem("admin_session_id") : null;
            if (localId && adminUser?.uid) {
              try {
                const sessionRef = doc(
                  db,
                  "artifacts",
                  "ultra-study-point",
                  "public",
                  "data",
                  "users",
                  adminUser.uid,
                  "sessions",
                  localId
                );
                await updateDoc(sessionRef, {
                  revoked: true,
                  revokedReason: "logout_self",
                  revokedAt: serverTimestamp(),
                });
              } catch {
                // noop
              }
            }
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
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 12px 0 12px",
  },
  content: {
    flex: 1,
    padding: 24,
    background: "#f8fafc",
    minWidth: 0,
    overflowX: "auto",
  },
};

