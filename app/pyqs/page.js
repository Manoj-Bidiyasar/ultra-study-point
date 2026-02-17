import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

export const dynamic = "force-dynamic";

function shouldShowExamYearInList(item) {
  const mode = String(item?.pyqMeta?.examYearDisplayMode || "auto").trim();
  if (mode === "always_show") return true;
  if (mode === "hide_in_list_show_details") return false;
  if (mode === "always_hide") return false;
  const categoryMode = String(item?.pyqMeta?.categoryMode || "exam").trim().toLowerCase();
  return categoryMode === "subject";
}

function detectSolvedState(item) {
  const explicit = item?.isSolved ?? item?.solved ?? item?.hasSolution;
  if (typeof explicit === "boolean") return explicit;

  const statusText = String(
    item?.solveStatus || item?.solutionStatus || item?.statusLabel || ""
  ).toLowerCase();
  if (statusText.includes("solved")) return true;
  if (statusText.includes("unsolved")) return false;

  const tags = Array.isArray(item?.tags)
    ? item.tags.map((t) => String(t).toLowerCase())
    : [];
  if (tags.includes("solved")) return true;
  if (tags.includes("unsolved")) return false;

  if (
    item?.solution ||
    item?.solutions ||
    item?.solutionUrl ||
    item?.answerKey ||
    item?.answerKeyUrl ||
    item?.explanation
  ) {
    return true;
  }

  const questions = Array.isArray(item?.questions) ? item.questions : [];
  if (questions.length > 0) {
    const hasAnySolution = questions.some(
      (q) => q?.solution || q?.explanation || q?.answer !== undefined
    );
    if (hasAnySolution) return true;
  }

  return false;
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesPyqCategory(item, slug) {
  const explicitCategoryId = normalizeText(
    item?.pyqCategoryId ||
      item?.pyqMeta?.pyqCategoryId ||
      item?.pyqMeta?.examCategoryId ||
      item?.pyqMeta?.subjectCategoryId
  );
  if (explicitCategoryId && explicitCategoryId === normalizeText(slug)) {
    return true;
  }

  const exam = normalizeText(item?.exam);
  const subject = normalizeText(item?.subject);
  const tags = Array.isArray(item?.tags)
    ? item.tags.map((t) => normalizeText(t)).join(" ")
    : "";
  const title = normalizeText(item?.title);
  const hay = `${subject} ${tags} ${title}`;

  const includesAny = (arr, text) =>
    arr.some((keyword) => text.includes(normalizeText(keyword)));

  switch (slug) {
    case "ssc-exams":
      return includesAny(["ssc", "ssc cgl", "ssc chsl", "ssc mts", "ssc gd"], exam);
    case "banking":
      return includesAny(["banking", "ibps", "sbi", "rbi"], exam);
    case "railways":
      return includesAny(["railways", "railway", "rrb ntpc", "group d"], exam);
    case "state-exams":
      return includesAny(["state", "rpsc", "uppsc", "mppsc", "bpsc", "gpsc"], exam);
    case "teaching":
      return includesAny(["teaching", "ctet", "reet", "kvs", "tet"], exam);
    case "defence":
      return includesAny(["defence", "defense", "nda", "cds", "afcat"], exam);
    case "current-affairs":
      return includesAny(["current affairs", "current-affairs", "ca"], hay);
    case "science-tech":
      return includesAny(["science", "technology", "tech", "physics", "chemistry", "biology"], hay);
    case "computer":
      return includesAny(["computer", "it", "information technology", "digital"], hay);
    case "math":
      return includesAny(["math", "mathematics", "arithmetic", "algebra", "geometry"], hay);
    case "reasoning":
      return includesAny(["reasoning", "logical", "verbal", "non-verbal"], hay);
    case "english":
      return includesAny(["english", "grammar", "vocabulary", "comprehension"], hay);
    case "hindi":
      return includesAny(["hindi", "hindi grammar"], hay);
    case "indian-polity":
      return includesAny(["polity"], hay) && includesAny(["indian"], hay);
    case "rajasthan-polity":
      return includesAny(["polity"], hay) && includesAny(["rajasthan"], hay);
    case "indian-history":
      return includesAny(["history"], hay) && includesAny(["indian"], hay);
    case "rajasthan-history":
      return includesAny(["history"], hay) && includesAny(["rajasthan"], hay);
    case "indian-geography":
      return includesAny(["geography"], hay) && includesAny(["indian"], hay);
    case "rajasthan-geography":
      return includesAny(["geography"], hay) && includesAny(["rajasthan"], hay);
    case "indian-economy":
      return includesAny(["economy", "economics"], hay) && includesAny(["indian"], hay);
    case "rajasthan-economy":
      return includesAny(["economy", "economics"], hay) && includesAny(["rajasthan"], hay);
    case "indian-art-culture":
      return includesAny(["art", "culture", "art & culture", "art and culture"], hay) && includesAny(["indian"], hay);
    case "rajasthan-art-culture":
      return includesAny(["art", "culture", "art & culture", "art and culture"], hay) && includesAny(["rajasthan"], hay);
    case "indian-miscellaneous":
      return includesAny(["miscellaneous", "first in india"], hay) && includesAny(["indian"], hay);
    case "rajasthan-miscellaneous":
      return includesAny(["miscellaneous", "first in rajasthan"], hay) && includesAny(["rajasthan"], hay);
    default:
      return false;
  }
}

export default async function PyqsPage(props) {
  const searchParams = await props.searchParams;
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
        .limit(500)
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
          .limit(500)
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
  const searchQuery =
    typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const examFilter =
    typeof searchParams?.exam === "string" ? searchParams.exam.trim() : "";
  const yearFilter =
    typeof searchParams?.year === "string" ? searchParams.year.trim() : "";
  const statusFilter =
    typeof searchParams?.status === "string" ? searchParams.status.trim().toLowerCase() : "";
  const sortByRaw =
    typeof searchParams?.sort === "string" ? searchParams.sort.trim().toLowerCase() : "newest";
  const sortBy = ["newest", "year", "questions"].includes(sortByRaw) ? sortByRaw : "newest";
  const pageRaw =
    typeof searchParams?.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const subjectDomain =
    searchParams?.subject_domain === "rajasthan" ? "rajasthan" : "indian";

  const filteredPyqs = pyqs.filter((item) => {
    const title = String(item?.title || "");
    const exam = String(item?.exam || "");
    const year = String(item?.year || "");
    const subject = String(item?.subject || "");
    const tags = Array.isArray(item?.tags) ? item.tags.join(" ") : "";
    const haystack = `${title} ${exam} ${year} ${subject} ${tags}`.toLowerCase();

    const matchesSearch = !searchQuery || haystack.includes(searchQuery.toLowerCase());
    const matchesExam =
      !examFilter || String(item?.exam || "").toLowerCase().includes(examFilter.toLowerCase());
    const matchesYear = !yearFilter || String(item?.year || "") === yearFilter;
    const solvedState = detectSolvedState(item);
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "solved" && solvedState) ||
      (statusFilter === "unsolved" && !solvedState);

    return matchesSearch && matchesExam && matchesYear && matchesStatus;
  });
  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (value instanceof Date) return value.getTime();
    if (typeof value === "object" && typeof value.seconds === "number") {
      return value.seconds * 1000;
    }
    return 0;
  };
  const sortedPyqs = [...filteredPyqs].sort((a, b) => {
    if (sortBy === "year") {
      const ay = Number.parseInt(String(a?.year || "0"), 10) || 0;
      const by = Number.parseInt(String(b?.year || "0"), 10) || 0;
      if (by !== ay) return by - ay;
    }
    if (sortBy === "questions") {
      const aq = Number(a?.questionCount || 0);
      const bq = Number(b?.questionCount || 0);
      if (bq !== aq) return bq - aq;
    }
    return toMillis(b?.updatedAt || b?.createdAt) - toMillis(a?.updatedAt || a?.createdAt);
  });
  const pageSize = 12;
  const totalMatches = sortedPyqs.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPyqs = sortedPyqs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const queryState = new URLSearchParams();
  if (searchQuery) queryState.set("q", searchQuery);
  if (examFilter) queryState.set("exam", examFilter);
  if (yearFilter) queryState.set("year", yearFilter);
  if (statusFilter) queryState.set("status", statusFilter);
  if (sortBy !== "newest") queryState.set("sort", sortBy);
  if (subjectDomain === "rajasthan") queryState.set("subject_domain", "rajasthan");

  const hrefWithPage = (nextPage) => {
    const params = new URLSearchParams(queryState);
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `/pyqs?${qs}` : "/pyqs";
  };
  const hrefWithout = (key) => {
    const params = new URLSearchParams(queryState);
    params.delete(key);
    params.delete("page");
    const qs = params.toString();
    return qs ? `/pyqs?${qs}` : "/pyqs";
  };

  const exams = [
    { label: "SSC", slug: "ssc-exams" },
    { label: "Banking", slug: "banking" },
    { label: "Railways", slug: "railways" },
    { label: "State Exams", slug: "state-exams" },
    { label: "Teaching", slug: "teaching" },
    { label: "Defence", slug: "defence" },
  ];
