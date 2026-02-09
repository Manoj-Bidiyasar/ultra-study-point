"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function StudentForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError(err?.message || "Unable to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-slate-900">
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Ultra Study Point
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold">
                Reset Password
              </h1>
            </div>
            <Link
              href="/student/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Back to Login
            </Link>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Enter your registered email. We will send you a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
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

            {error && <div className="text-sm text-red-600">{error}</div>}
            {sent && (
              <div className="text-sm text-emerald-700">
                Reset link sent. Please check your email.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 text-white py-3 font-medium"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
