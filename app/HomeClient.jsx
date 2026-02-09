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

export default function HomeClient({
  dailyCA,
  monthlyCA,
  latestNotes,
  latestQuizzes,
}) {
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
    <div className="min-h-screen bg-[#f5f7fb] pb-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-blue-100 shadow-sm mb-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_45%)]" />
          <div className="relative px-6 py-8 md:px-10 md:py-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Ultra Study Point
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
                Study faster with daily CA, notes, and smart quizzes.
              </h1>
              <p className="mt-3 text-gray-600 text-base md:text-lg max-w-xl">
                Focused preparation for SSC, Patwar, RPSC, Railways, and more.
                Clean content, quick revision, and confidence-building practice.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/current-affairs"
                  className="rounded-full bg-blue-600 text-white font-semibold px-5 py-2 text-sm shadow hover:bg-blue-700"
                >
                  Read Current Affairs
                </Link>
                <Link
                  href="/notes"
                  className="rounded-full border border-gray-300 text-gray-700 font-semibold px-5 py-2 text-sm hover:border-gray-400"
                >
                  Explore Notes
                </Link>
                <Link
                  href="/quiz"
                  className="rounded-full border border-emerald-300 text-emerald-700 font-semibold px-5 py-2 text-sm hover:border-emerald-400 hover:text-emerald-800"
                >
                  Take a Quiz
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>Short practice sets to build speed and accuracy.</span>
                <Link href="/notes" className="text-blue-600 font-semibold hover:underline">
                  New here? Start with Notes →
                </Link>
              </div>
              <div className="mt-6 grid gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Daily current affairs updates
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Topic-wise notes and revision packs
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  PYQs and mock quizzes
                </div>
              </div>
            </div>
            <div className="hidden sm:block bg-white/90 border border-blue-100 rounded-2xl p-5 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-500">
                Today’s Focus
              </div>
              <div className="mt-2 text-lg font-semibold">Current Affairs Sprint</div>
              <div className="mt-4 grid gap-3">
                {["Fast revision", "Exam-focused", "Track improvements"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Affairs */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📌</span>
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
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
                Daily Updates
              </h3>
              <div className="space-y-3">
                {dailyCA
                  .filter((item) => item.status === "published")
                  .map((item) => {
                    const itemDate = formatCardDate(item.caDate);
                    return (
                      <Link
                        href={`/current-affairs/daily/${item.slug}`}
                        key={item.id}
                        className="bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-4 group"
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

            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">
                Monthly Compilations
              </h3>
              <div className="space-y-3">
                {monthlyCA
                  .filter((item) => item.status === "published")
                  .map((item) => (
                  <Link
                    href={`/current-affairs/monthly/${item.slug}`}
                    key={item.id}
                    className="bg-white p-3 rounded-xl border border-gray-200 hover:border-red-600 hover:bg-red-50/20 transition-all flex items-center gap-4 group"
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

        {/* Notes */}
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

        {/* Quizzes */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📝</span>
              <h2 className="text-xl font-bold uppercase tracking-tight">
                Latest Quizzes
              </h2>
            </div>
            <Link
              href="/quiz"
              className="text-blue-600 font-bold text-xs uppercase tracking-wider hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(latestQuizzes || []).slice(0, 6).map((quiz, index) => (
              <Link
                href={`/quiz/${quiz.id}`}
                key={quiz.id}
                className={`bg-white p-3 rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-sm transition-all flex items-center gap-4 group ${
                  index >= 4 ? "hidden md:flex" : ""
                }`}
              >
                <div className="w-14 h-14 border border-emerald-100 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  ✓
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-sm leading-tight group-hover:text-emerald-700">
                    {quiz.title || "Untitled Quiz"}
                  </h3>
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">
                    Practice Quiz
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
