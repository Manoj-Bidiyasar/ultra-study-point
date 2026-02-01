import { getDailyCA, getMonthlyCA } from "./caSelectors";
import { getImportantNotes } from "./noteSelectors";
import { unstable_cache } from "next/cache";

/* =====================================================
   CACHED AUTO RESOLVER (DO NOT EXPORT DIRECTLY)
===================================================== */

const resolveAutoRelatedContent = unstable_cache(
  async ({ pageType, pageCaDate, subject, tags, device }) => {
    /* ================= CURRENT AFFAIRS ================= */

    let currentAffairs = [];

    const daily = await getDailyCA({
      pageType,
      pageCaDate,
      device,
    });

    const monthly = await getMonthlyCA({
      pageType,
      pageCaDate,
      device,
    });

    currentAffairs = [...daily, ...monthly];

    /* ================= IMPORTANT NOTES ================= */

    const importantNotes = await getImportantNotes({
      pageType,
      subject,
      tags,
      device,
    });

    return {
      currentAffairs,
      importantNotes,
    };
  },
  ["related-content"], // base cache key
  {
    revalidate: 3600, // ✅ 1 hour cache
  }
);

/* =====================================================
   PUBLIC API (THIS IS WHAT page.js CALLS)
===================================================== */

export async function resolveRelatedContent({
  pageType,        // "daily" | "monthly" | "notes"
  pageCaDate,      // Date | null
  subject,
  tags = [],
  manualCA = null,
  manualNotes = null,
  device = "mobile", // "mobile" | "desktop"
}) {
  /* ================= MANUAL OVERRIDE ================= */

  if (manualCA?.length || manualNotes?.length) {
    return {
      currentAffairs: manualCA || [],
      importantNotes: manualNotes || [],
    };
  }

  /* ================= AUTO (CACHED) ================= */

  return resolveAutoRelatedContent({
    pageType,
    pageCaDate: pageCaDate
      ? new Date(pageCaDate).toISOString().slice(0, 10) // 🔑 stable cache key
      : null,
    subject,
    tags,
    device,
  });
}
