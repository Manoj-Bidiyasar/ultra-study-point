"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

const STUDENTS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "students",
];

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, ...STUDENTS_PATH, cred.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await updateDoc(userRef, { lastLoginAt: serverTimestamp() });
      }
      router.push("/student/dashboard");
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name || email });
      const userRef = doc(db, ...STUDENTS_PATH, cred.user.uid);
      await setDoc(userRef, {
        uid: cred.user.uid,
        name: name || "",
        email: email || "",
        mobile: mobile || "",
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        role: "student",
      });
      router.push("/student/dashboard");
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Ultra Study Point
                </p>
                <h1 className="text-3xl font-semibold">Student Login</h1>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setMode("login")}
                  className={`px-3 py-1 rounded-full border ${
                    mode === "login"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setMode("register")}
                  className={`px-3 py-1 rounded-full border ${
                    mode === "register"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200"
                  }`}
                >
                  Create
                </button>
              </div>
            </div>

            <form
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="mt-8 grid gap-4"
            >
              {mode === "register" && (
                <>
                  <div>
                    <label className="text-sm text-slate-600">Name</label>
                    <input
                      className="input-ui"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Mobile</label>
                    <input
                      className="input-ui"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10-digit number"
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm text-slate-600">Email</label>
                <input
                  className="input-ui"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@email.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Password</label>
                <input
                  className="input-ui"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-slate-900 text-white py-3 font-medium"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                  ? "Login"
                  : "Create Account"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-[#0f172a] text-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold">Why login?</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>• Save your quiz progress and results</li>
              <li>• Track your best scores across tests</li>
              <li>• Appear on the leaderboard</li>
            </ul>
            <div className="mt-6 text-xs text-slate-400">
              You can still attempt tests without login, but results won’t be saved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
