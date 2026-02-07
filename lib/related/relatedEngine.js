import { getDailyCA, getMonthlyCA } from "./caSelectors";
import { getImportantNotes } from "./noteSelectors";
import {
  getDailyRelatedQuizzes,
  getMonthlyRelatedQuizzes,
} from "./quizSelectors";
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

    /* ================= QUIZZES ================= */

    let quizzes = [];
    if (pageType === "daily") {
      quizzes = await getDailyRelatedQuizzes({ pageCaDate });
    }
    if (pageType === "monthly") {
      quizzes = await getMonthlyRelatedQuizzes();
    }

    return {
      currentAffairs,
      importantNotes,
      quizzes,
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
  /* ================= AUTO (CACHED) ================= */

  const auto = await resolveAutoRelatedContent({
    pageType,
    pageCaDate: pageCaDate
      ? new Date(pageCaDate).toISOString().slice(0, 10) // 🔑 stable cache key
      : null,
    subject,
    tags,
    device,
  });

  /* ================= MERGE (MANUAL + AUTO) ================= */

  const mergeByKey = (manual = [], autoList = [], keyFn) => {
    const out = [];
    const seen = new Set();

    [...manual, ...autoList].forEach((item) => {
      const key = keyFn(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });

    return out;
  };

  const currentAffairs = mergeByKey(
    manualCA || [],
    auto.currentAffairs || [],
    (i) => `${i.type || "ca"}:${i.slug || i.id || ""}`
  );

  const importantNotes = mergeByKey(
    manualNotes || [],
    auto.importantNotes || [],
    (i) => `${i.slug || i.id || ""}`
  );

  return {
    currentAffairs,
    importantNotes,
    quizzes: auto.quizzes || [],
  };
}
