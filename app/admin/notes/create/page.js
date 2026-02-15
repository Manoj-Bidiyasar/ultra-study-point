"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { generateSlug } from "@/lib/content/contentUtils";


/* ================= COLLECTION ================= */

const NOTES_COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "master_notes",
];

/* ================= HELPERS ================= */

function toCapitalCase(text = "") {
  return text
    .split(" ")
    .filter(Boolean)
    .map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

function normalizeDocId(text = "") {
  return text
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function titleFromDocId(docId = "") {
  return toCapitalCase(docId.replace(/[-_]+/g, " "));
}


/* ================= PAGE ================= */

export default function CreateNote() {
  const router = useRouter();

  const [docId, setDocId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");

  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function openEditor() {
    setError("");
    const normalizedDocId = normalizeDocId(docId);

    if (!normalizedDocId) {
      setError("Document ID is required");
      return;
    }

    if (!slug) {
      setError("Slug is required");
      return;
    }

   
    setChecking(true);

    const ref = doc(db, ...NOTES_COLLECTION_PATH, normalizedDocId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setChecking(false);
      setError("Document ID already exists");
      return;
    }

    router.push(
      `/admin/notes/${encodeURIComponent(normalizedDocId)}` +
        `?slug=${encodeURIComponent(generateSlug(slug))}` +
        `&title=${encodeURIComponent(title)}` +
        `&new=true`
    );

  }

  return (
    <div style={{ maxWidth: 520, padding: 24 }}>
      <h1>Create Note</h1>

      {/* DOC ID */}
      <label>Document ID (spaces allowed; converted on open)</label>
      <input
        value={docId}
        onChange={(e) => {
          const v = e.target.value;
          setDocId(v);

          if (!slugTouched) {
            setSlug(generateSlug(v));
          }

          setTitle(titleFromDocId(v));
        }}
        placeholder="Indian Polity Fundamental Rights"
        style={styles.input}
      />

      {/* TITLE */}
      <label>Title</label>
      <input
        value={title}
        onChange={(e) =>
          setTitle(toCapitalCase(e.target.value))
        }
        style={styles.input}
      />

      {/* SLUG */}
      <label>Slug (no spaces)</label>
      <input
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(generateSlug(e.target.value));

        }}
        placeholder="indian-polity-fundamental-rights"
        style={styles.input}
      />

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <button
        onClick={openEditor}
        disabled={checking}
        style={styles.btn}
      >
        {checking ? "Checking…" : "Open Editor"}
      </button>

      <p style={styles.note}>
        Document will be created on first save.
      </p>
    </div>
  );
}

/* ================= STYLES ================= */

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

