"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { formatShortDate } from "@/lib/dates/formatters";

const COLLECTION_PATH = ["artifacts", "ultra-study-point", "public", "data", "currentAffairs"];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "object" && typeof value.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function creatorLabel(item) {
  return (
    item?.createdBy?.displayName ||
    item?.createdBy?.email ||
    item?.updatedBy?.displayName ||
    item?.updatedBy?.email ||
    "-"
  );
}

export default function DailyCAListPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState({});
  const [toast, setToast] = useState("");

  const isSuperAdmin = role === "super_admin";
  const isEditor = role === "editor";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    async function loadRole() {
      const user = auth.currentUser;
      if (!user) return;
      setCurrentUser({ uid: user.uid, email: user.email || "" });
      try {
        const ref = doc(db, "artifacts", "ultra-study-point", "public", "data", "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          setRole(data.role || null);
          setCurrentUser((prev) => ({
            ...prev,
            displayName: data.displayName || data.name || user.email || "",
            role: data.role || null,
          }));
        }
      } catch {
        setRole(null);
      }
    }
    loadRole();
  }, []);

  async function cleanupExpiredTrash() {
    if (!isSuperAdmin) return;
    const snap = await getDocs(
      query(collection(db, ...COLLECTION_PATH), where("type", "==", "daily"), where("isDeleted", "==", true), limit(200))
    );
    if (snap.empty) return;

    const now = Date.now();
    const expired = snap.docs.filter((d) => now - toMillis(d.data()?.deletedAt) >= SEVEN_DAYS_MS);
    if (expired.length === 0) return;

    const batch = writeBatch(db);
    expired.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async function loadPage(next = false) {
    setLoading(true);
    if (!next) {
      await cleanupExpiredTrash();
    }

    const q = query(
      collection(db, ...COLLECTION_PATH),
      where("type", "==", "daily"),
      orderBy("caDate", "desc"),
      ...(next && lastDoc ? [startAfter(lastDoc)] : []),
      limit(50)
    );

    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setItems((prev) => (next ? [...prev, ...docs] : docs));
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.size === 50);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      loadPage(false);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const deleted = item.isDeleted === true;
      if (filter === "recently_deleted") {
        if (!deleted) return false;
      } else {
        if (deleted) return false;
        if (filter !== "all" && item.status !== filter) return false;
      }

      if (!search.trim()) return true;
      const qText = search.toLowerCase();
      return String(item.id || "").toLowerCase().includes(qText) || String(item.slug || "").toLowerCase().includes(qText);
    });
  }, [items, filter, search]);

  const selectedItems = filtered.filter((item) => selectedIds[item.id]);
  const selectedTrash = selectedItems.filter((item) => item.isDeleted === true);
  const selectedActive = selectedItems.filter((item) => item.isDeleted !== true);

  async function softDeleteOne(item) {
    if (!isSuperAdmin || !item) return;
    const ok = window.confirm("Move this document to Recently Deleted?");
    if (!ok) return;
    await updateDoc(doc(db, ...COLLECTION_PATH, item.id), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: {
        uid: currentUser?.uid || "",
        email: currentUser?.email || "",
        displayName: currentUser?.displayName || currentUser?.email || "",
        role: "super_admin",
      },
    });
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, isDeleted: true, deletedBy: { displayName: currentUser?.displayName || "" } } : x)));
    setToast("Moved to Recently Deleted");
  }

  async function restoreOne(item) {
    if (!isSuperAdmin || !item || item.isDeleted !== true) return;
    await updateDoc(doc(db, ...COLLECTION_PATH, item.id), {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, isDeleted: false, deletedAt: null, deletedBy: null } : x)));
    setSelectedIds((prev) => ({ ...prev, [item.id]: false }));
    setToast("Restored");
  }

  async function forceDeleteOne(item) {
    if (!isSuperAdmin || !item || item.isDeleted !== true) return;
    const ok = window.confirm("Force delete permanently? This cannot be undone.");
    if (!ok) return;
    await deleteDoc(doc(db, ...COLLECTION_PATH, item.id));
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    setSelectedIds((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setToast("Deleted permanently");
  }

  async function handleBulkMoveToTrash() {
    if (!isSuperAdmin || selectedActive.length === 0) return;
    const ok = window.confirm(`Move ${selectedActive.length} item(s) to Recently Deleted?`);
    if (!ok) return;
    const batch = writeBatch(db);
    selectedActive.forEach((item) => {
      batch.update(doc(db, ...COLLECTION_PATH, item.id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: {
          uid: currentUser?.uid || "",
          email: currentUser?.email || "",
          displayName: currentUser?.displayName || currentUser?.email || "",
          role: "super_admin",
        },
      });
    });
    await batch.commit();
    const idSet = new Set(selectedActive.map((x) => x.id));
    setItems((prev) => prev.map((x) => (idSet.has(x.id) ? { ...x, isDeleted: true } : x)));
    setSelectedIds({});
    setToast("Moved selected items to Recently Deleted");
  }

  async function handleBulkRestore() {
    if (!isSuperAdmin || selectedTrash.length === 0) return;
    const batch = writeBatch(db);
    selectedTrash.forEach((item) => {
      batch.update(doc(db, ...COLLECTION_PATH, item.id), {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
    });
    await batch.commit();
    const idSet = new Set(selectedTrash.map((x) => x.id));
    setItems((prev) => prev.map((x) => (idSet.has(x.id) ? { ...x, isDeleted: false, deletedAt: null, deletedBy: null } : x)));
    setSelectedIds({});
    setToast("Restored selected items");
  }

  async function handleBulkForceDelete() {
    if (!isSuperAdmin || selectedTrash.length === 0) return;
    const ok = window.confirm(`Force delete ${selectedTrash.length} item(s) permanently?`);
    if (!ok) return;
    const batch = writeBatch(db);
    selectedTrash.forEach((item) => batch.delete(doc(db, ...COLLECTION_PATH, item.id)));
    await batch.commit();
    const idSet = new Set(selectedTrash.map((x) => x.id));
    setItems((prev) => prev.filter((x) => !idSet.has(x.id)));
    setSelectedIds({});
    setToast("Deleted selected items permanently");
  }

  return (
    <div style={styles.page}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Daily Current Affairs</h1>
          <p style={styles.subtitle}>Manage daily CA articles</p>
        </div>
        <button onClick={() => router.push("/admin/current-affairs/daily/create")} style={styles.createBtn}>
          + Create Daily CA
        </button>
      </div>

      {isSuperAdmin && (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filter !== "recently_deleted" && (
            <button
              type="button"
              style={selectedActive.length > 0 ? styles.actionBtnWarn : styles.actionBtnDisabled}
              disabled={selectedActive.length === 0}
              onClick={handleBulkMoveToTrash}
            >
              Move Selected to Recently Deleted ({selectedActive.length})
            </button>
          )}
          {filter === "recently_deleted" && (
            <>
              <button
                type="button"
                style={selectedTrash.length > 0 ? styles.actionBtn : styles.actionBtnDisabled}
                disabled={selectedTrash.length === 0}
                onClick={handleBulkRestore}
              >
                Restore Selected ({selectedTrash.length})
              </button>
              <button
                type="button"
                style={selectedTrash.length > 0 ? styles.actionBtnDanger : styles.actionBtnDisabled}
                disabled={selectedTrash.length === 0}
                onClick={handleBulkForceDelete}
              >
                Force Delete Selected ({selectedTrash.length})
              </button>
            </>
          )}
        </div>
      )}

      <input
        placeholder="Search by ID or slug..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      <div style={styles.filters}>
        {["all", "draft", "review", "published", "scheduled", ...(isSuperAdmin ? ["recently_deleted"] : [])].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ ...styles.filterBtn, ...(filter === s ? styles.filterActive : {}) }}>
            {s === "recently_deleted" ? "Recently Deleted" : s}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && <p>No documents found.</p>}

      {!loading && filtered.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {isSuperAdmin && <th style={styles.th}>Select</th>}
                <th style={styles.th}>Slug</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                {!isEditor && <th style={styles.th}>Creator</th>}
                {isSuperAdmin && filter === "recently_deleted" && <th style={styles.th}>Deleted At</th>}
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} style={styles.row}>
                  {isSuperAdmin && (
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedIds[item.id])}
                        onChange={(e) => setSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                      />
                    </td>
                  )}
                  <td style={styles.slug}>{item.slug || item.id}</td>
                  <td style={styles.td}>{formatShortDate(item.caDate)}</td>
                  <td style={styles.td}>
                    <span style={styles.status(item.status)}>{item.status || "draft"}</span>
                  </td>
                  {!isEditor && <td style={styles.td}>{creatorLabel(item)}</td>}
                  {isSuperAdmin && filter === "recently_deleted" && <td style={styles.td}>{formatShortDate(item.deletedAt)}</td>}
                  <td style={styles.td}>
                    {filter !== "recently_deleted" && (
                      <>
                        <button style={styles.iconBtn} onClick={() => router.push(`/admin/current-affairs/daily/${item.id}`)}>Edit</button>
                        <button style={styles.iconBtn} onClick={() => window.open(`/current-affairs/daily/${item.slug}`, "_blank")}>Preview</button>
                        {isSuperAdmin && <button style={styles.iconBtnWarn} onClick={() => softDeleteOne(item)}>Delete</button>}
                      </>
                    )}
                    {isSuperAdmin && filter === "recently_deleted" && (
                      <>
                        <button style={styles.iconBtn} onClick={() => restoreOne(item)}>Restore</button>
                        <button style={styles.iconBtnDanger} onClick={() => forceDeleteOne(item)}>Force Delete</button>
                      </>
                    )}
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
  page: { maxWidth: 1200, padding: 24, margin: "0 auto" },
  toast: {
    marginBottom: 12,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #86efac",
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 600 },
  subtitle: { fontSize: 13, color: "#6b7280" },
  createBtn: { padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },
  search: { width: "100%", padding: 8, marginBottom: 12, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 },
  filters: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  filterBtn: { padding: "6px 12px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", borderRadius: 999, fontSize: 12, textTransform: "capitalize" },
  filterActive: { background: "#111827", color: "#fff", border: "1px solid #111827" },
  tableWrap: { border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px", fontSize: 12, color: "#6b7280", background: "#f9fafb" },
  row: { borderTop: "1px solid #e5e7eb" },
  td: { padding: "12px", fontSize: 13, color: "#111827" },
  slug: { padding: "12px", fontSize: 13, fontWeight: 500, color: "#2563eb", wordBreak: "break-word" },
  iconBtn: { border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12, marginRight: 8, borderRadius: 6, padding: "4px 8px" },
  iconBtnWarn: { border: "1px solid #fcd34d", background: "#fffbeb", cursor: "pointer", fontSize: 12, marginRight: 8, borderRadius: 6, padding: "4px 8px", color: "#92400e" },
  iconBtnDanger: { border: "1px solid #fca5a5", background: "#fee2e2", cursor: "pointer", fontSize: 12, borderRadius: 6, padding: "4px 8px", color: "#991b1b" },
  status: (status) => ({
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 12,
    textTransform: "capitalize",
    background: status === "published" ? "#dcfce7" : status === "review" ? "#fef9c3" : status === "scheduled" ? "#ede9fe" : "#e5e7eb",
    color: status === "published" ? "#166534" : status === "review" ? "#92400e" : status === "scheduled" ? "#6b21a8" : "#374151",
  }),
  loadMore: { marginTop: 16, padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 },
  actionBtn: { padding: "8px 12px", borderRadius: 6, border: "1px solid #93c5fd", background: "#eff6ff", color: "#1e3a8a", cursor: "pointer", fontSize: 13, fontWeight: 700 },
  actionBtnWarn: { padding: "8px 12px", borderRadius: 6, border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", cursor: "pointer", fontSize: 13, fontWeight: 700 },
  actionBtnDanger: { padding: "8px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontSize: 13, fontWeight: 700 },
  actionBtnDisabled: { padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed", fontSize: 13, fontWeight: 700 },
};
