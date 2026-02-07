"use client";

import { useMemo, useState } from "react";

function indexToLetter(index) {
  const map = ["A", "B", "C", "D", "E"];
  return map[index] || "";
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default function PyqDetailClient({ data }) {
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [tag, setTag] = useState("all");
  const [openAnswers, setOpenAnswers] = useState({});
  const [examChip, setExamChip] = useState("all");
  const [yearChip, setYearChip] = useState("all");

  const availableTags = useMemo(() => {
    const tags = new Set();
    questions.forEach((q) => {
      (Array.isArray(q.tags) ? q.tags : []).forEach((t) => tags.add(t));
    });
    return Array.from(tags);
  }, [questions]);

  const filtered = useMemo(() => {
    const s = normalizeText(search);
    return questions.filter((q) => {
      const matchSearch = !s || normalizeText(q.prompt).includes(s);
      const matchDiff =
        difficulty === "all" || (q.difficulty || "medium") === difficulty;
      const tags = Array.isArray(q.tags) ? q.tags : [];
      const matchTag = tag === "all" || tags.includes(tag);
      const matchExam =
        examChip === "all" ||
        String(data?.exam || "").toLowerCase() === examChip;
      const matchYear =
        yearChip === "all" ||
        String(data?.year || "").toLowerCase() === yearChip;
      return matchSearch && matchDiff && matchTag && matchExam && matchYear;
    });
  }, [questions, search, difficulty, tag, examChip, yearChip, data?.exam, data?.year]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Previous Year Questions
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
            {data?.title || "PYQ Paper"}
          </h1>
          <div className="mt-2 text-sm text-gray-500">
            {data?.exam || "Exam"} • {data?.year || "Year"} •{" "}
            {questions.length} Questions
          </div>
          {data?.description && (
            <p className="mt-4 text-sm text-gray-600 max-w-3xl">
              {data.description}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions"
              className="w-full md:w-64 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800"
            >
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800"
            >
              <option value="all">All Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 text-xs">
              {data?.exam && (
                <button
                  type="button"
                  onClick={() =>
                    setExamChip((prev) =>
                      prev === String(data.exam || "").toLowerCase() ? "all" : String(data.exam || "").toLowerCase()
                    )
                  }
                  className={`rounded-full border px-3 py-1 ${
                    examChip === String(data.exam || "").toLowerCase()
                      ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {data.exam}
                </button>
              )}
              {data?.year && (
                <button
                  type="button"
                  onClick={() =>
                    setYearChip((prev) =>
                      prev === String(data.year || "").toLowerCase() ? "all" : String(data.year || "").toLowerCase()
                    )
                  }
                  className={`rounded-full border px-3 py-1 ${
                    yearChip === String(data.year || "").toLowerCase()
                      ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {data.year}
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Showing {filtered.length} / {questions.length}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-gray-500">
              No questions match your filters.
            </div>
          )}

          {filtered.map((q, idx) => (
            <div
              key={q.id || idx}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="text-sm text-gray-500">
                Question {idx + 1}
              </div>
              <div className="mt-2 text-base font-semibold text-gray-900">
                {q.prompt || "Untitled question"}
              </div>

              {Array.isArray(q.options) && q.options.length > 0 && (
                <div className="mt-3 grid gap-2 text-sm text-gray-600">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={`${q.id || idx}-opt-${oIdx}`}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2"
                    >
                      <span className="text-gray-500 mr-2">
                        {indexToLetter(oIdx)}.
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {(q.answer !== undefined || q.explanation) && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAnswers((s) => ({
                        ...s,
                        [q.id || idx]: !s[q.id || idx],
                      }))
                    }
                    className="rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    {openAnswers[q.id || idx] ? "Hide Answer" : "Show Answer"}
                  </button>
                </div>
              )}

              {openAnswers[q.id || idx] &&
                q.answer !== undefined &&
                q.answer !== null && (
                  <div className="mt-3 text-xs text-emerald-700">
                    Answer: {Array.isArray(q.answer)
                      ? q.answer.map(indexToLetter).join(", ")
                      : indexToLetter(q.answer)}
                  </div>
                )}
              {openAnswers[q.id || idx] && q.explanation && (
                <div className="mt-2 text-xs text-gray-500">
                  Explanation: {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
