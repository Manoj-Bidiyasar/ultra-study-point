"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

const basePath = ["artifacts", "ultra-study-point", "public", "data"];

function toDateSafe(v) {
  return v?.toDate?.() || null;
}

function getCollectionByType(type) {
  if (type === "notes") return "master_notes";
  if (type === "quiz") return "Quizzes";
  if (type === "pyq") return "PYQs";
  return "currentAffairs";
}

function buildHref(item) {
  if (item.type === "notes") return `/admin/notes/${item.docId}`;
  if (item.type === "quiz") return `/admin/quizzes/${item.docId}`;
  if (item.type === "pyq") return `/admin/pyqs/${item.docId}`;
  return `/admin/current-affairs/${item.type}/${item.docId}`;
}

export default function ReviewsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsub = null;

    async function enrichRowsWithSlug(rows) {
      return Promise.all(
        rows.map(async (row) => {
          if (row.slug) return row;
          try {
            const collectionName = getCollectionByType(row.type);
            const ref = doc(db, ...basePath, collectionName, row.docId);
            const snap = await getDoc(ref);
            if (!snap.exists()) return { ...row, slug: "" };
            const data = snap.data() || {};
            return {
              ...row,
              slug: data.slug || "",
              title: row.title || data.title || row.docId,
            };
          } catch {
            return { ...row, slug: "" };
          }
        })
      );
    }

    async function loadFallback() {
      try {
        const [ca, notes, quiz, pyq] = await Promise.all([
          getDocs(query(collection(db, ...basePath, "currentAffairs"), where("status", "==", "review"), limit(40))),
          getDocs(query(collection(db, ...basePath, "master_notes"), where("status", "==", "review"), limit(40))),
          getDocs(query(collection(db, ...basePath, "Quizzes"), where("status", "==", "review"), limit(40))),
          getDocs(query(collection(db, ...basePath, "PYQs"), where("status", "==", "review"), limit(40))),
        ]);

        const rows = [
          ...ca.docs.map((d) => ({ id: `ca-${d.id}`, docId: d.id, type: d.data().type || "daily", title: d.data().title || d.id, slug: d.data().slug || "", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null })),
          ...notes.docs.map((d) => ({ id: `notes-${d.id}`, docId: d.id, type: "notes", title: d.data().title || d.id, slug: d.data().slug || "", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null })),
          ...quiz.docs.map((d) => ({ id: `quiz-${d.id}`, docId: d.id, type: "quiz", title: d.data().title || d.id, slug: d.data().slug || "", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null })),
          ...pyq.docs.map((d) => ({ id: `pyq-${d.id}`, docId: d.id, type: "pyq", title: d.data().title || d.id, slug: d.data().slug || "", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null })),
        ];
        setItems(rows);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    async function init() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, ...basePath, "users", user.uid);
      const snap = await getDoc(userRef);
      const nextRole = snap.exists() ? snap.data().role : null;

      if (nextRole !== "admin" && nextRole !== "super_admin") {
        setError("Only admin/super admin can view review queue.");
        setLoading(false);
        return;
      }

      try {
        const reviewRef = collection(db, ...basePath, "review_queue");
        const pendingQ = query(
          reviewRef,
          where("status", "==", "pending"),
          orderBy("submittedAt", "desc"),
          limit(80)
        );

        unsub = onSnapshot(
          pendingQ,
          async (qSnap) => {
            if (qSnap.size > 0) {
              const queueRows = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
              const enriched = await enrichRowsWithSlug(queueRows);
              setItems(enriched);
              setLoading(false);
              return;
            }
            await loadFallback();
          },
          async () => {
            await loadFallback();
          }
        );
      } catch {
        await loadFallback();
      }
    }

    init();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = toDateSafe(a.submittedAt)?.getTime?.() || 0;
      const bt = toDateSafe(b.submittedAt)?.getTime?.() || 0;
      return bt - at;
    });
  }, [items]);

  return (
    <div>
      <h1>Review Queue</h1>
      <p style={{ color: "#64748b", marginTop: 6 }}>
        Pending items submitted by editors are shown here in realtime.
      </p>

      {!loading && !error && (
        <div style={ui.summaryCard}>
          <div style={ui.summaryCount}>Pending Reviews: {sortedItems.length}</div>
        </div>
      )}

      {error ? <div style={ui.error}>{error}</div> : null}
      {loading ? <div style={{ marginTop: 14 }}>Loading review items...</div> : null}
      {!loading && sortedItems.length === 0 ? (
        <div style={ui.empty}>No pending review items.</div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        {sortedItems.map((item) => (
          <div key={`${item.type}-${item.id}`} style={ui.row}>
            <div>
              <b>
                {item.title || item.docId} ({item.slug || "-"})
              </b>
              <div style={ui.meta}>
                Type: {String(item.type || "content").toUpperCase()} | Editor:{" "}
                {item.createdBy?.displayName || "Unknown"}(
                {item.createdBy?.email || "no-email"}) | Submitted:{" "}
                {item.submittedAt?.toDate?.()?.toLocaleString?.() || "-"}
              </div>
            </div>
            <a href={buildHref(item)} style={ui.openBtn}>Open</a>
          </div>
        ))}
      </div>
    </div>
  );
}

const ui = {
  summaryCard: {
    marginTop: 10,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    borderRadius: 8,
    padding: 10,
  },
  summaryCount: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e3a8a",
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  row: {
    padding: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  meta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  openBtn: {
    textDecoration: "none",
    border: "1px solid #93c5fd",
    background: "#eff6ff",
    color: "#1e3a8a",
    padding: "6px 10px",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: "nowrap",
    alignSelf: "center",
  },
  error: {
    marginTop: 10,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
    padding: 10,
  },
  empty: {
    marginTop: 14,
    border: "1px dashed #cbd5e1",
    background: "#f8fafc",
    color: "#475569",
    borderRadius: 8,
    padding: 10,
  },
};
