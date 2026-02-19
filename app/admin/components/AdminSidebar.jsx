"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AdminSidebar({ permissions, role, user, onLogout }) {
  const pathname = usePathname();
  const [dashboardBadgeCount, setDashboardBadgeCount] = useState(0);
  const roleLabel = (role || user?.role || "admin")
    .toString()
    .replaceAll("_", " ")
    .toUpperCase();

  const caActive = pathname.startsWith("/admin/current-affairs");

  useEffect(() => {
    let unsub = null;

    async function loadPendingFallbackForAdmin() {
      try {
        const base = ["artifacts", "ultra-study-point", "public", "data"];
        const [caReview, notesReview, quizReview, pyqReview] = await Promise.all([
          getCountFromServer(
            query(collection(db, ...base, "currentAffairs"), where("status", "==", "review"))
          ),
          getCountFromServer(
            query(collection(db, ...base, "master_notes"), where("status", "==", "review"))
          ),
          getCountFromServer(
            query(collection(db, ...base, "Quizzes"), where("status", "==", "review"))
          ),
          getCountFromServer(
            query(collection(db, ...base, "PYQs"), where("status", "==", "review"))
          ),
        ]);

        setDashboardBadgeCount(
          (caReview.data().count || 0) +
            (notesReview.data().count || 0) +
            (quizReview.data().count || 0) +
            (pyqReview.data().count || 0)
        );
      } catch {
        setDashboardBadgeCount(0);
      }
    }

    async function loadReturnedFallbackForEditor() {
      if (!user?.uid) {
        setDashboardBadgeCount(0);
        return;
      }
      try {
        const base = ["artifacts", "ultra-study-point", "public", "data"];
        const [ca, notes, quiz, pyq] = await Promise.all([
          getCountFromServer(
            query(
              collection(db, ...base, "currentAffairs"),
              where("createdBy.uid", "==", user.uid),
              where("review.status", "==", "rejected")
            )
          ),
          getCountFromServer(
            query(
              collection(db, ...base, "master_notes"),
              where("createdBy.uid", "==", user.uid),
              where("review.status", "==", "rejected")
            )
          ),
          getCountFromServer(
            query(
              collection(db, ...base, "Quizzes"),
              where("createdBy.uid", "==", user.uid),
              where("review.status", "==", "rejected")
            )
          ),
          getCountFromServer(
            query(
              collection(db, ...base, "PYQs"),
              where("createdBy.uid", "==", user.uid),
              where("review.status", "==", "rejected")
            )
          ),
        ]);
        setDashboardBadgeCount(
          (ca.data().count || 0) +
            (notes.data().count || 0) +
            (quiz.data().count || 0) +
            (pyq.data().count || 0)
        );
      } catch {
        setDashboardBadgeCount(0);
      }
    }

    if (role === "admin" || role === "super_admin") {
      const reviewRef = collection(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "review_queue"
      );
      const pendingQ = query(reviewRef, where("status", "==", "pending"));

      unsub = onSnapshot(
        pendingQ,
        (snap) => {
          const count = snap?.size || 0;
          if (count > 0) {
            setDashboardBadgeCount(count);
            return;
          }
          loadPendingFallbackForAdmin();
        },
        () => {
          loadPendingFallbackForAdmin();
        }
      );
    } else if (role === "editor" && user?.uid) {
      const reviewRef = collection(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "review_queue"
      );
      const rejectedQ = query(
        reviewRef,
        where("status", "==", "rejected"),
        where("createdBy.uid", "==", user.uid)
      );
      unsub = onSnapshot(
        rejectedQ,
        (snap) => {
          const count = snap?.size || 0;
          if (count > 0) {
            setDashboardBadgeCount(count);
            return;
          }
          loadReturnedFallbackForEditor();
        },
        () => {
          loadReturnedFallbackForEditor();
        }
      );
    } else {
      setDashboardBadgeCount(0);
      return undefined;
    }

    return () => {
      if (unsub) unsub();
    };
  }, [role, user?.uid]);

  return (
    <aside style={styles.sidebar}>
      <div style={styles.accountTopBlock}>
        <div style={styles.accountIdentityRow}>
          <div style={styles.accountName}>{user?.displayName || "Admin"}</div>
          <span style={styles.accountRole}>{roleLabel}</span>
        </div>
        <div style={styles.accountEmail}>{user?.email || "-"}</div>
      </div>

      <nav style={styles.nav}>
        <div style={{ ...styles.navGroup, ...styles.navGroupDashboard }}>
          <NavLink
            href="/admin/dashboard"
            label="Dashboard"
            badge={dashboardBadgeCount > 0 ? dashboardBadgeCount : null}
          />
        </div>

        <div style={{ ...styles.navGroup, ...styles.navGroupContent }}>
          {permissions?.canManageContent && (
            <NavLink
              href="/admin/current-affairs"
              label="Current Affairs"
              active={caActive}
            />
          )}

          {permissions?.canManageContent && (
            <NavLink href="/admin/notes" label="Notes" />
          )}
          {permissions?.canManageContent && (
            <NavLink href="/admin/quizzes" label="Quizzes" />
          )}
          {permissions?.canManageContent && (
            <NavLink href="/admin/pyqs" label="PYQs" />
          )}
        </div>

        {(permissions?.canViewMessages || permissions?.canManageUsers) && (
          <div style={{ ...styles.navGroup, ...styles.navGroupUsers }}>
            {permissions?.canViewMessages && (
              <NavLink href="/admin/messages" label="Contact Messages" />
            )}
            {permissions?.canManageUsers && (
              <NavLink href="/admin/users" label="Users" />
            )}
          </div>
        )}
      </nav>

      <button style={styles.logoutBtn} onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}

