"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { formatShortDate } from "@/lib/dates/formatters";

/* ================= COLLECTION PATH ================= */
const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "currentAffairs",
];

export default function DailyCAListPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(""); // ✅ NEW
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  /* ================= LOAD DATA ================= */
  async function loadPage(next = false) {
    const q = query(
      collection(db, ...COLLECTION_PATH),
      where("type", "==", "daily"),
      orderBy("caDate", "desc"),
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

  /* ================= FILTER + SEARCH ================= */
  const filtered = items.filter((item) => {
    // status filter
    if (filter !== "all" && item.status !== filter) {
      return false;
    }

    // search filter
    if (!search) return true;

    const q = search.toLowerCase();

    return (
      item.id?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q)
    );
  });


  /* ================= UI ================= */
  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Daily Current Affairs
          </h1>
          <p style={styles.subtitle}>
            Manage daily CA articles
          </p>
        </div>

        <button
          onClick={() =>
            router.push(
              "/admin/current-affairs/daily/create"
            )
          }
          style={styles.createBtn}
        >
          + Create Daily CA
        </button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search by ID or slug…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* FILTERS */}
      <div style={styles.filters}>
        {[
          "all",
          "draft",
          "review",
          "published",
          "scheduled",
        ].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              ...styles.filterBtn,
              ...(filter === s
                ? styles.filterActive
                : {}),
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p>No Daily Current Affairs found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Slug</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Editor</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} style={styles.row}>
                  <td style={styles.slug}>
                    {item.slug || item.id}
                  </td>

                  <td style={styles.td}>
                    {formatShortDate(item.caDate)}
                  </td>

                  <td style={styles.td}>
                    <span
                      style={styles.status(
                        item.status
                      )}
                    >
                      {item.status || "draft"}
                    </span>
                  </td>

                  <td style={styles.td}>
                    {item.createdByName || "—"}
                  </td>

                  <td style={styles.td}>
                    <button
                      style={styles.iconBtn}
                      onClick={() =>
                        router.push(
                          `/admin/current-affairs/daily/${item.id}`
                        )
                      }
                      title="Edit"
                    >
                      ✏️
                    </button>

                    <button
                      style={styles.iconBtn}
                      onClick={() =>
                        window.open(
                          `/current-affairs/daily/${item.slug}`,
                          "_blank"
                        )
                      }
                      title="Preview"
                    >
                      👁️
                    </button>
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

/* ================= STYLES ================= */

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

  title: {
    fontSize: 22,
    fontWeight: 600,
  },

  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },

  createBtn: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  search: {
    width: "100%",
    padding: 8,
    marginBottom: 12,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
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

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    fontSize: 12,
    color: "#6b7280",
    background: "#f9fafb",
  },

  row: {
    borderTop: "1px solid #e5e7eb",
  },

  td: {
    padding: "12px",
    fontSize: 13,
    color: "#111827",
  },

  slug: {
    padding: "12px",
    fontSize: 13,
    fontWeight: 500,
    color: "#2563eb",
    wordBreak: "break-word",
  },

  iconBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    marginRight: 8,
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
        : status === "scheduled"
        ? "#ede9fe"
        : "#e5e7eb",
    color:
      status === "published"
        ? "#166534"
        : status === "review"
        ? "#92400e"
        : status === "scheduled"
        ? "#6b21a8"
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

