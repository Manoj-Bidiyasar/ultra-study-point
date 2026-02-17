import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { QUIZ_TAXONOMY_MAP } from "@/lib/quiz/taxonomy";

export const dynamic = "force-dynamic";

export default async function QuizCategoryPage(props) {
  const slug = props?.params?.slug || "";
  const searchParams = await props.searchParams;
  const view =
    searchParams?.view === "full"
      ? "full"
      : "all";
  const selectedSubcategoryId =
    typeof searchParams?.subcat === "string" ? searchParams.subcat : "";
  const selectedExam =
    typeof searchParams?.exam === "string" ? searchParams.exam : "";
  const meta = QUIZ_TAXONOMY_MAP[slug];

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

  const filteredByCategory = allQuizzes.filter((q) => {
    const categoryId = String(q.quizMeta?.categoryId || q.categoryId || "").trim();
    const label = q.quizMeta?.category || q.category || "";
    if (categoryId && categoryId === slug) return true;
    return (meta.legacyCategories || []).some((cat) => label.includes(cat));
  });

  const subcats = Array.isArray(meta?.subcategories) ? meta.subcategories : [];
  const fallbackSubcatFromExam =
    !selectedSubcategoryId && selectedExam
      ? (subcats.find((s) => s.name === selectedExam)?.id || "")
      : "";
  const activeSubcategoryId = selectedSubcategoryId || fallbackSubcatFromExam;
  const activeSubcategory = subcats.find((s) => s.id === activeSubcategoryId) || null;
  const activeSubcategoryName = activeSubcategory?.name || "";

  const filtered = filteredByCategory.filter((q) => {
    if (!activeSubcategoryId && !activeSubcategoryName) return true;
    const qSubId = String(q.quizMeta?.subcategoryId || q.subcategoryId || "").trim();
    const qSubName = String(q.quizMeta?.subcategory || q.subcategory || "").trim();
    if (qSubId && qSubId === activeSubcategoryId) return true;
    if (activeSubcategoryName && qSubName && qSubName.toLowerCase() === activeSubcategoryName.toLowerCase()) return true;
    return false;
  });

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
                {meta.name}
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
              <Link
                href={`/quiz/category/${slug}`}
                className={`rounded-full border px-3 py-1 transition ${
                  !activeSubcategoryId
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                All
              </Link>
              <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-600">
                Full Test
              </span>
              {subcats.map((item) => (
                <Link
                  key={item.id}
                  href={`/quiz/category/${slug}?subcat=${encodeURIComponent(item.id)}`}
                  className={`rounded-full border px-3 py-1 transition ${
                    activeSubcategoryId === item.id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {showSubcats && slug === "exams" && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Link
                href={`/quiz/category/${slug}`}
                className={`rounded-full border px-3 py-1 transition ${
                  !activeSubcategoryId
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                All
              </Link>
              {subcats.map((item) => {
                const isActive = activeSubcategoryId === item.id;
                return (
                  <Link
                    key={item.id}
                    href={`/quiz/category/${slug}?subcat=${encodeURIComponent(
                      item.id
                    )}`}
                    className={`rounded-full border px-3 py-1 transition ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}

          {showSubcats && slug === "exams" && activeSubcategoryId && (
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