function NavLink({ href, label, small, badge, active: forcedActive }) {
  const pathname = usePathname();
  const active =
    typeof forcedActive === "boolean" ? forcedActive : pathname.startsWith(href);
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: small ? "6px 14px" : "9px 12px",
        fontSize: small ? 13 : 14,
        borderRadius: 8,
        textDecoration: "none",
        background: active
          ? "linear-gradient(90deg, rgba(37,99,235,0.28), rgba(37,99,235,0.08))"
          : hover
          ? "rgba(59,130,246,0.16)"
          : "transparent",
        fontWeight: active ? 700 : 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        color: active ? "#1e3a8a" : "inherit",
        border: active ? "1px solid #93c5fd" : "1px solid transparent",
        borderLeft: active ? "4px solid #2563eb" : "4px solid transparent",
        boxShadow: hover ? "0 1px 6px rgba(15,23,42,0.08)" : "none",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      {badge ? <span style={styles.badge}>{badge}</span> : null}
    </Link>
  );
}

const styles = {
  sidebar: {
    width: 250,
    position: "sticky",
    top: 84,
    maxHeight: "calc(100vh - 96px)",
    alignSelf: "flex-start",
    flexShrink: 0,
    borderRight: "1px solid #e5e7eb",
    padding: 14,
    borderRadius: 14,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    color: "#111827",
    overflowY: "auto",
  },
  accountTopBlock: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  accountIdentityRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  navGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 8,
    borderRadius: 12,
    border: "1px solid #dbe3ef",
    background: "#f8fafc",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.65)",
  },
  navGroupDashboard: {
    borderColor: "#bfdbfe",
    background: "#eff6ff",
  },
  navGroupContent: {
    borderColor: "#bae6fd",
    background: "#f0f9ff",
  },
  navGroupUsers: {
    borderColor: "#c4b5fd",
    background: "#f5f3ff",
  },
  badge: {
    marginLeft: "auto",
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 999,
    fontWeight: 700,
  },
  accountName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },
  accountRole: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
    color: "#1e3a8a",
    background: "#dbeafe",
    border: "1px solid #93c5fd",
    borderRadius: 999,
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    whiteSpace: "nowrap",
  },
  accountEmail: {
    fontSize: 12,
    color: "#64748b",
    wordBreak: "break-all",
  },
  logoutBtn: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)",
    color: "#9f1239",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    boxShadow: "0 4px 10px rgba(190, 24, 93, 0.12)",
  },
};