const commonSubjectCategories = [
  { title: "Current Affairs", slug: "current-affairs", icon: "📰", accent: "from-sky-400/30 to-emerald-400/20" },
  { title: "Science & Tech", slug: "science-tech", icon: "🧪", accent: "from-cyan-400/30 to-sky-400/20" },
  { title: "Computer", slug: "computer", icon: "💻", accent: "from-indigo-400/30 to-blue-400/20" },
  { title: "Math", slug: "math", icon: "➗", accent: "from-blue-400/30 to-indigo-400/20" },
  { title: "Reasoning", slug: "reasoning", icon: "🧠", accent: "from-purple-400/30 to-indigo-400/20" },
  { title: "English", slug: "english", icon: "🔤", accent: "from-slate-400/30 to-sky-400/20" },
  { title: "Hindi", slug: "hindi", icon: "अ", accent: "from-rose-400/30 to-red-400/20" },
];
  const domainSubjectCategories = [
    { title: "Indian Polity", slug: "indian-polity", domain: "indian", icon: "🏛️", accent: "from-indigo-400/30 to-sky-400/20" },
    { title: "Indian History", slug: "indian-history", domain: "indian", icon: "📜", accent: "from-rose-400/30 to-pink-400/20" },
    { title: "Indian Geography", slug: "indian-geography", domain: "indian", icon: "🌍", accent: "from-emerald-400/30 to-lime-400/20" },
    { title: "Indian Economy", slug: "indian-economy", domain: "indian", icon: "📈", accent: "from-sky-400/30 to-blue-400/20" },
    { title: "Indian Art & Culture", slug: "indian-art-culture", domain: "indian", icon: "🎭", accent: "from-pink-400/30 to-rose-400/20" },
    { title: "Indian Miscellaneous", slug: "indian-miscellaneous", domain: "indian", icon: "✨", accent: "from-fuchsia-400/30 to-pink-400/20" },
    { title: "Rajasthan Polity", slug: "rajasthan-polity", domain: "rajasthan", icon: "🏛️", accent: "from-amber-400/30 to-orange-400/20" },
    { title: "Rajasthan History", slug: "rajasthan-history", domain: "rajasthan", icon: "📜", accent: "from-orange-400/30 to-amber-400/20" },
    { title: "Rajasthan Geography", slug: "rajasthan-geography", domain: "rajasthan", icon: "🌍", accent: "from-teal-400/30 to-cyan-400/20" },
    { title: "Rajasthan Economy", slug: "rajasthan-economy", domain: "rajasthan", icon: "📈", accent: "from-yellow-400/30 to-amber-400/20" },
    { title: "Rajasthan Art & Culture", slug: "rajasthan-art-culture", domain: "rajasthan", icon: "🎭", accent: "from-rose-400/30 to-red-400/20" },
    { title: "Rajasthan Miscellaneous", slug: "rajasthan-miscellaneous", domain: "rajasthan", icon: "✨", accent: "from-rose-400/30 to-orange-400/20" },
  ];
