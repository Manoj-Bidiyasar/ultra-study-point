import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

export const dynamic = "force-dynamic";

const CATEGORY_MAP = {
  "current-affairs": {
    title: "Current Affairs",
    desc: "Daily and monthly current affairs quizzes.",
    categories: ["Daily CA", "Monthly CA"],
  },
  "general-science": {
    title: "General Science",
    desc: "Physics, Biology, Chemistry practice sets.",
    categories: ["General Science"],
  },
  "indian-gk": {
    title: "Indian GK",
    desc: "Polity, History, Geography practice sets.",
    categories: ["Indian GK"],
  },
  "rajasthan-gk": {
    title: "Rajasthan GK",
    desc: "Culture, Polity, History practice sets.",
    categories: ["Rajasthan GK"],
  },
  miscellaneous: {
    title: "Miscellaneous",
    desc: "Awards, firsts, and important days.",
    categories: ["Miscellaneous"],
  },
  exams: {
    title: "Exams by Pattern",
    desc: "SSC, Patwar, RPSC and other exam mocks.",
    categories: ["Exams by Pattern", "Exam", "Mock"],
  },
  "mock-marathon": {
    title: "Mock Marathon",
    desc: "Full-length practice tests.",
    categories: ["Mock Marathon", "Mock"],
  },
  "quick-revision": {
    title: "Quick Revision",
    desc: "Short quizzes for quick practice.",
    categories: ["Quick Revision"],
  },
  math: {
    title: "Math",
    desc: "Arithmetic, algebra, geometry practice sets.",
    categories: ["Math", "Mathematics"],
  },
  reasoning: {
    title: "Reasoning",
    desc: "Logical, verbal, and non-verbal practice sets.",
    categories: ["Reasoning", "Logical Reasoning"],
  },
};

const SUBCATEGORY_MAP = {
  "current-affairs": ["Daily CA", "Monthly CA"],
  "general-science": ["Physics", "Chemistry", "Biology"],
  "indian-gk": ["Polity", "Economy", "Geography", "History", "Culture"],
  "rajasthan-gk": ["History", "Geography", "Polity", "Economy", "Culture"],
  miscellaneous: ["Awards", "First in India", "Important Days"],
  exams: ["SSC", "Patwar", "RPSC", "Railways"],
  "mock-marathon": ["Full Length", "Sectional"],
  "quick-revision": ["One Liners", "Mixed Practice"],
  math: ["Arithmetic", "Algebra", "Geometry", "Trigonometry", "Mensuration"],
  reasoning: ["Logical", "Verbal", "Non-Verbal", "Analytical"],
};

export default async function QuizCategoryPage(props) {
  const slug = props?.params?.slug || "";
  const searchParams = await props.searchParams;
  const view =
    searchParams?.view === "full"
      ? "full"
      : "all";
  const selectedExam =
    typeof searchParams?.exam === "string" ? searchParams.exam : "";
  const meta = CATEGORY_MAP[slug];

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] text-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="rounded-3xl border border-gray-200 bg-white p-8">
            <h1 className="text-2xl font-semibold">Category not found</h1>
            <p className="mt-2 text-sm text-gray-600">
              Please go back to the quiz page and choose a valid category.
            </p>
            <Link
              href="/quiz"
              className="mt-4 inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Back to Quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Quiz service unavailable.
      </div>
    );
  }

  const snap = await adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("Quizzes")
    .where("status", "==", "published")
    .orderBy("updatedAt", "desc")
    .limit(30)
    .get();

  const allQuizzes = snap.docs.map((doc) =>
    serializeFirestoreData({ id: doc.id, ...doc.data() })
  );

  const filtered = allQuizzes.filter((q) => {
    const label = q.quizMeta?.category || q.category || "";
    return meta.categories.some((cat) => label.includes(cat));
  });

  const subcats = SUBCATEGORY_MAP[slug] || [];
  const showSubcats = subcats.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-7 md:p-9 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Quiz Category
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
                {meta.title}
              </h1>
              <p className="mt-2 text-sm text-gray-600 max-w-xl">
                {meta.desc}
              </p>
            </div>
            <Link
              href="/quiz"
              className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-400"
            >
              Back to Quizzes
            </Link>
          </div>

          {/* Toggles removed to avoid duplicate All/Full Test rows */}

          {showSubcats && slug !== "exams" && (
            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto text-xs font-semibold">
              <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-600">
                All
              </span>
              <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-600">
                Full Test
              </span>
              {subcats.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-gray-300 px-3 py-1 text-gray-600"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {showSubcats && slug === "exams" && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Link
                href={`/quiz/category/${slug}`}
                className={`rounded-full border px-3 py-1 transition ${
                  !selectedExam
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                All
              </Link>
              {subcats.map((item) => {
                const isActive = selectedExam === item;
                return (
                  <Link
                    key={item}
                    href={`/quiz/category/${slug}?exam=${encodeURIComponent(
                      item
                    )}`}
                    className={`rounded-full border px-3 py-1 transition ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {item}
                  </Link>
                );
              })}
            </div>
          )}

          {showSubcats && slug === "exams" && selectedExam && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-600">
                Full Test
              </span>
              {["GS", "Math", "Reasoning", "English", "Hindi"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-gray-300 px-3 py-1 text-gray-600"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
              No quizzes published yet in this category.
            </div>
          )}

          {filtered.map((q) => (
            <Link
              key={q.id}
              href={`/quiz/${q.id}`}
              className="group rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-2xl hover:shadow-emerald-500/10"
            >
              <div className="text-base font-semibold text-gray-900 group-hover:text-emerald-700">
                {q.title || "Untitled Quiz"}
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
                {(q.quizMeta?.category || q.category) && (
                  <span className="rounded-full border border-gray-300 px-2 py-0.5">
                    {q.quizMeta?.category || q.category}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>Start quiz</span>
                <span className="text-emerald-600 group-hover:translate-x-1 transition">
                  {"\u2192"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
