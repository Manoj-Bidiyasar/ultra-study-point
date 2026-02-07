export const breadcrumbConfig = {
  /* ================= DAILY CURRENT AFFAIRS ================= */
  daily: {
    // ❌ Site-wide hierarchy (NOT for article pages)
    base: [
      { label: "Home", href: "/" },
      { label: "Current Affairs", href: "/current-affairs" },
      { label: "Daily", href: "/current-affairs" },
    ],

    // ✅ Contextual (USE for Daily article pages)
    baseNoHome: [
      { label: "Current Affairs", href: "/current-affairs" },
      { label: "Daily", href: "/current-affairs" },
    ],
  },

  /* ================= MONTHLY CURRENT AFFAIRS ================= */
  monthly: {
    // ❌ Site-wide hierarchy (NOT for article pages)
    base: [
      { label: "Home", href: "/" },
      { label: "Current Affairs", href: "/current-affairs" },
      { label: "Monthly", href: "/current-affairs?tab=monthly" },
    ],

    // ✅ Contextual (USE for Monthly pages)
    baseNoHome: [
      { label: "Current Affairs", href: "/current-affairs" },
      { label: "Monthly", href: "/current-affairs?tab=monthly" },
    ],
  },

  /* ================= NOTES ================= */
  notes: {
    // ✅ Default Notes breadcrumb (KEEP Home)
    base: [
      { label: "Home", href: "/" },
      { label: "Notes", href: "/notes" },
    ],

    // ✅ Contextual Notes breadcrumb (NO Home)
    // Use this for deep notes pages if you want
    baseNoHome: [
      { label: "Notes", href: "/notes" },
    ],
  },
};
