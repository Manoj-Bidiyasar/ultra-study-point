"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { db } from "@/lib/firebase/client";
import { permissionsByRole } from "@/lib/admin/permissions";
import { startAdminSession } from "@/lib/admin/sessionClient";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const userRef = doc(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "users",
        cred.user.uid
      );

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error("User profile missing. Contact super admin.");
      }
      const userData = userSnap.data();

      if (userData.status && userData.status !== "active") {
        throw new Error("Your account is suspended.");
      }
      if (!permissionsByRole[userData.role]) {
        throw new Error("Your account role is not allowed for admin panel.");
      }

      await startAdminSession({
        uid: cred.user.uid,
        userData,
      });

      router.replace("/admin");
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) {
        setError("Invalid email or password");
      } else if (code === "session/device-not-allowed") {
        setError("This device is not allowed. Contact super admin.");
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

