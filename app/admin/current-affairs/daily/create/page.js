"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  generateSlug,
  buildTitle,
} from "@/lib/content/contentUtils";



/* ================= COLLECTION PATH ================= */
const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "currentAffairs",
];


/* ================= DATE → DOC ID / SLUG / TITLE ================= */

function suggestFromDate(dateStr) {
  if (!dateStr) {
    return { docId: "", slug: "", title: "" };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { docId: "", slug: "", title: "" };
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const docId = `${year}-${month}-${day}`;

  const title = buildTitle({
    module: "current-affairs",
    type: "daily",
    date: dateStr,
  });

  const slug = generateSlug(title);

  return { docId, slug, title };
}






/* ================= PAGE ================= */

export default function CreateDailyCA() {
  const router = useRouter();

  const [docId, setDocId] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [caDate, setCaDate] = useState("");
const [title, setTitle] = useState("");


  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleOpenEditor() {
    setError("");

      /* ---------- VALIDATION ---------- */
    if (!docId || !slug) {
      setError("Document ID and Slug are required");
      return;
    }

     setChecking(true);

    /* ---------- DOC ID UNIQUENESS ---------- */
    const ref = doc(db, ...COLLECTION_PATH, docId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setChecking(false);
      setError("Document ID already exists");
      return;
    }

    /* ---------- OPEN EDITOR (NEW DOC) ---------- */
    router.push(
      `/admin/current-affairs/daily/${docId}` +
        `?slug=${encodeURIComponent(slug)}` +
        `&new=true` +
        `&caDate=${encodeURIComponent(caDate)}`
    );

  }

  return (
    <div style={{ maxWidth: 520, padding: 24 }}>
      <h1>Create Daily Current Affairs</h1>



      <label>Current Affairs Date</label>
<input
  type="date"
  value={caDate}
  onChange={(e) => {
    const val = e.target.value;
    setCaDate(val);

    const suggested = suggestFromDate(val);
    setDocId(suggested.docId);
    setSlug(suggested.slug);
    setTitle(suggested.title);
  }}
  style={styles.input}
/>
<label>Title</label>
<input
  value={title}
  onChange={(e) => {
    const t = e.target.value;
    setTitle(t);

    // auto-update slug only if user has not edited slug manually
    if (!slugTouched) {
      setSlug(generateSlug(t));
    }
  }}
  style={styles.input}
/>


      {/* DOCUMENT ID */}
      <label>Document ID</label>
      <input
        value={docId}
        onChange={(e) => {
          const val = e.target.value;
          setDocId(val);

          if (!slugTouched && val) {
  setSlug(generateSlug(val));
}

        }}
        placeholder="2026-01-14"
        style={styles.input}
      />

      {/* SLUG */}
      <label>Slug</label>
      <input
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(generateSlug(e.target.value));

        }}
        placeholder="14-january-2026"
        style={styles.input}
      />

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      <button
        onClick={handleOpenEditor}
        disabled={checking}
        style={styles.btn}
      >
        {checking ? "Checking…" : "Open Editor"}
      </button>

      <p style={styles.note}>
        Document will be created automatically on first save.
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

