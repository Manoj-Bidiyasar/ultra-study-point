"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { formatShortDate } from "@/lib/dates/formatters";

const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "Quizzes",
];

export default function QuizzesListPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(next = false) {
    setLoading(true);

    const q = query(
      collection(db, ...COLLECTION_PATH),
      orderBy("updatedAt", "desc"),
      ...(next && lastDoc ? [startAfter(lastDoc)] : []),
      limit(50)
    );

    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setItems((prev) => (next ? [...prev, ...docs] : docs));
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.size === 50);
    setLoading(false);
  }

  useEffect(() => {
    loadPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered =
    filter === "all"
      ? items
      : items.filter((x) => x.status === filter);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Quizzes</h1>
          <p style={styles.subtitle}>
            Manage tests, sections, and question banks
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/quizzes/create")}
          style={styles.createBtn}
        >
          + Create Quiz
        </button>
      </div>

      <div style={styles.filters}>
        {["all", "draft", "review", "published", "hidden"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              ...styles.filterBtn,
              ...(filter === s ? styles.filterActive : {}),
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      {!loading && filtered.length === 0 && <p>No quizzes found.</p>}

      {!loading && filtered.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Updated</th>
                <th style={styles.th}>Editor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  style={styles.row}
                  onClick={() => router.push(`/admin/quizzes/${item.id}`)}
                >
                  <td style={styles.slug}>
                    {item.title || item.id}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.status(item.status)}>
                      {item.status || "draft"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {formatShortDate(item.updatedAt)}
                  </td>
                  <td style={styles.td}>
                    {item.updatedBy?.email ||
                      item.createdBy?.email ||
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && !loading && (
        <button style={styles.loadMore} onClick={() => loadPage(true)}>
          Load more
        </button>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1200,
    padding: 24,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: 600 },
  subtitle: { fontSize: 13, color: "#6b7280" },
  createBtn: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  filters: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "6px 12px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    borderRadius: 999,
    fontSize: 12,
    textTransform: "capitalize",
  },
  filterActive: {
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
  },
  tableWrap: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "12px",
    fontSize: 12,
    color: "#6b7280",
    background: "#f9fafb",
  },
  row: { cursor: "pointer", borderTop: "1px solid #e5e7eb" },
  td: { padding: "12px", fontSize: 13, color: "#111827" },
  slug: {
    padding: "12px",
    fontSize: 13,
    fontWeight: 500,
    color: "#2563eb",
    wordBreak: "break-word",
  },
  status: (status) => ({
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 12,
    textTransform: "capitalize",
    background:
      status === "published"
        ? "#dcfce7"
        : status === "review"
        ? "#fef9c3"
        : status === "hidden"
        ? "#fee2e2"
        : "#e5e7eb",
    color:
      status === "published"
        ? "#166534"
        : status === "review"
        ? "#92400e"
        : status === "hidden"
        ? "#b91c1c"
        : "#374151",
  }),
  loadMore: {
    marginTop: 16,
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
};
