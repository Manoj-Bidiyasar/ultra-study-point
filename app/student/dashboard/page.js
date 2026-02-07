"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

const STUDENTS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "students",
];

const ATTEMPTS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "quiz_attempts",
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [topRows, setTopRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const userRef = doc(db, ...STUDENTS_PATH, user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setStudent(snap.data());
      } else {
        setStudent({ name: user.displayName || "Student", email: user.email });
      }

      const q = query(
        collection(db, ...ATTEMPTS_PATH),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const aSnap = await getDocs(q);
      const data = aSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAttempts(data);

      const topQ = query(
        collection(db, ...ATTEMPTS_PATH),
        orderBy("percent", "desc"),
        limit(5)
      );
      const topSnap = await getDocs(topQ);
      setTopRows(topSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div className="p-8">Loading dashboard…</div>;
  }

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] text-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="rounded-3xl border bg-white p-10 text-center">
            <h1 className="text-2xl font-semibold">Student Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Login to view your saved results and progress.
            </p>
            <button
              onClick={() => router.push("/student/login")}
              className="mt-6 rounded-xl bg-slate-900 text-white px-5 py-2"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Student Dashboard
            </p>
            <h1 className="text-3xl font-semibold">
              Welcome{student?.name ? `, ${student.name}` : ""}
            </h1>
            <p className="text-sm text-slate-600">{student?.email}</p>
          </div>
          <button
            className="rounded-xl border px-4 py-2"
            onClick={async () => {
              await signOut(auth);
              router.push("/student/login");
            }}
          >
            Logout
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Recent Attempts</h2>
            {attempts.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No attempts yet. Start a quiz to see your progress.
              </p>
            )}
            <div className="mt-4 grid gap-3">
              {attempts.map((a) => (
                <div key={a.id} className="rounded-xl border p-4 text-sm">
                  <div className="font-medium">{a.quizTitle || "Quiz"}</div>
                  <div className="text-slate-500">
                    Score: {a.score} / {a.maxScore} • {a.percent ?? 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="mt-4 grid gap-3">
              <button
                onClick={() => router.push("/quiz")}
                className="rounded-xl bg-slate-900 text-white py-2"
              >
                Browse Quizzes
              </button>
              <button
                onClick={() => router.push("/leaderboard")}
                className="rounded-xl border py-2"
              >
                View Leaderboard
              </button>
            </div>
            <div className="mt-6 text-xs text-slate-500">
              Progress is saved only when you are logged in.
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Students</h2>
            <button
              onClick={() => router.push("/leaderboard")}
              className="text-sm text-slate-600 underline"
            >
              View full leaderboard
            </button>
          </div>
          {topRows.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              No leaderboard data yet.
            </p>
          )}
          {topRows.length > 0 && (
            <div className="mt-4 grid gap-2">
              {topRows.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border p-3 text-sm"
                >
                  <div>
                    #{i + 1} • {r.studentName || "Student"}
                  </div>
                  <div className="text-slate-600">
                    {r.percent ?? 0}% • {r.quizTitle || r.quizId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
