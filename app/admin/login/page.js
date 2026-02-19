"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { permissionsByRole } from "@/lib/admin/permissions";
import { getOrCreateAdminDeviceId, startAdminSession } from "@/lib/admin/sessionClient";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugStep, setDebugStep] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setDebugStep("Starting login...");
    setLoading(true);

    let currentStep = "auth";

    try {
      currentStep = "credentials";
      setDebugStep("Checking email and password...");
      const cred = await signInWithEmailAndPassword(auth, email, password);

      currentStep = "profile";
      setDebugStep("Reading admin profile...");
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

      currentStep = "session";
      setDebugStep("Creating secure session...");
      await startAdminSession({
        uid: cred.user.uid,
        userData,
      });

      currentStep = "redirect";
      setDebugStep("Redirecting...");
      router.replace("/admin");
    } catch (err) {
      const code = String(err?.code || "");

      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found")
      ) {
        setError("Invalid email or password");
      } else if (code === "session/device-not-allowed") {
        const deviceId = getOrCreateAdminDeviceId();
        setError(`This device is not allowed. Share this Device ID with super admin: ${deviceId}`);
      } else if (code === "permission-denied" || code.includes("permission")) {
        setError(
          "Missing or insufficient permissions. Firestore rules or user profile is blocking this login."
        );
      } else {
        setError(err?.message || "Login failed. Please try again.");
      }

      setDebugStep(`Failed at step: ${currentStep}`);
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoDot} />
          <h1 style={styles.brand}>Ultra Study Point</h1>
        </div>
        <p style={styles.subtitle}>Admin Panel Sign In</p>

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
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error && <p style={styles.error}>{error}</p>}
          {!!debugStep && <p style={styles.debug}>{debugStep}</p>}
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 10% 20%, #1d4ed8 0%, transparent 35%), radial-gradient(circle at 90% 85%, #0ea5e9 0%, transparent 30%), linear-gradient(135deg, #0b1220, #111827)",
    padding: "16px",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "30px",
    border: "1px solid #cbd5e1",
    boxShadow: "0 24px 60px rgba(2, 6, 23, 0.3)",
  },

  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  logoDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
  },

  brand: {
    margin: 0,
    textAlign: "center",
    fontSize: "25px",
    fontWeight: "700",
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "6px",
    marginBottom: "28px",
    textAlign: "center",
    fontSize: "14px",
    color: "#475569",
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
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    outline: "none",
  },

  button: {
    marginTop: "16px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    color: "#ffffff",
  },

  error: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#dc2626",
    textAlign: "left",
  },

  debug: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#334155",
    textAlign: "left",
  },
};
