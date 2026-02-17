import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

export const dynamic = "force-dynamic";

function shouldShowExamYearInCategoryList(item, category) {
  const mode = String(item?.pyqMeta?.examYearDisplayMode || "auto").trim();
  if (mode === "always_show") return true;
  if (mode === "hide_in_list_show_details") return false;
  if (mode === "always_hide") return false;
  const hasExamMatching = Array.isArray(category?.matchExams) && category.matchExams.length > 0;
  if (hasExamMatching) return false;
  const categoryMode = String(item?.pyqMeta?.categoryMode || "subject").trim().toLowerCase();
  return categoryMode === "subject";
}

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
  "current-affairs": {
    title: "Current Affairs",
    badge: "Subject PYQs",
    desc: "Current affairs focused previous year papers.",
    accent: "from-sky-400/30 to-emerald-400/20",
    matchSubjects: ["current affairs", "current-affairs", "ca", "daily ca", "monthly ca"],
  },
  "science-tech": {
    title: "Science & Tech",
    badge: "Subject PYQs",
    desc: "Science and technology focused previous year papers.",
    accent: "from-cyan-400/30 to-sky-400/20",
    matchSubjects: ["science", "general science", "technology", "tech", "physics", "chemistry", "biology"],
  },
  science: {
    title: "Science",
    badge: "Subject PYQs",
    desc: "Science focused previous year papers.",
    accent: "from-cyan-400/30 to-sky-400/20",
    matchSubjects: ["science", "general science", "physics", "chemistry", "biology"],
  },
  computer: {
    title: "Computer",
    badge: "Subject PYQs",
    desc: "Computer focused previous year papers.",
    accent: "from-indigo-400/30 to-blue-400/20",
    matchSubjects: ["computer", "computer science", "it", "information technology", "digital", "ict"],
  },
  math: {
    title: "Math",
    badge: "Subject PYQs",
    desc: "Math focused previous year papers.",
    accent: "from-blue-400/30 to-indigo-400/20",
    matchSubjects: ["math", "mathematics", "arithmetic", "algebra", "geometry", "trigonometry", "mensuration"],
  },
  reasoning: {
    title: "Reasoning",
    badge: "Subject PYQs",
    desc: "Reasoning focused previous year papers.",
    accent: "from-purple-400/30 to-indigo-400/20",
    matchSubjects: ["reasoning", "logical", "verbal", "non-verbal", "analytical"],
  },
  english: {
    title: "English",
    badge: "Subject PYQs",
    desc: "English focused previous year papers.",
    accent: "from-slate-400/30 to-sky-400/20",
    matchSubjects: ["english", "grammar", "vocabulary", "comprehension"],
  },
  hindi: {
    title: "Hindi",
    badge: "Subject PYQs",
    desc: "Hindi focused previous year papers.",
    accent: "from-rose-400/30 to-red-400/20",
    matchSubjects: ["hindi", "hindi grammar"],
  },
  "indian-polity": {
    title: "Indian Polity",
    badge: "Subject PYQs",
    desc: "Indian polity focused previous year papers.",
    accent: "from-indigo-400/30 to-sky-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["polity"],
  },
  "rajasthan-polity": {
    title: "Rajasthan Polity",
    badge: "Subject PYQs",
    desc: "Rajasthan polity focused previous year papers.",
    accent: "from-amber-400/30 to-orange-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["polity"],
  },
  "indian-history": {
    title: "Indian History",
    badge: "Subject PYQs",
    desc: "Indian history previous year papers.",
    accent: "from-rose-400/30 to-pink-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["history"],
  },
  "rajasthan-history": {
    title: "Rajasthan History",
    badge: "Subject PYQs",
    desc: "Rajasthan history previous year papers.",
    accent: "from-orange-400/30 to-amber-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["history"],
  },
  "indian-geography": {
    title: "Indian Geography",
    badge: "Subject PYQs",
    desc: "Indian geography previous year papers.",
    accent: "from-emerald-400/30 to-lime-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["geography"],
  },
  "rajasthan-geography": {
    title: "Rajasthan Geography",
    badge: "Subject PYQs",
    desc: "Rajasthan geography previous year papers.",
    accent: "from-teal-400/30 to-cyan-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["geography"],
  },
  "indian-economy": {
    title: "Indian Economy",
    badge: "Subject PYQs",
    desc: "Indian economy previous year papers.",
    accent: "from-sky-400/30 to-blue-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["economy"],
  },
  "rajasthan-economy": {
    title: "Rajasthan Economy",
    badge: "Subject PYQs",
    desc: "Rajasthan economy previous year papers.",
    accent: "from-yellow-400/30 to-amber-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["economy"],
  },
  "indian-science": {
    title: "Indian Science",
    badge: "Subject PYQs",
    desc: "Indian science previous year papers.",
    accent: "from-cyan-400/30 to-sky-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["science", "physics", "chemistry", "biology"],
  },
  "rajasthan-science": {
    title: "Rajasthan Science",
    badge: "Subject PYQs",
    desc: "Rajasthan science previous year papers.",
    accent: "from-teal-400/30 to-cyan-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["science", "physics", "chemistry", "biology"],
  },
  "indian-math": {
    title: "Indian Math",
    badge: "Subject PYQs",
    desc: "Indian math previous year papers.",
    accent: "from-blue-400/30 to-indigo-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["math", "mathematics", "arithmetic", "algebra", "geometry"],
  },
  "rajasthan-math": {
    title: "Rajasthan Math",
    badge: "Subject PYQs",
    desc: "Rajasthan math previous year papers.",
    accent: "from-indigo-400/30 to-violet-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["math", "mathematics", "arithmetic", "algebra", "geometry"],
  },
  "indian-reasoning": {
    title: "Indian Reasoning",
    badge: "Subject PYQs",
    desc: "Indian reasoning previous year papers.",
    accent: "from-purple-400/30 to-indigo-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["reasoning", "logical", "verbal", "non-verbal"],
  },
  "rajasthan-reasoning": {
    title: "Rajasthan Reasoning",
    badge: "Subject PYQs",
    desc: "Rajasthan reasoning previous year papers.",
    accent: "from-fuchsia-400/30 to-purple-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["reasoning", "logical", "verbal", "non-verbal"],
  },
  "indian-english": {
    title: "Indian English",
    badge: "Subject PYQs",
    desc: "Indian English previous year papers.",
    accent: "from-slate-400/30 to-sky-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["english"],
  },
  "rajasthan-english": {
    title: "Rajasthan English",
    badge: "Subject PYQs",
    desc: "Rajasthan English previous year papers.",
    accent: "from-gray-400/30 to-slate-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["english"],
  },
  "indian-hindi": {
    title: "Indian Hindi",
    badge: "Subject PYQs",
    desc: "Indian Hindi previous year papers.",
    accent: "from-rose-400/30 to-red-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["hindi"],
  },
  "rajasthan-hindi": {
    title: "Rajasthan Hindi",
    badge: "Subject PYQs",
    desc: "Rajasthan Hindi previous year papers.",
    accent: "from-red-400/30 to-orange-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["hindi"],
  },
  "indian-current-affairs": {
    title: "Indian Current Affairs",
    badge: "Subject PYQs",
    desc: "Indian current affairs previous year papers.",
    accent: "from-sky-400/30 to-emerald-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["current affairs", "current-affairs", "ca"],
  },
  "rajasthan-current-affairs": {
    title: "Rajasthan Current Affairs",
    badge: "Subject PYQs",
    desc: "Rajasthan current affairs previous year papers.",
    accent: "from-emerald-400/30 to-teal-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["current affairs", "current-affairs", "ca"],
  },
  "indian-art-culture": {
    title: "Indian Art & Culture",
    badge: "Subject PYQs",
    desc: "Indian art and culture previous year papers.",
    accent: "from-pink-400/30 to-rose-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["art", "culture", "art & culture", "art and culture"],
  },
  "rajasthan-art-culture": {
    title: "Rajasthan Art & Culture",
    badge: "Subject PYQs",
    desc: "Rajasthan art and culture previous year papers.",
    accent: "from-rose-400/30 to-red-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["art", "culture", "art & culture", "art and culture"],
  },
  "indian-miscellaneous": {
    title: "Indian Miscellaneous",
    badge: "Subject PYQs",
    desc: "Indian miscellaneous previous year papers.",
    accent: "from-fuchsia-400/30 to-pink-400/20",
    matchDomains: ["indian"],
    matchSubjects: ["miscellaneous", "first in india", "awards", "important days", "one liner"],
  },
  "rajasthan-miscellaneous": {
    title: "Rajasthan Miscellaneous",
    badge: "Subject PYQs",
    desc: "Rajasthan miscellaneous previous year papers.",
    accent: "from-rose-400/30 to-orange-400/20",
    matchDomains: ["rajasthan"],
    matchSubjects: ["miscellaneous", "first in rajasthan", "awards", "important days", "one liner"],
  },
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTopic(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function canonicalTopic(value) {
  const raw = normalizeTopic(value);
  const key = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (!key) return "";

  const TOPIC_SYNONYMS = {
    polity: ["polity", "indian polity", "rajasthan polity", "constitution", "civics"],
    history: ["history", "indian history", "rajasthan history", "modern history", "ancient history", "medieval history"],
    geography: ["geography", "indian geography", "rajasthan geography"],
    economy: ["economy", "economics", "indian economy", "rajasthan economy"],
    science: ["science", "general science", "physics", "chemistry", "biology"],
    math: ["math", "mathematics", "quant", "quantitative aptitude", "arithmetic", "algebra", "geometry", "trigonometry", "mensuration"],
    reasoning: ["reasoning", "logical reasoning", "verbal reasoning", "non verbal reasoning", "analytical reasoning"],
    english: ["english", "english language", "grammar", "vocabulary", "comprehension"],
    hindi: ["hindi", "hindi language", "hindi grammar"],
    "current affairs": ["current affairs", "current-affairs", "ca", "gk current", "daily ca", "monthly ca"],
    "art & culture": ["art & culture", "art and culture", "culture", "indian culture", "rajasthan culture"],
  };

  for (const [canonical, aliases] of Object.entries(TOPIC_SYNONYMS)) {
    if (aliases.includes(key)) return canonical;
  }
  return key;
}

function topicKey(value) {
  return canonicalTopic(value);
}

function topicLabelFromKey(key) {
  const k = String(key || "").trim().toLowerCase();
  if (!k) return "";
  return k
    .split(" ")
    .map((w) => {
      if (w === "&") return "&";
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function extractTopicsFromPyq(pyq) {
  const items = [];
  const push = (v) => {
    const t = normalizeTopic(v);
    if (t) items.push(t);
  };
  push(pyq?.topic);
  if (Array.isArray(pyq?.topics)) pyq.topics.forEach(push);
  const questions = Array.isArray(pyq?.questions) ? pyq.questions : [];
  questions.forEach((q) => {
    push(q?.topic);
    push(q?.meta?.topic);
  });
  return Array.from(new Set(items));
}

function matchesCategory(pyq, category, slug) {
  const explicitCategoryId = normalizeText(
    pyq?.pyqCategoryId ||
      pyq?.pyqMeta?.pyqCategoryId ||
      pyq?.pyqMeta?.examCategoryId ||
      pyq?.pyqMeta?.subjectCategoryId
  );
  const currentSlug = normalizeText(slug);
  if (explicitCategoryId && currentSlug && explicitCategoryId === currentSlug) {
    return true;
  }

  const exam = normalizeText(pyq.exam);
  const subject = normalizeText(pyq.subject);
  const tagsText = Array.isArray(pyq.tags)
    ? pyq.tags.map((t) => normalizeText(t)).join(" ")
    : "";
  const titleText = normalizeText(pyq.title);
  const haystack = `${subject} ${tagsText} ${titleText}`;

  const examOk = (category.matchExams || []).length
    ? (category.matchExams || []).some((keyword) =>
        exam.includes(normalizeText(keyword))
      )
    : true;
  const subjectOk = (category.matchSubjects || []).length
    ? (category.matchSubjects || []).some((keyword) =>
        haystack.includes(normalizeText(keyword))
      )
    : true;
  const domainOk = (category.matchDomains || []).length
    ? (category.matchDomains || []).some((keyword) =>
        haystack.includes(normalizeText(keyword))
      )
    : true;

  return examOk && subjectOk && domainOk;
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
  const selectedTopic =
    typeof searchParams?.topic === "string" ? searchParams.topic.trim() : "";
  const sortByRaw =
    typeof searchParams?.sort === "string" ? searchParams.sort.trim().toLowerCase() : "newest";
  const sortBy = ["newest", "year", "questions"].includes(sortByRaw) ? sortByRaw : "newest";
  const pageRaw =
    typeof searchParams?.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

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

  const categoryMatches = pyqs.filter((item) =>
    matchesCategory(item, category, slug)
  );

  const topicMap = new Map();
  categoryMatches.forEach((item) => {
    extractTopicsFromPyq(item).forEach((topic) => {
      const key = topicKey(topic);
      if (!key) return;
      if (!topicMap.has(key)) topicMap.set(key, topicLabelFromKey(key));
    });
  });
  const availableTopics = Array.from(topicMap.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const selectedTopicKey = topicKey(selectedTopic);
  const topicFiltered = selectedTopicKey
    ? categoryMatches.filter((item) =>
        extractTopicsFromPyq(item).some((t) => topicKey(t) === selectedTopicKey)
      )
    : categoryMatches;

  const searchedPyqs = searchQuery
    ? topicFiltered.filter((item) => {
        const hay = `${item.title || ""} ${item.description || ""} ${
          item.exam || ""
        } ${item.subject || ""}`.toLowerCase();
        return hay.includes(searchQuery.toLowerCase());
      })
    : topicFiltered;
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
  const sortedPyqs = [...searchedPyqs].sort((a, b) => {
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
  const visiblePyqs = sortedPyqs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const queryState = new URLSearchParams();
  if (searchQuery) queryState.set("q", searchQuery);
  if (selectedTopicKey) queryState.set("topic", selectedTopicKey);
  if (sortBy !== "newest") queryState.set("sort", sortBy);

  const hrefWithout = (key) => {
    const params = new URLSearchParams(queryState);
    params.delete(key);
    params.delete("page");
    const qs = params.toString();
    return qs ? `/pyqs/category/${slug}?${qs}` : `/pyqs/category/${slug}`;
  };
  const hrefWithPage = (nextPage) => {
    const params = new URLSearchParams(queryState);
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `/pyqs/category/${slug}?${qs}` : `/pyqs/category/${slug}`;
  };
  const fieldClass =
    "h-10 rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800";
  const chipClass = "h-8 rounded-full border px-3 text-xs font-semibold transition";

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
                    {totalMatches} papers
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
            <div className="sticky top-2 z-30 rounded-2xl border border-gray-200 bg-white/95 p-4 sm:p-5 backdrop-blur md:static md:bg-white md:backdrop-blur-0">
              <form
                action={`/pyqs/category/${slug}`}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search by paper, year, or subject"
                  className={`flex-1 min-w-[220px] ${fieldClass} placeholder:text-gray-400`}
                />
                {selectedTopic && (
                  <input type="hidden" name="topic" value={selectedTopic} />
                )}
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
            </div>
          </section>

          {(searchQuery || selectedTopicKey || sortBy !== "newest") && (
            <section className="pt-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold text-gray-700">Active Filters:</div>
                  {searchQuery && (
                    <Link href={hrefWithout("q")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                      q: {searchQuery} x
                    </Link>
                  )}
                  {selectedTopicKey && (
                    <Link href={hrefWithout("topic")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                      topic: {topicLabelFromKey(selectedTopicKey)} x
                    </Link>
                  )}
                  {sortBy !== "newest" && (
                    <Link href={hrefWithout("sort")} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400">
                      sort: {sortBy} x
                    </Link>
                  )}
                  <Link
                    href={`/pyqs/category/${slug}`}
                    className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:border-sky-400"
                  >
                    Clear All
                  </Link>
                </div>
              </div>
            </section>
          )}

          {availableTopics.length > 0 && (
            <section className="pt-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Filter By Topic
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <Link
                    href={`/pyqs/category/${slug}${(() => {
                      const params = new URLSearchParams();
                      if (searchQuery) params.set("q", searchQuery);
                      if (sortBy !== "newest") params.set("sort", sortBy);
                      const qs = params.toString();
                      return qs ? `?${qs}` : "";
                    })()}`}
                    className={`${chipClass} ${
                      !selectedTopicKey
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    All Topics
                  </Link>
                  {availableTopics.map((topic) => {
                    const params = new URLSearchParams();
                    if (searchQuery) params.set("q", searchQuery);
                    if (sortBy !== "newest") params.set("sort", sortBy);
                    params.set("topic", topic.key);
                    return (
                      <Link
                        key={topic.key}
                        href={`/pyqs/category/${slug}?${params.toString()}`}
                        className={`${chipClass} ${
                          selectedTopicKey === topic.key
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-gray-300 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {topic.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

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
                View all PYQs {"\u2192"}
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {visiblePyqs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-600">
                  <div className="font-semibold text-gray-800">
                    No PYQs found for this filter.
                  </div>
                  <div className="mt-2 text-sm">
                    Try removing topic/search filters, or switch to another category.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/pyqs/category/${slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-400"
                    >
                      <span aria-hidden="true">↺</span>
                      <span>Clear Filters</span>
                    </Link>
                    <Link
                      href="/pyqs"
                      className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:border-sky-400"
                    >
                      <span aria-hidden="true">🗂️</span>
                      <span>Explore All Categories</span>
                    </Link>
                  </div>
                </div>
              )}

              {visiblePyqs.map((item) => (
                <div
                  key={item.id}
                  className="h-full rounded-2xl border border-gray-200 bg-white p-5 flex flex-col"
                >
                  {(() => {
                    const showExamYear = shouldShowExamYearInCategoryList(item, category);
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
                      ? `${item.year || "Year"} - `
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

