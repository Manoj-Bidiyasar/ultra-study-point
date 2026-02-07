"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { generateSlug } from "@/lib/content/contentUtils";

const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "PYQs",
];

export default function CreatePyq() {
  const router = useRouter();

  const [docId, setDocId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function openEditor() {
    setError("");

    if (!docId.trim()) {
      setError("Document ID is required");
      return;
    }

    if (!slug) {
      setError("Slug is required");
      return;
    }

    setChecking(true);

    try {
      const ref = doc(db, ...COLLECTION_PATH, docId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setError("Document ID already exists");
        return;
      }

      router.push(
        `/admin/pyqs/${encodeURIComponent(docId)}?slug=${encodeURIComponent(
          generateSlug(slug)
        )}&new=true`
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to open editor. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, padding: 24 }}>
      <h1>Create PYQ</h1>

      <label>Document ID (spaces allowed)</label>
      <input
        value={docId}
        onChange={(e) => {
          const v = e.target.value;
          setDocId(v);
          if (!slugTouched) setSlug(generateSlug(v));
          setTitle(v);
        }}
        placeholder="SSC CGL 2023 Tier 1"
        style={styles.input}
      />

      <label>Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={styles.input}
      />

      <label>Slug (no spaces)</label>
      <input
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(generateSlug(e.target.value));
        }}
        placeholder="ssc-cgl-2023-tier-1"
        style={styles.input}
      />

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <button onClick={openEditor} disabled={checking} style={styles.btn}>
        {checking ? "Checkingâ€¦" : "Open Editor"}
      </button>

      <p style={styles.note}>Document will be created on first save.</p>
    </div>
  );
}

const styles = {
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 12,
    border: "1px solid #d1d5db",
    borderRadius: 6,
  },
  btn: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  note: {
    marginTop: 10,
    fontSize: 13,
    color: "#6b7280",
  },
};
