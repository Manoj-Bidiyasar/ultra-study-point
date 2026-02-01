"use client";

import Link from "next/link";

const formatDailyDate = (caDate) => {
  if (!caDate) return { day: "??", month: "???" };
  const d = new Date(caDate);
  return {
    day: d.getDate(),
    month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
  };
};

const formatMonthlyLabel = (caDate) => {
  if (!caDate) return "Month YYYY Monthly Compilation";
  const d = new Date(caDate);
  const month = d.toLocaleString("default", { month: "long" });
  const year = d.getFullYear();
  return `${month} ${year} Monthly Compilation`;
};

export default function HomeClient({ dailyCA, monthlyCA, latestNotes }) {
  const formatCardDate = (value) => {
    if (!value) return { day: "??", month: "???" };
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { day: "??", month: "???" };
    }
    return {
      day: date.getDate(),
      month: date.toLocaleString("default", {
        month: "short",
      }).toUpperCase(),
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ================= BANNER (UNCHANGED) ================= */}
        <div className="bg-blue-700 rounded-2xl p-8 md:p-12 text-white mb-10 text-center shadow-sm border-b-4 border-blue-800">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Welcome to Ultra Study Point
          </h1>
          <p className="text-blue-100 text-base md:text-lg mb-8 max-w-2xl mx-auto opacity-90 leading-relaxed font-medium">
            Our daily dose of Current Affairs & Revision Notes tailored for seamless learning.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/current-affairs"
              className="bg-yellow-400 text-blue-900 font-bold py-2.5 px-8 rounded-lg text-sm shadow-md hover:bg-yellow-300"
            >
              Read Daily CA
            </Link>
            <Link
              href="/notes"
              className="bg-white text-blue-700 font-bold py-2.5 px-8 rounded-lg text-sm border border-gray-200 shadow-md hover:bg-gray-100"
            >
              Explore Notes Hub
            </Link>
          </div>
        </div>

        {/* ================= LATEST CURRENT AFFAIRS ================= */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <h2 className="text-xl font-bold uppercase tracking-tight">
                Latest Current Affairs
              </h2>
            </div>
            <Link
              href="/current-affairs"
              className="text-blue-600 font-bold text-xs uppercase tracking-wider hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* DAILY COLUMN */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
                Daily Updates
              </h3>
              <div className="space-y-3">
                {dailyCA
                  .filter(item => item.status === "published")
                  .map((item) => {
                    const itemDate = formatCardDate(item.caDate);
                    
                    return (
                      <Link
                        href={`/current-affairs/daily/${item.slug}`}
                        key={item.id}
                        className="bg-white p-2.5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-4 group"
                      >
                        <div className="w-14 h-14 border border-blue-200 rounded-lg overflow-hidden flex flex-col shrink-0 shadow-sm">
                          <div className="bg-blue-600 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-tighter">
                            {itemDate.month}
                          </div>
                          <div className="flex-1 bg-white flex items-center justify-center text-blue-700 text-xl font-black">
                            {itemDate.day}
                          </div>
                        </div>
                
                      <span className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-blue-700">
                        Daily Current Affairs
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* MONTHLY COLUMN */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">
                Monthly Compilations
              </h3>
              <div className="space-y-3">
                {monthlyCA
                  .filter(item => item.status === "published")
                  .map((item) => (
                  <Link
                    href={`/current-affairs/monthly/${item.slug}`}
                    key={item.id}
                    className="bg-white p-2.5 rounded-xl border border-gray-200 hover:border-red-600 hover:bg-red-50/20 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-14 h-14 bg-red-600 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm relative overflow-hidden group-hover:bg-red-700 transition-colors">
                      <span className="text-white text-2xl mb-[-4px]">📄</span>
                      <span className="text-[8px] font-black text-white uppercase tracking-tighter">
                        PDF
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#B91C1C]">
                        {formatMonthlyLabel(item.caDate)}
                      </span>
                      <span
                        className="text-[9px] font-bold uppercase mt-0.5 tracking-wide opacity-90"
                        style={{ color: "#B91C1C" }}
                      >
                        Full Month Magazine
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ================= STUDY NOTES ================= */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
              <h2 className="text-xl font-bold uppercase tracking-tight">
                New Study Notes
              </h2>
            </div>
            <Link
              href="/notes"
              className="text-blue-600 font-bold text-xs uppercase tracking-wider hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestNotes.map((note) => (
              <Link
                href={`/notes/${note.slug}`}
                key={note.id}
                className="bg-white p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-sm transition-all flex items-center gap-4 group"
              >
                <div className="w-14 h-14 border border-gray-100 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center text-2xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                  📖
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-sm leading-tight group-hover:text-indigo-700">
                    {note.title}
                  </h3>
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">
                    PDF Revision Note
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
