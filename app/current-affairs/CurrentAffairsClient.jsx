"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function CurrentAffairsClient({
  initialDaily,
  initialMonthly,
  initialTab,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ===================== STATE ===================== */
  const [dailyArticles, setDailyArticles] = useState(initialDaily || []);
  const [monthlyArticles, setMonthlyArticles] = useState(initialMonthly || []);
  const [activeTab, setActiveTab] = useState(
    initialTab === "monthly" ? "monthly" : "daily"
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  /* 🔁 KEEP TAB IN SYNC WITH URL */
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "monthly" || tabFromUrl === "daily") {
      setActiveTab(tabFromUrl);
      setHasMore(true); // 🔁 reset when tab changes
    }
  }, [searchParams]);


  /* ===================== DATE FORMATTERS ===================== */

  // Daily → uses caDate ONLY
  const formatDailyDate = (caDate) => {
    if (!caDate) return { day: "--", month: "--" };

    const d = new Date(caDate);
    if (isNaN(d.getTime())) return { day: "--", month: "---" };
    return {
      day: d.getDate(),
      month: d
        .toLocaleString("default", { month: "short" }).toUpperCase(),
    };
  };

  // Monthly → caDate = first day of month
  const formatMonthlyLabel = (caDate) => {
    if (!caDate) return "Month YYYY Month Compilation";

    const d = new Date(caDate);
    if (isNaN(d.getTime())) return "Month YYYY Monthly Compilation";

    const month = d.toLocaleString("default", { month: "long" });
    const year = d.getFullYear();
    return `${month} ${year} Month Compilation`;
  };

  /* ===================== TAB CHANGE ===================== */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/current-affairs?tab=${tab}`, { scroll: false });
  };

  /* ===================== LOAD MORE ===================== */
  const loadMore = async () => {
    setLoadingMore(true);
    
    const isDaily = activeTab === "daily";
    const list = isDaily ? dailyArticles : monthlyArticles;
    // 🔒 1. No data → stop
    if (!list || list.length === 0) {
      setLoadingMore(false);
      return;
    }
    
    const last = list[list.length - 1];
    
    // 🔒 2. Cursor fields must exist
    if (!last?.caDate || !last?.id) {
      console.warn("Pagination stopped: missing cursor", last);
      setLoadingMore(false);
      return;
    }
    // 🔒 3. caDate must be a valid date
    const cursorDate = new Date(last.caDate);
    if (isNaN(cursorDate.getTime())) {
      console.warn("Pagination stopped: invalid caDate", last.caDate);
      setLoadingMore(false);
      return;
    }
    
    try {
      const q = query(
        collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "currentAffairs"
        ),
        where("type", "==", activeTab),
        where("status", "==", "published"),
        orderBy("caDate", "desc"),
        orderBy("__name__", "desc"),
        startAfter(last.caDate, last.id),
        limit(isDaily ? 30 : 12)
      );
      const snap = await getDocs(q);
      
      const more = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      
      // 🔒 4. Extra safety: filter invalid docs
      const safeMore = more.filter(
        (doc) =>
          doc.status === "published" &&
          doc.caDate && !isNaN(new Date(doc.caDate).getTime())
      );
      // 🚫 No more documents
      if (safeMore.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      
      if (isDaily) {
        setDailyArticles((prev) => [...prev, ...safeMore]);
      } else {
        setMonthlyArticles((prev) => [...prev, ...safeMore]);
      }
    } catch (err) {
      console.error("Load more failed:", err);
    }
    
    setLoadingMore(false);
  };

  const articles =
    activeTab === "daily" ? dailyArticles : monthlyArticles;
  /* ===================== LOAD MORE GUARD ===================== */
  const canLoadMore =
    articles.length > 0 &&
    articles[articles.length - 1]?.caDate &&
    !isNaN(new Date(articles[articles.length - 1].caDate).getTime());
  
  /* ===================== LOAD MORE VISIBILITY ===================== */
  const shouldShowLoadMore =
    hasMore &&
    (activeTab === "daily"
      ? dailyArticles.length > 10
      : monthlyArticles.length > 5);


  /* ===================== TODAY (BANNER ONLY) ===================== */
  const today = new Date();
  const day = today.getDate();
  const month = today
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  const year = today.getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* ===================== BANNER ===================== */}
        <div className="bg-blue-50 rounded-2xl px-6 py-6 md:px-10 md:py-8 mb-8 flex items-center justify-between border border-blue-100 relative overflow-hidden">
          <div className="relative z-10 text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 mb-1">
              Current Affairs Hub
            </h1>

            <p className="text-blue-700 text-sm md:text-base font-medium mb-4 max-w-md">
              Stay up-to-date with our concise daily and monthly current affairs.
            </p>

            <div className="flex flex-col gap-1.5 font-bold text-xs md:text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-blue-500">✔</span> Daily Current Affairs
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">✔</span> Monthly PDF Compilations
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden flex flex-col">
              <div className="bg-blue-600 py-1.5 text-center">
                <span className="text-white font-black tracking-widest text-[10px] md:text-xs">
                  {month} {year}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center bg-white">
                <span className="text-4xl md:text-5xl font-black text-blue-600">
                  {day}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== TAB TOGGLE ===================== */}
        <div className="flex p-1 bg-gray-200 rounded-xl mb-8 max-w-[280px] mx-auto shadow-inner">
          <button
            onClick={() => handleTabChange("daily")}
            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === "daily"
                ? "bg-white shadow-md text-blue-700"
                : "text-gray-500"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => handleTabChange("monthly")}
            className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === "monthly"
                ? "bg-white shadow-md text-red-600"
                : "text-gray-500"
            }`}
          >
            Monthly
          </button>
        </div>

        {/* ===================== CARDS ===================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((item, index) => {
            const dailyDate = formatDailyDate(item.caDate);
            const monthlyLabel = formatMonthlyLabel(item.caDate);

            return (
              <Link
                key={`${item.type}-${item.id}-${item.caDate}-${index}`}
                href={
                  item.type === "monthly"
                    ? `/current-affairs/monthly/${item.slug}`
                    : `/current-affairs/daily/${item.slug}`
                }
                className={`bg-white p-3 rounded-xl border border-gray-200 transition-all flex items-center gap-4 group shadow-sm ${
                  activeTab === "daily"
                    ? "hover:border-blue-400"
                    : "hover:border-red-600"
                }`}
              >
                {activeTab === "daily" ? (
                  <div className="w-14 h-14 border border-blue-200 rounded-lg overflow-hidden flex flex-col shrink-0">
                    <div className="bg-blue-600 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-tighter">
                      {dailyDate.month}
                    </div>
                    <div className="flex-1 bg-white flex items-center justify-center text-blue-700 text-xl font-black">
                      {dailyDate.day}
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-red-600 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-white text-2xl mb-[-4px]">📄</span>
                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">
                      PDF
                    </span>
                  </div>
                )}

                <div className="flex flex-col">
                  <h3 className="font-bold text-sm leading-snug line-clamp-2">
                    {activeTab === "daily"
                      ? "Daily Current Affairs"
                      : monthlyLabel}
                  </h3>

                  {activeTab === "monthly" && (
                    <span className="text-[9px] font-bold uppercase mt-0.5 text-red-700">
                      Full Month Compilation
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* ===================== LOAD MORE / NO MORE ===================== */}
        {shouldShowLoadMore ? (
          <div className="flex justify-center mt-10">
            <button
              onClick={loadMore}
              disabled={loadingMore || !canLoadMore}
              className="px-8 py-2 rounded-full bg-blue-600 text-white text-sm font-bold disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      ) : (
        <div className="flex justify-center mt-10 text-sm font-semibold text-gray-500">
          No more results
        </div>
      )}
      </div>
    </div>
  );
}

