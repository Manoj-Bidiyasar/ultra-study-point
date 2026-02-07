"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const ATTEMPTS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "quiz_attempts",
];

export default function LeaderboardPage() {
  const [quizId, setQuizId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const base = collection(db, ...ATTEMPTS_PATH);
    const q = quizId
      ? query(
          base,
          where("quizId", "==", quizId),
          orderBy("percent", "desc"),
          limit(50)
        )
      : query(base, orderBy("percent", "desc"), limit(50));

    const snap = await getDocs(q);
    setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Leaderboard
            </p>
            <h1 className="text-3xl font-semibold">Top Performers</h1>
          </div>
          <button
            onClick={loadData}
            className="rounded-xl border px-4 py-2"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-slate-600">Quiz ID (optional)</label>
              <input
                className="input-ui"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                placeholder="Enter quiz id to filter"
              />
            </div>
            <button
              onClick={loadData}
              className="rounded-xl bg-slate-900 text-white px-4 py-2"
            >
              Apply
            </button>
          </div>

          {loading && <div className="mt-6">Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="mt-6 text-sm text-slate-500">
              No attempts found.
            </div>
          )}
          {!loading && rows.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2 border">Rank</th>
                    <th className="text-left p-2 border">Student</th>
                    <th className="text-left p-2 border">Quiz</th>
                    <th className="text-left p-2 border">Score</th>
                    <th className="text-left p-2 border">Percent</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border">{r.studentName || "Student"}</td>
                      <td className="p-2 border">{r.quizTitle || r.quizId}</td>
                      <td className="p-2 border">
                        {r.score} / {r.maxScore}
                      </td>
                      <td className="p-2 border">{r.percent ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
