import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

export const dynamic = "force-dynamic";

export default async function QuizListPage(props) {
  const searchParams = await props.searchParams;
  const adminDb = getAdminDb();
  if (!adminDb) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Quiz service unavailable.
      </div>
    );
  }

  const category =
    typeof searchParams?.category === "string"
      ? searchParams.category
      : "";
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

  if (category) {
    quizQuery = quizQuery.where(
      "quizMeta.category",
      "==",
      category
    );
  } else {
    quizQuery = quizQuery.orderBy("updatedAt", "desc");
  }

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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.25),transparent_45%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.2),transparent_35%)]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-8 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-8 md:pt-12 md:pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Practice Quizzes
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                Quizzes built for real exam pressure.
              </h1>
              <p className="mt-3 text-base md:text-lg text-gray-600 max-w-xl">
                Topic-wise practice, exam-style mocks, and smart revision cycles.
                Fast, clean, and built to grow with your preparation.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
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

              <div className="mt-8 grid gap-3 text-sm text-gray-600">
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

            <div className="relative rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl">
              <div className="absolute -top-5 -right-5 h-14 w-14 rounded-2xl bg-emerald-100 border border-emerald-200" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-gray-500">
                    Today’s Focus
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    Current Affairs Sprint
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    15 questions • 12 minutes
                  </div>
                </div>
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400/70 to-sky-500/70 p-[2px]">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-emerald-600 font-semibold">
                    92%
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  "Adaptive difficulty hints",
                  "Speed vs accuracy balance",
                  "Auto-saved progress on mobile",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
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

      <div className="max-w-6xl mx-auto px-6 pb-16">
        <section className="pt-8 md:pt-10">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-emerald-600">
                  Future-ready practice
                </div>
                <h3 className="mt-3 text-2xl md:text-3xl font-semibold">
                  Save progress, practice anywhere, and track growth.
                </h3>
                <p className="mt-3 text-sm text-gray-600 max-w-2xl">
                  Clean layouts and fast loading keep your quizzes smooth even
                  on slower connections.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#latest-quizzes"
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition hover:-translate-y-1"
                >
                  Start Practicing
                </a>
                <a
                  href="/student/login"
                  className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
                >
                  Save My Progress
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-8 md:pt-10">
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

        <section id="latest-quizzes" className="pt-8 md:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">Latest Quizzes</h2>
              <p className="text-sm text-gray-600 mt-1">
                Freshly published practice sets.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Updated whenever new quizzes are published.
            </div>
          </div>

          <form
            action="/quiz"
            className="mt-4 flex flex-wrap items-center gap-3"
          >
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search by topic, exam, or keyword"
              className="w-full md:w-80 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400"
            />
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            <button
              type="submit"
              className="rounded-full border border-emerald-500 bg-emerald-500 px-4 py-2 text-xs font-semibold text-white"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { label: "All Quizzes", value: "" },
              { label: "Daily CA", value: "Daily CA" },
              { label: "Monthly CA", value: "Monthly CA" },
            ].map((item) => {
              const isActive =
                (category || "") === item.value;
              const href = item.value
                ? `/quiz?category=${encodeURIComponent(
                    item.value
                  )}`
                : "/quiz";

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`rounded-full border px-3 py-1 transition ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleQuizzes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                No quizzes published yet
                {category ? ` in ${category}.` : "."}
              </div>
            )}

            {visibleQuizzes.map((q) => (
              <Link
                key={q.id}
                href={`/quiz/${q.id}`}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-2xl hover:shadow-emerald-500/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
                      {q.title || "Untitled Quiz"}
                    </div>
                    {q.description && (
                      <div className="text-sm text-gray-600 mt-2">
                        {q.description}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      {Number.isFinite(
                        q.quizMeta?.questions?.length
                      ) && (
                        <span className="rounded-full border border-gray-300 px-2 py-0.5">
                          {q.quizMeta.questions.length} Qs
                        </span>
                      )}
                      {(q.quizMeta?.category || q.category) && (
                        <span className="rounded-full border border-gray-300 px-2 py-0.5">
                          {q.quizMeta?.category || q.category}
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
                  <div className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-500">
                    {q.durationMinutes
                      ? `${q.durationMinutes} min`
                      : "No time limit"}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
                  <span>Start quiz</span>
                  <span className="text-emerald-600 group-hover:translate-x-1 transition">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="quiz-categories" className="pt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">Quiz Categories</h2>
              <p className="text-sm text-gray-600 mt-1">
                Pick the path that matches your exam plan.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              New categories can be added anytime.
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Current Affairs",
                desc: "Daily, weekly, monthly updates",
                accent: "from-rose-500/30 to-amber-400/20",
              },
              {
                title: "General Science",
                desc: "Physics, Biology, Chemistry",
                accent: "from-sky-500/30 to-indigo-400/20",
              },
              {
                title: "Indian GK",
                desc: "Polity, History, Geography",
                accent: "from-emerald-500/30 to-lime-400/20",
              },
              {
                title: "Rajasthan GK",
                desc: "Culture, Polity, History",
                accent: "from-amber-500/30 to-orange-400/20",
              },
              {
                title: "Miscellaneous",
                desc: "Awards, firsts, important days",
                accent: "from-pink-500/30 to-fuchsia-400/20",
              },
              {
                title: "Daily CA",
                desc: "Today’s current affairs quiz",
                accent: "from-emerald-400/40 to-sky-400/30",
                highlight: true,
              },
              {
                title: "Monthly CA",
                desc: "Monthly compilation quiz",
                accent: "from-emerald-400/30 to-lime-400/20",
                highlight: true,
              },
              {
                title: "Exams by Pattern",
                desc: "SSC, Patwar, RPSC, etc.",
                accent: "from-violet-500/30 to-sky-400/20",
              },
              {
                title: "Mock Marathon",
                desc: "Full-length practice tests",
                accent: "from-teal-500/30 to-cyan-400/20",
              },
              {
                title: "Quick Revision",
                desc: "Short quizzes for speed",
                accent: "from-emerald-500/20 to-blue-400/20",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border ${
                  card.highlight
                    ? "border-emerald-400/40 shadow-lg shadow-emerald-500/10"
                    : "border-gray-200"
                } bg-white p-5`}
              >
                <div
                  className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.accent} border border-gray-200`}
                />
                <div className="mt-4 text-lg font-semibold text-gray-900">
                  {card.title}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
