"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminSidebar({ permissions, role }) {
  const pathname = usePathname();

  const [caOpen, setCaOpen] = useState(
    pathname.startsWith("/admin/current-affairs")
  );

  return (
    <aside style={styles.sidebar}>

      {/* ROLE BADGE */}
      <div style={styles.roleBadge}>
        {role.replaceAll("_", " ").toUpperCase()}
      </div>

      {/* NAVIGATION */}
      <nav style={styles.nav}>
        <NavLink href="/admin/dashboard" label="Dashboard" />

        {/* CURRENT AFFAIRS */}
        {permissions?.canManageContent && (
          <>
            <div
              style={styles.dropdownHeader}
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

        {/* CONTACT */}
        {permissions?.canViewMessages && (
          <NavLink
            href="/admin/messages"
            label="Contact Messages"
          />
        )}

        {/* USERS */}
        {permissions?.canManageUsers && (
          <>
            <div style={styles.divider} />
            <NavLink href="/admin/users" label="Users" />
          </>
        )}
      </nav>

    </aside>
  );
}

/* ======================================================
   NAV LINK
====================================================== */

function NavLink({ href, label, small }) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      style={{
        padding: small ? "6px 16px" : "8px 12px",
        fontSize: small ? 13 : 14,
        borderRadius: 6,
        textDecoration: "none",
        background: active
          ? "rgba(99,102,241,0.15)"
          : "transparent",
        fontWeight: active ? 600 : 400,
        display: "block",
        color: "inherit",
      }}
    >
      {label}
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

    borderRight: "1px solid #e5e7eb",
    padding: 16,

    display: "flex",
    flexDirection: "column",

    background: "#ffffff",
    color: "#111827",

    overflowY: "auto",
  },

  roleBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 14,
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },

  dropdownHeader: {
    cursor: "pointer",
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 500,
    display: "flex",
    justifyContent: "space-between",
  },

  dropdownItems: {
    marginLeft: 6,
  },

  divider: {
    margin: "12px 0",
    borderTop: "1px solid #e5e7eb",
  },
};
