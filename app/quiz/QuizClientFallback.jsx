"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function QuizClientFallback({ searchParams }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const searchQuery =
    typeof searchParams?.q === "string" ? searchParams.q.trim() : "";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const ref = collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "Quizzes"
        );

        const snap = await getDocs(
          query(ref, where("status", "==", "published"), orderBy("updatedAt", "desc"), limit(24))
        );
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setQuizzes(list);
      } catch (err) {
        setError(err?.message || "Unable to load quizzes right now.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleQuizzes = useMemo(() => {
    if (!searchQuery) return quizzes;
    const q = searchQuery.toLowerCase();
    return quizzes.filter((item) => {
      const hay = `${item.title || ""} ${item.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [quizzes, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 md:p-8 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-emerald-700">
            Quizzes
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
            Practice quizzes are loading
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            We’re fetching the latest quizzes. If it takes a moment, you can still
            browse categories or search below.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/quiz"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Refresh Page
            </Link>
            <Link
              href="#latest-quizzes"
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700"
            >
              View Latest
            </Link>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>

        <section id="latest-quizzes" className="pt-6">
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
                Search
              </button>
            </form>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {loading && (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                Loading quizzes…
              </div>
            )}
            {!loading && visibleQuizzes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
                No quizzes available yet.
              </div>
            )}
            {visibleQuizzes.slice(0, 12).map((q) => (
              <Link
                key={q.id}
                href={`/quiz/${q.id}`}
                className="group rounded-2xl border border-gray-100 bg-white p-4 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-2xl hover:shadow-emerald-500/10"
              >
                <div className="text-base font-semibold text-gray-900 group-hover:text-emerald-700">
                  {q.title || "Untitled Quiz"}
                </div>
                {q.description && (
                  <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {q.description}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span>Start quiz</span>
                  <span className="text-emerald-600 group-hover:translate-x-1 transition">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
