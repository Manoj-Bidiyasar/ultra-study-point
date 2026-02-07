"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  generateSlug,
} from "@/lib/content/contentUtils";



export default function RelatedContentSection({
  value = [],
  onChange,
  pageType,
  pageCaDate,
  notesMeta,
}) {
  const [picker, setPicker] = useState({
    open: false,
    index: null,
    data: [],
  });
  const [auto, setAuto] = useState({
    loading: false,
    error: null,
    data: {
      daily: [],
      monthly: [],
      notes: [],
    },
  });

  function getCollectionByType(type) {
    if (type === "notes") return "master_notes";
    return "currentAffairs";
  }

  function normalizeDate(value) {
    if (!value) return null;
    const d = value?.toDate?.() || new Date(value);
    if (isNaN(d)) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function minusDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isSameMonth(a, b) {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth()
    );
  }

  async function loadRelations(type, opts = {}) {
    if (!type) return [];
    const { limitCount = 30, orderByCaDate = false } = opts;
    const collectionName = getCollectionByType(type);

    const baseRef = collection(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      collectionName
    );

    const clauses = [where("status", "==", "published")];

    if (type === "daily" || type === "monthly") {
      clauses.unshift(where("type", "==", type));
    }

    if (orderByCaDate && (type === "daily" || type === "monthly")) {
      clauses.push(orderBy("caDate", "desc"));
    }

    clauses.push(limit(limitCount));

    const q = query(baseRef, ...clauses);

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      slug: d.data()?.slug || d.id,
      type: d.data()?.type || type,
    }));
  }

  async function loadDailyByDates(dates = []) {
    if (!dates.length) return [];
    const baseRef = collection(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "currentAffairs"
    );

    const snaps = await Promise.all(
      dates.map((d) => {
        const ts = Timestamp.fromDate(d);
        const q = query(
          baseRef,
          where("type", "==", "daily"),
          where("status", "==", "published"),
          where("caDate", "==", ts),
          limit(1)
        );
        return getDocs(q);
      })
    );

    const out = [];
    snaps.forEach((snap) => {
      if (!snap.empty) {
        const doc = snap.docs[0];
        out.push({
          id: doc.id,
          ...doc.data(),
          slug: doc.data()?.slug || doc.id,
          type: "daily",
        });
      }
    });

    return out;
  }

  async function loadRecentMonthly({
    limitCount = 2,
    excludeMonthDate = null,
  } = {}) {
    const baseRef = collection(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "currentAffairs"
    );

    const q = query(
      baseRef,
      where("type", "==", "monthly"),
      where("status", "==", "published"),
      orderBy("caDate", "desc"),
      limit(Math.max(limitCount + 3, 6))
    );

    const snap = await getDocs(q);
    const out = [];

    snap.forEach((doc) => {
      const data = doc.data();
      const caDate = data?.caDate?.toDate?.() || null;
      if (excludeMonthDate && isSameMonth(caDate, excludeMonthDate)) {
        return;
      }
      out.push({
        id: doc.id,
        ...data,
        slug: data?.slug || doc.id,
        type: "monthly",
      });
    });

    return out.slice(0, limitCount);
  }

  async function loadNotesByCategory({
    categoryId,
    limitCount = 8,
  } = {}) {
    const baseRef = collection(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "master_notes"
    );

    const clauses = [where("status", "==", "published")];
    if (categoryId) {
      clauses.push(where("categoryId", "==", categoryId));
    }
    clauses.push(limit(limitCount));

    const q = query(baseRef, ...clauses);
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      slug: d.data()?.slug || d.id,
      type: "notes",
    }));
  }

  const items = value || [];

  useEffect(() => {
    loadAutoSuggestions();
  }, [pageType, pageCaDate, notesMeta?.categoryId]);

  async function loadAutoSuggestions() {
    setAuto((s) => ({
      ...s,
      loading: true,
      error: null,
    }));

    try {
      const today = normalizeDate(new Date());
      const t1 = minusDays(today, 1);
      const t2 = minusDays(today, 2);
      const pageDate = normalizeDate(pageCaDate);

      let daily = [];
      let monthly = [];

      if (pageType === "daily") {
        if (!pageDate || pageDate >= today) {
          daily = await loadDailyByDates([t1, t2]);
        } else if (pageDate.getTime() === t1.getTime()) {
          daily = await loadDailyByDates([today, t2]);
        } else {
          daily = await loadDailyByDates([today, t1]);
        }

        monthly = await loadRecentMonthly({
          limitCount: 1,
        });
      } else if (pageType === "monthly") {
        daily = await loadDailyByDates([today]);
        monthly = await loadRecentMonthly({
          limitCount: 2,
          excludeMonthDate: pageDate,
        });
      } else if (pageType === "notes") {
        daily = await loadDailyByDates([today, t1]);
        monthly = await loadRecentMonthly({
          limitCount: 1,
        });
      } else {
        daily = await loadRelations("daily", {
          limitCount: 6,
          orderByCaDate: true,
        });
        monthly = await loadRelations("monthly", {
          limitCount: 6,
          orderByCaDate: true,
        });
      }

      const notes = await loadNotesByCategory({
        categoryId: notesMeta?.categoryId || "",
        limitCount: 8,
      });

      setAuto({
        loading: false,
        error: null,
        data: { daily, monthly, notes },
      });
    } catch (err) {
      setAuto({
        loading: false,
        error: err?.message || "Failed to load auto suggestions.",
        data: { daily: [], monthly: [], notes: [] },
      });
    }
  }

  function addItemFromAuto(doc) {
    const exists = items.some(
      (i) => i.type === doc.type && i.slug === doc.slug
    );

    if (exists) return;

    onChange([
      ...items,
      {
        type: doc.type,
        title: doc.title || doc.seoTitle || doc.slug,
        slug: doc.slug,
      },
    ]);
  }

  return (
    <div style={ui.card}>
      <div style={ui.header}>
        <h3 style={ui.title}>Related Content</h3>

        <button
          style={ui.btn}
          onClick={() =>
            onChange([
              ...items,
              { type: "", title: "", slug: "" },
            ])
          }
        >
          + Add
        </button>
      </div>

      {/* AUTO SUGGESTIONS */}
      <div style={ui.autoCard}>
        <div style={ui.autoHeader}>
          <div style={ui.autoTitle}>Auto Suggestions</div>
          <button style={ui.btnSmall} onClick={loadAutoSuggestions}>
            {auto.loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {auto.error && (
          <div style={ui.errorText}>{auto.error}</div>
        )}

        {!auto.loading && (
          <div style={ui.autoGrid}>
            {[
              { label: "Daily CA", key: "daily" },
              { label: "Monthly CA", key: "monthly" },
              { label: "Notes", key: "notes" },
            ].map(({ label, key }) => (
              <div key={key} style={ui.autoGroup}>
                <div style={ui.autoGroupTitle}>{label}</div>
                {auto.data[key]?.length > 0 ? (
                  auto.data[key].map((doc) => {
                    const isAdded = items.some(
                      (i) =>
                        i.type === doc.type && i.slug === doc.slug
                    );

                    return (
                      <div key={doc.id} style={ui.autoItem}>
                        <div style={ui.autoItemText}>
                          <div style={ui.autoItemTitle}>
                            {doc.title || doc.seoTitle || doc.slug}
                          </div>
                          <div style={ui.autoItemSlug}>
                            {doc.slug}
                          </div>
                        </div>
                        <button
                          style={{
                            ...ui.btnSmall,
                            opacity: isAdded ? 0.6 : 1,
                            cursor: isAdded ? "not-allowed" : "pointer",
                          }}
                          onClick={() =>
                            !isAdded && addItemFromAuto(doc)
                          }
                          disabled={isAdded}
                        >
                          {isAdded ? "Added" : "Add"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div style={ui.autoEmpty}>No suggestions</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {items.map((item, index) => (
        <div key={index} style={ui.row}>
          {/* TYPE */}
          <input
            list={`types-${index}`}
            placeholder="Type"
            value={item.type}
            style={ui.input}
            onChange={(e) => {
              const updated = [...items];
              updated[index].type = e.target.value;
              onChange(updated);
            }}
          />

          <datalist id={`types-${index}`}>
            <option value="daily" />
            <option value="monthly" />
            <option value="notes" />
          </datalist>

          {/* TITLE */}
          <input
            placeholder="Title"
            style={ui.input}
            value={item.title}
            onChange={(e) => {
              const updated = [...items];
              updated[index].title = e.target.value;

              if (!updated[index].slug) {
                updated[index].slug = generateSlug(e.target.value);

              }

              onChange(updated);
            }}
          />

          {/* SLUG */}
          <input
            placeholder="Slug"
            style={{
              ...ui.input,
              borderColor:
  item.slug && !/^[a-z0-9-]+$/.test(item.slug)
    ? "#ef4444"
    : "#d1d5db",

            }}
            value={item.slug}
            onChange={(e) => {
              const updated = [...items];
              updated[index].slug = e.target.value;
              onChange(updated);
            }}
          />

          {/* LINK */}
          <a
            href={
              item.type && item.slug
                ? item.type === "notes"
                  ? `/notes/${item.slug}`
                  : `/current-affairs/${item.type}/${item.slug}`
                : "#"
            }
            target="_blank"
            style={ui.link}
          >
            🔗
          </a>

          {/* BROWSE */}
          <button
            style={{
              ...ui.btnSmall,
              opacity: item.type ? 1 : 0.6,
              cursor: item.type ? "pointer" : "not-allowed",
            }}
            disabled={!item.type}
            onClick={async () => {
              const data = await loadRelations(item.type);
              setPicker({
                open: true,
                index,
                data,
              });
            }}
          >
            Browse
          </button>

          {/* DELETE */}
          <button
            style={ui.delete}
            onClick={() => {
              const updated = [...items];
              updated.splice(index, 1);
              onChange(updated);
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* MODAL */}
      {picker.open && (
        <div style={ui.overlay}>
          <div style={ui.modal}>
            <div style={ui.modalHeader}>
              Select Content
              <button
                onClick={() =>
                  setPicker({
                    open: false,
                    index: null,
                    data: [],
                  })
                }
              >
                ✕
              </button>
            </div>

            <div>
              {picker.data.map((doc) => (
                <div
                  key={doc.id}
                  style={ui.item}
                  onClick={() => {
                    const updated = [...items];

                    updated[picker.index] = {
                      type: doc.type,
                      title: doc.title,
                      slug: doc.slug,
                    };

                    onChange(updated);
                    setPicker({
                      open: false,
                      index: null,
                      data: [],
                    });
                  }}
                >
                  <b>{doc.title}</b>
                  <div style={{ fontSize: 12 }}>
                    {doc.slug}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ui = {
  card: {
    background: "#fff",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: 700 },
  autoCard: {
    border: "1px dashed #e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    background: "#fafafa",
  },
  autoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  autoTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },
  autoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
  },
  autoGroup: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fff",
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  autoGroupTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
  },
  autoItem: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    border: "1px solid #f3f4f6",
    borderRadius: 6,
    padding: "6px 8px",
  },
  autoItemText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  autoItemTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  autoItemSlug: {
    fontSize: 11,
    color: "#6b7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  autoEmpty: {
    fontSize: 12,
    color: "#9ca3af",
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 8,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "120px 1.5fr 1.5fr 40px 80px 40px",
    gap: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  input: {
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
  },
  link: {
    textDecoration: "none",
    color: "#2563eb",
  },
  btn: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "4px 8px",
    fontSize: 13,
  },
  delete: {
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: 6,
    background: "#fff",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    width: 700,
    maxHeight: "80vh",
    background: "#fff",
    borderRadius: 8,
    overflow: "auto",
  },
  modalHeader: {
    padding: 12,
    fontWeight: 700,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
  },
  item: {
    padding: 12,
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
};

