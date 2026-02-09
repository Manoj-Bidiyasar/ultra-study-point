import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

export const dynamic = "force-dynamic";

const CATEGORY_MAP = {
  "ssc-exams": {
    title: "SSC Exams",
    badge: "SSC PYQs",
    desc: "CGL, CHSL, MTS, GD and more.",
    accent: "from-sky-400/30 to-indigo-400/20",
    matchExams: ["ssc", "ssc exams", "ssc cgl", "ssc chsl", "ssc mts", "ssc gd"],
  },
  banking: {
    title: "Banking",
    badge: "Banking PYQs",
    desc: "IBPS, SBI, RBI and other banking papers.",
    accent: "from-emerald-400/30 to-lime-400/20",
    matchExams: ["banking", "ibps", "sbi", "rbi"],
  },
  railways: {
    title: "Railways",
    badge: "Railways PYQs",
    desc: "RRB NTPC, Group D, and railways exams.",
    accent: "from-amber-400/30 to-orange-400/20",
    matchExams: ["railways", "railway", "rrb ntpc", "rrb group d", "group d"],
  },
  "state-exams": {
    title: "State Exams",
    badge: "State PYQs",
    desc: "RPSC, UPPSC, MPPSC and more.",
    accent: "from-rose-400/30 to-amber-400/20",
    matchExams: ["state exams", "state", "rpsc", "uppsc", "mppsc", "bpsc", "gpsc"],
    subcategories: [
      { title: "RPSC", desc: "Rajasthan Public Service Commission", slug: "rpsc" },
      { title: "UPPSC", desc: "Uttar Pradesh Public Service Commission", slug: "uppsc" },
      { title: "MPPSC", desc: "Madhya Pradesh Public Service Commission", slug: "mppsc" },
      { title: "BPSC", desc: "Bihar Public Service Commission", slug: "bpsc" },
      { title: "GPSC", desc: "Gujarat Public Service Commission", slug: "gpsc" },
    ],
  },
  teaching: {
    title: "Teaching",
    badge: "Teaching PYQs",
    desc: "CTET, REET, KVS and teaching exams.",
    accent: "from-violet-400/30 to-sky-400/20",
    matchExams: ["teaching", "ctet", "reet", "kvs", "tet"],
  },
  defence: {
    title: "Defence",
    badge: "Defence PYQs",
    desc: "NDA, CDS, AFCAT and defence exams.",
    accent: "from-teal-400/30 to-cyan-400/20",
    matchExams: ["defence", "defense", "nda", "cds", "afcat", "airforce"],
  },
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesCategory(pyq, category) {
  const exam = normalizeText(pyq.exam);
  if (!exam) return false;
  return (category.matchExams || []).some((keyword) =>
    exam.includes(normalizeText(keyword))
  );
}

export default async function PyqCategoryPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const slug = params?.slug;
  const category = CATEGORY_MAP[slug];

  if (!category) {
    notFound();
  }

  const searchQuery =
    typeof searchParams?.q === "string" ? searchParams.q.trim() : "";

  const adminDb = getAdminDb();
  const pyqs = [];

  if (adminDb) {
    try {
      const snap = await adminDb
        .collection("artifacts")
        .doc("ultra-study-point")
        .collection("public")
        .doc("data")
        .collection("PYQs")
        .where("status", "==", "published")
        .orderBy("updatedAt", "desc")
        .limit(60)
        .get();

      pyqs.push(
        ...snap.docs.map((doc) =>
          serializeFirestoreData({ id: doc.id, ...doc.data() })
        )
      );
    } catch (_) {
      try {
        const fallbackSnap = await adminDb
          .collection("artifacts")
          .doc("ultra-study-point")
          .collection("public")
          .doc("data")
          .collection("PYQs")
          .where("status", "==", "published")
          .limit(60)
          .get();

        pyqs.push(
          ...fallbackSnap.docs.map((doc) =>
            serializeFirestoreData({ id: doc.id, ...doc.data() })
          )
        );
      } catch (_) {
        // If Firestore index isn't deployed yet, avoid a hard crash.
      }
    }
  }

  const categoryMatches = pyqs.filter((item) =>
    matchesCategory(item, category)
  );

  const visiblePyqs = searchQuery
    ? categoryMatches.filter((item) => {
        const hay = `${item.title || ""} ${item.description || ""} ${
          item.exam || ""
        } ${item.subject || ""}`.toLowerCase();
        return hay.includes(searchQuery.toLowerCase());
      })
    : categoryMatches;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-sky-100 shadow-sm mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_45%)]" />
          <div className="relative px-6 py-6 md:px-10 md:py-10">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-sky-700">
              <Link
                href="/pyqs"
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1"
              >
                All PYQs
              </Link>
              <span className="text-gray-400">/</span>
              <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1">
                {category.badge}
              </span>
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                  {category.title} PYQs
                </h1>
                <p className="mt-3 text-base md:text-lg text-gray-600 max-w-xl">
                  {category.desc} Practice, download, and revise with focused
                  previous year papers.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    {visiblePyqs.length} papers
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Updated regularly
                  </span>
                </div>
              </div>

              <div className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div
                  className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${category.accent} border border-gray-200`}
                />
                <div className="mt-4 text-sm text-gray-600">
                  Quick tip
                </div>
                <div className="mt-2 text-base font-semibold text-gray-900">
                  Attempt PYQs like a mock test
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Time yourself, then review answers and notes.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-16">
          <section className="pt-2 sm:pt-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <form
                action={`/pyqs/category/${slug}`}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search by paper, year, or subject"
                  className="flex-1 min-w-[220px] rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="rounded-full border border-sky-500 bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Search
                </button>
              </form>
            </div>
          </section>

          <section className="pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold">
                  {category.title} Papers
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Focused PYQs inside this category.
                </p>
              </div>
              <Link
                href="/pyqs"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                View all PYQs →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {visiblePyqs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                  No PYQs found for this category yet.
                </div>
              )}

              {visiblePyqs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-lg font-semibold text-gray-900">
                      {item.title || "Untitled PYQ"}
                    </div>
                    <span className="text-xs font-semibold rounded-full border border-gray-300 px-2 py-1 text-gray-700">
                      {item.exam || "PYQ"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {(item.year || "Year")} • {item.questionCount || 0} Qs
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {item.subject || "Mixed Subjects"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {(item.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-gray-300 px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/pyqs/${item.id}`}
                      className="inline-flex rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
                    >
                      View Paper
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {slug === "state-exams" && (
            <section className="pt-8">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      State Exam Sub-categories
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Choose your state commission to focus your PYQs.
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    More states can be added later.
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(category.subcategories || []).map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="text-base font-semibold text-gray-900">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {item.desc}
                      </div>
                      <div className="mt-3 text-xs text-sky-600">
                        Sub-page coming soon
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="pt-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="text-sm font-semibold text-gray-900">
                Explore other categories
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                {Object.entries(CATEGORY_MAP).map(([key, value]) => (
                  <Link
                    key={key}
                    href={`/pyqs/category/${key}`}
                    className={`rounded-full border px-3 py-1 transition ${
                      key === slug
                        ? "border-sky-300 bg-sky-50 text-sky-700"
                        : "border-gray-300 hover:border-sky-300 hover:text-sky-700"
                    }`}
                  >
                    {value.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
