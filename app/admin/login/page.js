"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { db } from "@/lib/firebase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function isPermissionDenied(err) {
    const msg = String(err?.message || "").toLowerCase();
    return err?.code === "permission-denied" || msg.includes("insufficient") || msg.includes("permission");
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const sessionId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      localStorage.setItem("admin_session_id", sessionId);

      const userRef = doc(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "users",
        cred.user.uid
      );

      try {
        await updateDoc(userRef, {
          activeSessionId: sessionId,
          activeSessionAt: serverTimestamp(),
          activeSessionDevice: navigator.userAgent || "unknown",
        });
      } catch (err) {
        // Optional session tracking. Some roles may not have permission to update users doc.
        if (!isPermissionDenied(err)) throw err;
      }

      router.replace("/admin");
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
        setError("Invalid email or password");
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.brand}>Ultra Study Point</h1>
        <p style={styles.subtitle}>Admin Login</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Email Address</label>
          <input
            type="email"
            placeholder="admin@ultrastudypoint.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error && <p style={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a, #020617)",
    padding: "16px",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "10px",
    padding: "32px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
  },

  brand: {
    margin: 0,
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "6px",
    marginBottom: "28px",
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  label: {
    fontSize: "13px",
    color: "#334155",
    fontWeight: "500",
  },

  input: {
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #cbd5f5",
    outline: "none",
  },

  button: {
    marginTop: "16px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: "#2563eb",
    color: "#ffffff",
  },

  error: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#dc2626",
    textAlign: "center",
  },
};

