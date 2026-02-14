import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import QuizClientFallback from "./QuizClientFallback";

export const dynamic = "force-dynamic";

export default async function QuizListPage(props) {
  const searchParams = await props.searchParams;
  const adminDb = getAdminDb();
  if (!adminDb) {
    return (
      <QuizClientFallback searchParams={searchParams} />
    );
  }

  const searchQuery =
    typeof searchParams?.q === "string"
      ? searchParams.q.trim()
      : "";

  let quizQuery = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("Quizzes")
    .where("status", "==", "published");

  quizQuery = quizQuery.orderBy("updatedAt", "desc");

  const snap = await quizQuery.get();

  const quizzes = snap.docs.map((doc) =>
    serializeFirestoreData({ id: doc.id, ...doc.data() })
  );
  const visibleQuizzes = searchQuery
    ? quizzes.filter((q) => {
        const hay = `${q.title || ""} ${q.description || ""}`.toLowerCase();
        return hay.includes(searchQuery.toLowerCase());
      })
    : quizzes;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-emerald-100 shadow-sm mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_45%)]" />

          <div className="relative px-5 py-5 sm:px-6 sm:py-6 md:px-10 md:py-9">
            <div className="mt-0 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight whitespace-nowrap">
                  Quizzes built for real exam pressure.
                </h1>
                <p className="mt-2 text-sm sm:text-base md:text-lg text-gray-600 max-w-xl">
                  Topic-wise practice, exam-style mocks, and smart revision cycles.
                  Fast, clean, and built to grow with your preparation.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href="#latest-quizzes"
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-400/20 transition hover:translate-y-[-1px]"
                  >
                    Browse Latest
                  </a>
                  <a
                    href="#quiz-categories"
                    className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                  >
                    View Categories
                  </a>
                </div>

                <div className="mt-4 grid gap-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Daily current affairs + monthly revision packs
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    Subject-wise quizzes with short explanations
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Exam-specific mocks for SSC, Patwar, RPSC, and more
                  </div>
                </div>
              </div>

            <div className="hidden sm:block relative rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl bg-emerald-100 border border-emerald-200" />
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-500">
                  Quiz Focus
                </div>
                <div className="mt-2 text-xl font-semibold">
                  Smart Quiz Practice
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Build speed, accuracy, and exam confidence.
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {[
                  "Practice with timed quiz sets",
                  "Review answers and explanations",
                  "Track and improve weak topics",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

        <div className="pb-16">
        <section className="pt-4 sm:pt-8 md:pt-10 hidden sm:block">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Read Today’s CA",
                desc: "Start with daily or monthly current affairs notes.",
              },
              {
                title: "Take the Quiz",
                desc: "Practice with the quiz linked to the same topic.",
              },
              {
                title: "Review & Improve",
                desc: "Check answers, revise weak areas, repeat.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {item.title}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-3 sm:pt-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <form action="/quiz" className="flex items-center gap-2">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by topic, exam, or keyword"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="rounded-full border border-emerald-500 bg-emerald-500 px-4 py-2 text-xs font-semibold text-white"
              >
                <span className="sm:hidden" aria-hidden="true">
                  🔍
                </span>
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
          </div>
        </section>

        <section id="latest-quizzes" className="pt-3 sm:pt-8 md:pt-10 sm:border-t sm:border-gray-200 sm:pt-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">Latest Quizzes</h2>
            <p className="text-sm text-gray-600 mt-1">
              Freshly published practice sets.
            </p>
            <Link
              href="/quiz"
              className="mt-2 inline-flex text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View all quizzes →
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {visibleQuizzes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                No quizzes published yet.
              </div>
            )}

            {visibleQuizzes.slice(0, 10).map((q, index) => {
              const categoryLabel = q.quizMeta?.category || q.category || "";
              const isDailyCa = categoryLabel === "Daily CA";
              const isMonthlyCa = categoryLabel === "Monthly CA";
              const badgeLabel = isDailyCa
                ? "Daily CA"
                : isMonthlyCa
                ? "Monthly CA"
                : "";
              const badgeClass = isDailyCa
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : isMonthlyCa
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-gray-300 bg-white text-gray-500";

              const cardClass = index >= 6 ? "hidden lg:block" : "";

              return (
                <Link
                  key={q.id}
                  href={`/quiz/${q.id}`}
                className={`group rounded-2xl border border-gray-100 bg-white p-4 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-2xl hover:shadow-emerald-500/10 ${cardClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-gray-900 group-hover:text-emerald-700">
                        {q.title || "Untitled Quiz"}
                      </div>
                      {badgeLabel && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                        >
                          {isDailyCa ? (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3 w-3 text-emerald-600"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3 w-3 text-sky-600"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1zm12.5 7h-15v10.5c0 .55.45 1 1 1h13c.55 0 1-.45 1-1V9zm0-2.5v-.5a.5.5 0 0 0-.5-.5H18v1a1 1 0 1 1-2 0V5H8v1a1 1 0 1 1-2 0V5H4.5a.5.5 0 0 0-.5.5V6.5h15.5z" />
                            </svg>
                          )}
                          {badgeLabel}
                        </span>
                      )}
                    </div>
                    {q.description && (
                      <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {q.description}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      {Number.isFinite(q.quizMeta?.questions?.length) && (
                        <span className="rounded-full border border-gray-300 px-2 py-0.5">
                          {q.quizMeta.questions.length} Qs
                        </span>
                      )}
                      {categoryLabel && !badgeLabel && (
                        <span className="rounded-full border border-gray-300 px-2 py-0.5">
                          {categoryLabel}
                        </span>
                      )}
                      {Array.isArray(q.tags) &&
                        q.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-gray-300 px-2 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="rounded-full border border-gray-300 px-3 py-1 text-[11px] text-gray-500">
                    {q.durationMinutes
                      ? `${q.durationMinutes} min`
                      : "No time limit"}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span>Start quiz</span>
                  <span className="text-emerald-600 group-hover:translate-x-1 transition">
                    →
                  </span>
                </div>
              </Link>
              );
            })}
          </div>
        </section>

        <section id="quiz-categories" className="pt-4 sm:pt-10 sm:border-t sm:border-gray-200 sm:pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">Quiz Categories</h2>
              <p className="text-sm text-gray-600 mt-1">
                Pick the path that matches your exam plan.
              </p>
            </div>
            <div className="hidden sm:block text-xs text-gray-500">
              New categories can be added anytime.
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Current Affairs",
                desc: "Daily, weekly, monthly updates",
                accent: "from-rose-500/30 to-amber-400/20",
                slug: "current-affairs",
                icon: "📰",
              },
              {
                title: "General Science",
                desc: "Physics, Biology, Chemistry",
                accent: "from-sky-500/30 to-indigo-400/20",
                slug: "general-science",
                icon: "🧪",
              },
              {
                title: "Indian GK",
                desc: "Polity, History, Geography",
                accent: "from-emerald-500/30 to-lime-400/20",
                slug: "indian-gk",
                icon: "🇮🇳",
              },
              {
                title: "Rajasthan GK",
                desc: "Culture, Polity, History",
                accent: "from-amber-500/30 to-orange-400/20",
                slug: "rajasthan-gk",
                icon: "🏰",
              },
              {
                title: "Miscellaneous",
                desc: "Awards, firsts, important days",
                accent: "from-pink-500/30 to-fuchsia-400/20",
                slug: "miscellaneous",
                icon: "✨",
              },
              {
                title: "Exams by Pattern",
                desc: "SSC, Patwar, RPSC, etc.",
                accent: "from-violet-500/30 to-sky-400/20",
                slug: "exams",
                icon: "📝",
              },
              {
                title: "Mock Marathon",
                desc: "Full-length practice tests",
                accent: "from-teal-500/30 to-cyan-400/20",
                slug: "mock-marathon",
                icon: "⏱️",
              },
              {
                title: "Quick Revision",
                desc: "Short quizzes for speed",
                accent: "from-emerald-500/20 to-blue-400/20",
                slug: "quick-revision",
                icon: "⚡",
              },
              {
                title: "Math",
                desc: "Arithmetic, algebra, geometry",
                accent: "from-blue-500/30 to-cyan-400/20",
                slug: "math",
                icon: "➗",
              },
              {
                title: "Reasoning",
                desc: "Logical, verbal, non-verbal",
                accent: "from-purple-500/30 to-indigo-400/20",
                slug: "reasoning",
                icon: "🧠",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={`/quiz/category/${card.slug}`}
                className="rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/10"
              >
                <div
                  className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.accent} border border-gray-200 flex items-center justify-center text-xl`}
                >
                  {card.icon}
                </div>
                <div className="mt-4 text-lg font-semibold text-gray-950">
                  {card.title}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {card.desc}
                </div>
              </Link>
            ))}
          </div>
        </section>

        </div>
      </div>
    </div>
  );
}

