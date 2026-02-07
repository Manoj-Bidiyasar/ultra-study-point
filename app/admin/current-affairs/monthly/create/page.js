"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

import {
  generateSlug,
  buildTitle,
} from "@/lib/content/contentUtils";

/* ================= COLLECTION ================= */

const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "currentAffairs",
];

const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

/* ================= DATE → IDS ================= */

function suggestMonthly(dateStr) {
  if (!dateStr) return {};

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return {};

  const year = d.getFullYear();
  const monthIndex = d.getMonth();

  const shortMonth = MONTH_SHORT[monthIndex];

  const caDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;

  const title = buildTitle({
    module: "current-affairs",
    type: "monthly",
    date: caDate,
  });

  return {
    caDate,
    title,
    slug: generateSlug(title),
    docId: `${shortMonth}-${year}-Monthly-CA`,
  };
}

/* ================= PAGE ================= */

export default function CreateMonthlyCA() {
  const router = useRouter();

  const [caDate, setCaDate] = useState("");
  const [docId, setDocId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  async function handleOpenEditor() {
    const ref = doc(db, ...COLLECTION_PATH, docId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      alert("Monthly Current Affairs already exists");
      return;
    }

    router.push(
      `/admin/current-affairs/monthly/${docId}` +
        `?new=true` +
        `&slug=${encodeURIComponent(slug)}` +
        `&caDate=${encodeURIComponent(caDate)}`
    );
  }

  return (
    <div style={{ maxWidth: 520, padding: 24 }}>
      <h1>Create Monthly Current Affairs</h1>

      <label>Select Month</label>
      <input
        type="month"
        onChange={(e) => {
          const val = e.target.value;
          const firstDay = val + "-01";

          const s = suggestMonthly(firstDay);

          setCaDate(s.caDate);
          setDocId(s.docId);
          setSlug(s.slug);
          setTitle(s.title);
        }}
        style={styles.input}
      />

      <label>Title</label>
      <input value={title} disabled style={styles.input} />

      <label>Document ID</label>
      <input value={docId} disabled style={styles.input} />

      <label>Slug</label>
      <input
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(generateSlug(e.target.value));
        }}
        style={styles.input}
      />

      <button onClick={handleOpenEditor} style={styles.btn}>
        Open Editor
      </button>
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
  },
};

