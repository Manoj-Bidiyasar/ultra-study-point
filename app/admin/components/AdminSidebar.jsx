"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AdminSidebar({ permissions, role }) {
  const pathname = usePathname();
  const [pendingReviews, setPendingReviews] = useState(0);

  const [caOpen, setCaOpen] = useState(
    pathname.startsWith("/admin/current-affairs")
  );
  const caActive = pathname.startsWith("/admin/current-affairs");

  useEffect(() => {
    async function loadPending() {
      if (role !== "admin" && role !== "super_admin") return;

      try {
        const reviewRef = collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "review_queue"
        );
        const snap = await getCountFromServer(
          query(reviewRef, where("status", "==", "pending"))
        );
        setPendingReviews(snap.data().count || 0);
      } catch (e) {
        setPendingReviews(0);
      }
    }

    loadPending();
  }, [role]);

  return (
    <aside style={styles.sidebar}>

      {/* ROLE BADGE */}
      <div style={styles.roleBadge}>
        {role.replaceAll("_", " ").toUpperCase()}
      </div>

      {/* NAVIGATION */}
      <nav style={styles.nav}>
        <div style={styles.navGroup}>
          <NavLink
            href="/admin/dashboard"
            label="Dashboard"
            badge={pendingReviews > 0 ? pendingReviews : null}
          />

          {/* CURRENT AFFAIRS */}
          {permissions?.canManageContent && (
            <>
              <div
                style={{
                  ...styles.dropdownHeader,
                  ...(caActive ? styles.dropdownActive : {}),
                }}
                onClick={() => setCaOpen(!caOpen)}
              >
                Current Affairs
                <span>{caOpen ? "▾" : "▸"}</span>
              </div>

              {caOpen && (
                <div style={styles.dropdownItems}>
                  <NavLink
                    href="/admin/current-affairs/daily"
                    label="Daily CA"
                    small
                  />
                  <NavLink
                    href="/admin/current-affairs/monthly"
                    label="Monthly CA"
                    small
                  />
                </div>
              )}
            </>
          )}

          {/* NOTES */}
          {permissions?.canManageContent && (
            <NavLink href="/admin/notes" label="Notes" />
          )}

          {/* QUIZZES */}
          {permissions?.canManageContent && (
            <NavLink href="/admin/quizzes" label="Quizzes" />
          )}

          {/* PYQs */}
          {permissions?.canManageContent && (
            <NavLink href="/admin/pyqs" label="PYQs" />
          )}

          {/* CONTACT */}
          {permissions?.canViewMessages && (
            <NavLink
              href="/admin/messages"
              label="Contact Messages"
            />
          )}
        </div>

        {/* USERS */}
        {permissions?.canManageUsers && (
          <div style={styles.navGroup}>
            <NavLink href="/admin/users" label="Users" />
          </div>
        )}
      </nav>

    </aside>
  );
}

/* ======================================================
   NAV LINK
====================================================== */

function NavLink({ href, label, small, badge }) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
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
        display: "block",
        color: active ? "#1e3a8a" : "inherit",
        border: active ? "1px solid #93c5fd" : "1px solid transparent",
        borderLeft: active ? "4px solid #2563eb" : "4px solid transparent",
        boxShadow: hover
          ? "0 1px 6px rgba(15,23,42,0.08)"
          : "none",
        transition: "all 0.15s ease",
      }}
    >
      <span>{label}</span>
      {badge ? <span style={styles.badge}>{badge}</span> : null}
    </Link>
  );
}

/* ======================================================
   STYLES
====================================================== */

const styles = {
  sidebar: {
    width: 230,
    height: "100vh",
    position: "sticky",
    top: 0,
    flexShrink: 0,

    borderRight: "1px solid #e5e7eb",
    padding: 16,

    display: "flex",
    flexDirection: "column",

    background: "#ffffff",
    color: "#111827",

    overflowY: "auto",
  },

  roleBadge: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.6,
    color: "#2563eb",
    marginBottom: 14,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "6px 10px",
    borderRadius: 999,
    alignSelf: "flex-start",
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
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
  },

  dropdownHeader: {
    cursor: "pointer",
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    justifyContent: "space-between",
    borderRadius: 8,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    transition: "all 0.15s ease",
  },

  dropdownActive: {
    background: "linear-gradient(90deg, rgba(16,185,129,0.24), rgba(16,185,129,0.08))",
    border: "1px solid #6ee7b7",
    color: "#064e3b",
  },

  dropdownItems: {
    marginLeft: 6,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  divider: {
    margin: "12px 0",
    borderTop: "1px solid #e5e7eb",
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
};