const visibleSubjectCategories = [
  ...commonSubjectCategories,
  ...domainSubjectCategories.filter((item) => item.domain === subjectDomain),
];
const years = ["2024", "2023", "2022", "2021", "2020", "2019"];
const fieldClass = "h-10 rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800";
const examCards = [
  {
    title: "SSC Exams",
    desc: "CGL, CHSL, MTS, GD",
    accent: "from-sky-400/30 to-indigo-400/20",
    slug: "ssc-exams",
    icon: "🧾",
  },
  {
    title: "Banking",
    desc: "IBPS, SBI, RBI",
    accent: "from-emerald-400/30 to-lime-400/20",
    slug: "banking",
    icon: "🏦",
  },
  {
    title: "Railways",
    desc: "RRB NTPC, Group D",
    accent: "from-amber-400/30 to-orange-400/20",
    slug: "railways",
    icon: "🚆",
  },
  {
    title: "State Exams",
    desc: "RPSC, UPPSC, MPPSC",
    accent: "from-rose-400/30 to-amber-400/20",
    slug: "state-exams",
    icon: "🏛️",
  },
  {
    title: "Teaching",
    desc: "CTET, REET, KVS",
    accent: "from-violet-400/30 to-sky-400/20",
    slug: "teaching",
    icon: "🧑‍🏫",
  },
  {
    title: "Defence",
    desc: "NDA, CDS, AFCAT",
    accent: "from-teal-400/30 to-cyan-400/20",
    slug: "defence",
    icon: "🪖",
  },
];
const countBySlug = pyqs.reduce((acc, item) => {
  [...examCards, ...commonSubjectCategories, ...domainSubjectCategories].forEach((card) => {
    if (matchesPyqCategory(item, card.slug)) {
      acc[card.slug] = (acc[card.slug] || 0) + 1;
    }
  });
  return acc;
}, {});

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-sky-100 shadow-sm mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_45%)]" />
          <div className="relative px-6 py-6 md:px-10 md:py-10">
            <div className="mt-0 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                  PYQs that mirror real exam patterns.
                </h1>
                <p className="mt-3 text-base md:text-lg text-gray-600 max-w-2xl">
                  Practice exam-level PYQs with clear, topic-wise sets for quick
                  preparation.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <a
                    href="#latest-pyqs"
                    className="rounded-full bg-sky-500 px-3 py-2 text-xs text-center font-semibold text-white shadow-lg shadow-sky-400/20 transition hover:translate-y-[-1px] sm:px-5 sm:text-sm"
                  >
                    Browse PYQs
                  </a>
                  <a
                    href="#pyq-categories"
                    className="rounded-full border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-gray-700 transition hover:border-gray-400 sm:px-5 sm:text-sm"
                  >
                    View Categories
                  </a>
                </div>
              </div>

              <div className="hidden sm:block relative rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm self-start">
                <div className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl bg-sky-100 border border-sky-200" />
                <div className="text-xs uppercase tracking-widest text-gray-500">
                  Focus Set
                </div>
                <div className="mt-2 text-xl font-semibold">
                  Start With a Targeted PYQ Set
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Pick your exam and year to practice smart.
                </div>
                <div className="mt-4 grid gap-2.5">
                  {[
                    "Exam-wise collections",
                    "Year-wise filters",
                    "Quick revision workflow",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pb-16">
        <section className="hidden sm:block pt-8 md:pt-10">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Pick Exam + Year",
                desc: "Choose the exact paper you want to practice.",
              },
              {
                title: "Attempt + Review",
                desc: "Solve PYQs, then verify with solutions.",
              },
              {
                title: "Revise Smart",
                desc: "Track weak topics and repeat quickly.",
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

                        <section className="pt-8 md:pt-10">
          <div className="sticky top-2 z-30 rounded-2xl border border-gray-200 bg-white/95 p-4 backdrop-blur md:static md:bg-white md:backdrop-blur-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <form action="/pyqs" className="flex flex-wrap gap-3">
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search PYQs by exam, topic, year"
                  className={`w-full md:w-80 ${fieldClass} placeholder:text-gray-400`}
                />
                {subjectDomain === "rajasthan" && (
                  <input type="hidden" name="subject_domain" value="rajasthan" />
                )}
                <select
                  name="exam"
                  defaultValue={examFilter}
                  className={fieldClass}
                >
                  <option value="">All Exams</option>
                  {exams.map((exam) => (
                    <option key={exam.label} value={exam.label}>
                      {exam.label}
                    </option>
                  ))}
                </select>
                <select
                  name="year"
                  defaultValue={yearFilter}
                  className={fieldClass}
                >
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className={fieldClass}
                >
                  <option value="">All</option>
                  <option value="solved">Solved</option>
                  <option value="unsolved">Unsolved</option>
                </select>
                <select
                  name="sort"
                  defaultValue={sortBy}
                  className={fieldClass}
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="year">Sort: Year</option>
                  <option value="questions">Sort: Most Questions</option>
                </select>
                <button
                  type="submit"
                  className="h-10 rounded-full border border-sky-500 bg-sky-500 px-4 text-xs font-semibold text-white"
                >
                  Search
                </button>
              </form>

              <div className="hidden md:flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-700">
                  All
                </span>
                <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-700">
                  Solved
                </span>
                <span className="rounded-full border border-gray-300 px-3 py-1 text-gray-500">
                  Unsolved
                </span>
              </div>
            </div>

          </div>
        </section>

        {(searchQuery || examFilter || yearFilter || statusFilter || sortBy !== "newest" || subjectDomain === "rajasthan") && (
          <section className="pt-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold text-gray-700">Active Filters:</div>
                {searchQuery && (
                  <Link href={hrefWithout("q")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                    q: {searchQuery} ✕
                  </Link>
                )}
                {examFilter && (
                  <Link href={hrefWithout("exam")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                    exam: {examFilter} ✕
                  </Link>
                )}
                {yearFilter && (
                  <Link href={hrefWithout("year")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                    year: {yearFilter} ✕
                  </Link>
                )}
                {statusFilter && (
                  <Link href={hrefWithout("status")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                    status: {statusFilter} ✕
                  </Link>
                )}
                {sortBy !== "newest" && (
                  <Link href={hrefWithout("sort")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                    sort: {sortBy} ✕
                  </Link>
                )}
                {subjectDomain === "rajasthan" && (
                  <Link href={hrefWithout("subject_domain")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                    domain: rajasthan ✕
                  </Link>
                )}
                <Link href="/pyqs" className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:border-sky-400">
                  Clear All
                </Link>
              </div>
            </div>
          </section>
        )}

<section id="latest-pyqs" className="pt-8 md:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">Latest PYQs</h2>
              <p className="text-sm text-gray-600 mt-1">
                Most requested papers and recent additions.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              {totalMatches} results found.
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { label: "All Exams", value: "" },
              { label: "SSC", value: "ssc" },
              { label: "Banking", value: "banking" },
              { label: "Railways", value: "railways" },
            ].map((item) => (
              <Link
                key={item.label}
                href="/pyqs"
                className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:border-gray-400 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                {pagedPyqs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                    No PYQs match your filters.
                  </div>
                )}

                {pagedPyqs.map((item) => (
                  <div
                    key={item.id}
                    className="h-full rounded-2xl border border-gray-200 bg-white p-5 flex flex-col"
                  >
                    {(() => {
                      const showExamYear = shouldShowExamYearInList(item);
                      return (
                        <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-lg font-semibold text-gray-900">
                        {item.title || "Untitled PYQ"}
                      </div>
                      {showExamYear ? (
                        <span className="text-xs font-semibold rounded-full border border-gray-300 px-2 py-1 text-gray-700">
                          {item.exam || "PYQ"}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {showExamYear && (item.year || "Year")
                        ? `${item.year || "Year"} • `
                        : ""}
                      {item.questionCount || 0} Qs
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
                    <div className="mt-auto pt-4">
                      <Link
                        href={`/pyqs/${item.id}`}
                        className="inline-flex rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
                      >
                        View Paper
                      </Link>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <Link
                      href={hrefWithPage(Math.max(1, currentPage - 1))}
                      className={`rounded-full border px-3 py-1 ${
                        currentPage === 1
                          ? "pointer-events-none border-gray-200 text-gray-400"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      Previous
                    </Link>
                    <Link
                      href={hrefWithPage(Math.min(totalPages, currentPage + 1))}
                      className={`rounded-full border px-3 py-1 ${
                        currentPage === totalPages
                          ? "pointer-events-none border-gray-200 text-gray-400"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      Next
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <aside className="hidden lg:block" />
          </div>
        </section>

        <section id="pyq-categories" className="pt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">PYQ Categories</h2>
              <p className="text-sm text-gray-600 mt-1">
                Explore PYQs by exam or subject.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              New PYQ sets can be added anytime.
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {examCards
              .filter((card) => (countBySlug[card.slug] || 0) > 0)
              .map((card) => (
              <Link
                key={card.title}
                href={`/pyqs/category/${card.slug}`}
                className="h-full flex flex-col items-center justify-between text-center rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/10"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.accent} border border-gray-200 flex items-center justify-center text-xl`}
                  >
                    {card.icon}
                  </div>
                  <div className="mt-4 text-lg font-semibold text-gray-900">
                    {card.title}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {card.desc}
                  </div>
                </div>
                <div className="mt-4 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {countBySlug[card.slug] || 0} Qs
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-lg font-semibold text-gray-900">By Subject</div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <Link
                  href="/pyqs?subject_domain=indian#pyq-categories"
                  className={`h-8 rounded-full border px-3 text-xs font-semibold transition ${
                    subjectDomain === "indian"
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  Indian
                </Link>
                <Link
                  href="/pyqs?subject_domain=rajasthan#pyq-categories"
                  className={`h-8 rounded-full border px-3 text-xs font-semibold transition ${
                    subjectDomain === "rajasthan"
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  Rajasthan
                </Link>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Common subjects are fixed. Domain toggle applies to Polity, History, Geography, Economy, Art & Culture, and Miscellaneous.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {visibleSubjectCategories
                .filter((item) => (countBySlug[item.slug] || 0) > 0)
                .map((item) => (
                <Link
                  key={item.slug}
                  href={`/pyqs/category/${item.slug}`}
                  className="h-full flex flex-col items-center justify-between text-center rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/10"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.accent} border border-gray-200 flex items-center justify-center text-xl`}
                    >
                      {item.icon}
                    </div>
                    <div className="mt-4 text-lg font-semibold text-gray-900">
                      {item.title}
                    </div>
                  </div>
                  <div className="mt-4 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {countBySlug[item.slug] || 0} Qs
                  </div>
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


