"use client";

import Link from "next/link";

const formatMonthlyLabel = (caDate) => {
  if (!caDate) return "Month YYYY Monthly Compilation";
  const d = new Date(caDate);
  if (isNaN(d.getTime())) return "Month YYYY Monthly Compilation";
  const month = d.toLocaleString("default", { month: "long" });
  const year = d.getFullYear();
  return `${month} ${year} Monthly Compilation`;
};

export default function HomeClient({
  dailyCA,
  monthlyCA,
  latestNotes,
  latestQuizzes,
  latestPyqs,
}) {
  const hasNotes = Array.isArray(latestNotes) && latestNotes.length > 0;
  const hasQuizzes = Array.isArray(latestQuizzes) && latestQuizzes.length > 0;
  const hasPyqs = Array.isArray(latestPyqs) && latestPyqs.length > 0;

  const formatCardDate = (value) => {
    if (!value) return { day: "??", month: "???" };
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : new Date(value);
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
          <div className="relative px-6 py-8 md:px-10 md:py-12 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-[2.35rem] font-extrabold tracking-tight leading-tight">
                Study faster with current affairs, notes, PYQs, and smart
                quizzes.
              </h1>
              <p className="mt-3 text-gray-600 text-base md:text-lg max-w-xl">
                Focused preparation for SSC, Patwar, RPSC, Railways, and more.
                Clean content, quick revision, and confidence-building practice.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <Link
                  href="/current-affairs"
                  className="w-full inline-flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold px-3 py-2 text-xs text-center shadow hover:bg-blue-700 sm:w-auto sm:px-5 sm:text-sm"
                >
                  Read Current Affairs
                </Link>
                {hasNotes && (
                  <Link
                    href="/notes"
                    className="w-full inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-700 font-semibold px-3 py-2 text-xs text-center hover:border-gray-400 sm:w-auto sm:px-5 sm:text-sm"
                  >
                    Explore Notes
                  </Link>
                )}
                {hasQuizzes && (
                  <Link
                    href="/quiz"
                    className="w-full inline-flex items-center justify-center rounded-full border border-emerald-300 text-emerald-700 font-semibold px-3 py-2 text-xs text-center hover:border-emerald-400 hover:text-emerald-800 sm:w-auto sm:px-5 sm:text-sm"
                  >
                    Take a Quiz
                  </Link>
                )}
                {hasPyqs && (
                  <Link
                    href="/pyqs"
                    className="w-full inline-flex items-center justify-center rounded-full border border-amber-300 text-amber-700 font-semibold px-3 py-2 text-xs text-center hover:border-amber-400 hover:text-amber-800 sm:w-auto sm:px-5 sm:text-sm"
                  >
                    Explore PYQs
                  </Link>
                )}
              </div>
            </div>
            <div className="hidden sm:block bg-white/90 border border-blue-100 rounded-2xl p-5 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-500">
                Prep Highlights
              </div>
              <div className="mt-2 text-lg font-semibold">Exam Prep Essentials</div>
              <div className="mt-4 grid gap-3">
                {[
                  "Daily current affairs updates",
                  "Topic-wise notes and revision packs",
                  "PYQs and mock quizzes",
                ].map((item) => (
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
                    const dailyPath = `/current-affairs/daily/${item.slug || item.id}`;
                    return (
                      <Link
                        href={dailyPath}
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
                    href={`/current-affairs/monthly/${item.slug || item.id}`}
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
        {hasNotes && (
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
                href={`/notes/${note.slug || note.id}`}
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
        )}

        {/* Quizzes */}
        {hasQuizzes && (
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
        )}
      </div>
    </div>
  );
}

