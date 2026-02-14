import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

export const dynamic = "force-dynamic";

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
        .limit(20)
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
          .limit(20)
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
  const hasPyqData = pyqs.length > 0;
  const searchQuery =
    typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const examFilter =
    typeof searchParams?.exam === "string" ? searchParams.exam.trim() : "";
  const yearFilter =
    typeof searchParams?.year === "string" ? searchParams.year.trim() : "";
  const statusFilter =
    typeof searchParams?.status === "string" ? searchParams.status.trim().toLowerCase() : "";

  const visiblePyqs = pyqs.filter((item) => {
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

  const exams = [
    { label: "SSC", slug: "ssc-exams" },
    { label: "Banking", slug: "banking" },
    { label: "Railways", slug: "railways" },
    { label: "State Exams", slug: "state-exams" },
    { label: "Teaching", slug: "teaching" },
    { label: "Defence", slug: "defence" },
  ];
  const years = ["2024", "2023", "2022", "2021", "2020", "2019"];

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
                  {hasPyqData && (
                    <a
                      href="#pyq-categories"
                      className="rounded-full border border-gray-300 px-3 py-2 text-xs text-center font-semibold text-gray-700 transition hover:border-gray-400 sm:px-5 sm:text-sm"
                    >
                      View Categories
                    </a>
                  )}
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
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <form action="/pyqs" className="flex flex-wrap gap-3">
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search PYQs by exam, topic, year"
                  className="w-full md:w-80 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400"
                />
                <select
                  name="exam"
                  defaultValue={examFilter}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800"
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
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800"
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
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800"
                >
                  <option value="">All</option>
                  <option value="solved">Solved</option>
                  <option value="unsolved">Unsolved</option>
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-sky-500 bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
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

<section id="latest-pyqs" className="pt-8 md:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">Latest PYQs</h2>
              <p className="text-sm text-gray-600 mt-1">
                Most requested papers and recent additions.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Updated as new PYQ sets are uploaded.
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
                {visiblePyqs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                    No PYQs match your filters.
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
            </div>

            <aside className="hidden lg:block" />
          </div>
        </section>

        {hasPyqData && (
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
            {[
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
            ].map((card) => (
              <Link
                key={card.title}
                href={`/pyqs/category/${card.slug}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/10"
              >
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
              </Link>
            ))}
          </div>
        </section>
        )}
      </div>
    </div>
    </div>
  );
}

