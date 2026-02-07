"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";


const basePath = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);
  const [role, setRole] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState({
    type: "all",
    editor: "all",
    range: "all",
  });
  const [activity, setActivity] = useState([]);
  const [activityUser, setActivityUser] = useState("all");
  const [editorStats, setEditorStats] = useState(null);
  const [returnedItems, setReturnedItems] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [activityUsers, setActivityUsers] = useState([]);
  const [returnedFilter, setReturnedFilter] = useState({
    type: "all",
    range: "all",
  });
  const [returnedUser, setReturnedUser] = useState("all");

  useEffect(() => {
    async function loadStats() {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, ...basePath, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userRole = userSnap.exists() ? userSnap.data().role : null;
        setRole(userRole);

        const caRef = collection(db, ...basePath, "currentAffairs");
        const notesRef = collection(db, ...basePath, "master_notes");
        const quizRef = collection(db, ...basePath, "Quizzes");
        const usersRef = collection(db, ...basePath, "users");
        const reviewRef = collection(db, ...basePath, "review_queue");

        const safeGet = async (ref, label) => {
          try {
            return await getDocs(ref);
          } catch (e) {
            setErrors((prev) => [
              ...prev,
              `${label}: ${e?.message || "Permission error"}`,
            ]);
            return null;
          }
        };

        const canAdminRead =
          userRole === "admin" || userRole === "super_admin";

        const safeCount = async (ref, label) => {
          try {
            const snap = await getCountFromServer(ref);
            return snap.data().count || 0;
          } catch (e) {
            setErrors((prev) => [
              ...prev,
              `${label}: ${e?.message || "Permission error"}`,
            ]);
            return 0;
          }
        };

        const [
          caTotal,
          caDraft,
          caReview,
          caPublished,
          notesTotal,
          notesDraft,
          notesPublished,
          quizTotal,
          quizDraft,
          quizPublished,
          quizRejected,
          usersTotal,
          usersActive,
          reviewSnap,
          recentCA,
          recentNotes,
          recentQuizzes,
          activitySnap,
          dailyDraft,
          dailyPublished,
          dailyRejected,
          monthlyDraft,
          monthlyPublished,
          monthlyRejected,
          returnedSnap,
          usersSnap,
        ] =
          await Promise.all([
            safeCount(caRef, "Current Affairs"),
            safeCount(query(caRef, where("status", "==", "draft")), "CA Draft"),
            safeCount(query(caRef, where("status", "==", "review")), "CA Review"),
            safeCount(query(caRef, where("status", "==", "published")), "CA Published"),
            safeCount(notesRef, "Notes"),
            safeCount(query(notesRef, where("status", "==", "draft")), "Notes Draft"),
            safeCount(query(notesRef, where("status", "==", "published")), "Notes Published"),
            safeCount(quizRef, "Quizzes"),
            safeCount(query(quizRef, where("status", "==", "draft")), "Quiz Draft"),
            safeCount(query(quizRef, where("status", "==", "published")), "Quiz Published"),
            safeCount(query(quizRef, where("status", "==", "rejected")), "Quiz Rejected"),
            canAdminRead ? safeCount(usersRef, "Users") : 0,
            canAdminRead ? safeCount(query(usersRef, where("status", "==", "active")), "Active Users") : 0,
            canAdminRead ? safeGet(query(reviewRef, where("status", "==", "pending")), "Review Queue") : null,
            canAdminRead ? safeGet(query(caRef, orderBy("updatedAt", "desc"), limit(5)), "Recent CA") : null,
            canAdminRead ? safeGet(query(notesRef, orderBy("updatedAt", "desc"), limit(5)), "Recent Notes") : null,
            canAdminRead ? safeGet(query(quizRef, orderBy("updatedAt", "desc"), limit(5)), "Recent Quizzes") : null,
            canAdminRead ? safeGet(query(collection(db, ...basePath, "admin_activity"), orderBy("createdAt", "desc"), limit(10)), "Admin Activity") : null,
            safeCount(query(caRef, where("type", "==", "daily"), where("status", "==", "draft")), "Daily Draft"),
            safeCount(query(caRef, where("type", "==", "daily"), where("status", "==", "published")), "Daily Published"),
            safeCount(query(caRef, where("type", "==", "daily"), where("status", "==", "rejected")), "Daily Rejected"),
            safeCount(query(caRef, where("type", "==", "monthly"), where("status", "==", "draft")), "Monthly Draft"),
            safeCount(query(caRef, where("type", "==", "monthly"), where("status", "==", "published")), "Monthly Published"),
            safeCount(query(caRef, where("type", "==", "monthly"), where("status", "==", "rejected")), "Monthly Rejected"),
            canAdminRead ? safeGet(query(reviewRef, where("status", "==", "rejected"), limit(50)), "Returned Items") : null,
            canAdminRead ? safeGet(usersRef, "Users List") : null,
          ]);

        const review = reviewSnap ? reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];

        const recent = [
          ...(recentCA?.docs || []).map((d) => ({
            id: d.id,
            type: d.data().type || "daily",
            title: d.data().title || d.id,
            updatedAt: d.data().updatedAt?.toDate?.() || null,
            updatedByEmail: d.data().updatedBy?.email || "",
          })),
          ...(recentNotes?.docs || []).map((d) => ({
            id: d.id,
            type: "notes",
            title: d.data().title || d.id,
            updatedAt: d.data().updatedAt?.toDate?.() || null,
            updatedByEmail: d.data().updatedBy?.email || "",
          })),
          ...(recentQuizzes?.docs || []).map((d) => ({
            id: d.id,
            type: "quiz",
            title: d.data().title || d.id,
            updatedAt: d.data().updatedAt?.toDate?.() || null,
            updatedByEmail: d.data().updatedBy?.email || "",
          })),
        ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        setRecentItems(recent.slice(0, 8));

        setStats({
          caTotal,
          caDraft,
          caReview,
          caPublished,
          notesTotal,
          notesDraft,
          notesPublished,
          quizTotal,
          quizDraft,
          quizPublished,
          quizRejected,
          usersTotal,
          usersActive,
          reviewPending: review.length,
          reviewItems: review,
          dailyDraft,
          dailyPublished,
          dailyRejected,
          monthlyDraft,
          monthlyPublished,
          monthlyRejected,
        });

        const activityList = activitySnap ? activitySnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
        setActivity(activityList);

        const returnedList = returnedSnap
          ? returnedSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          : [];
        returnedList.sort((a, b) => {
          const aTime = a.reviewedAt?.toDate?.() || a.updatedAt?.toDate?.() || 0;
          const bTime = b.reviewedAt?.toDate?.() || b.updatedAt?.toDate?.() || 0;
          return bTime - aTime;
        });
        setReturnedItems(returnedList);

        if (usersSnap && (userRole === "admin" || userRole === "super_admin")) {
          const list = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setActivityUsers(
            list
              .filter((u) => (userRole === "admin" ? u.role !== "super_admin" : true))
              .map((u) => u.displayName || u.email || u.id)
          );
          const counts = await Promise.all(
            list.map(async (u) => {
              const [drafts, published, pending, returned] = await Promise.all([
                safeCount(query(caRef, where("createdBy.uid", "==", u.id), where("status", "==", "draft")), "User Drafts"),
                safeCount(query(caRef, where("createdBy.uid", "==", u.id), where("status", "==", "published")), "User Published"),
                safeCount(query(reviewRef, where("createdBy.uid", "==", u.id), where("status", "==", "pending")), "User Pending"),
                safeCount(query(reviewRef, where("createdBy.uid", "==", u.id), where("status", "==", "rejected")), "User Returned"),
              ]);
              return {
                id: u.id,
                name: u.displayName || u.email || u.id,
                role: u.role,
                drafts,
                published,
                pending,
                returned,
              };
            })
          );

          setUserStats(counts.filter((u) => (userRole === "admin" ? u.role !== "super_admin" : true)));
        }

        if (userRole === "editor") {
          const reviewRefLocal = collection(db, ...basePath, "review_queue");
          const [editorDrafts, editorPublished, editorRejected, editorPending] =
            await Promise.all([
              safeCount(query(caRef, where("createdBy.uid", "==", user.uid), where("status", "==", "draft")), "Editor Drafts"),
              safeCount(query(caRef, where("createdBy.uid", "==", user.uid), where("status", "==", "published")), "Editor Published"),
              safeCount(query(caRef, where("createdBy.uid", "==", user.uid), where("status", "==", "rejected")), "Editor Rejected"),
              safeCount(query(reviewRefLocal, where("createdBy.uid", "==", user.uid), where("status", "==", "pending")), "Editor Pending"),
            ]);

          setEditorStats({
            drafts: editorDrafts,
            published: editorPublished,
            rejected: editorRejected,
            pending: editorPending,
          });
        }
      } catch (err) {
        console.error("Dashboard stats error:", err);
      }
    }

    loadStats();
  }, []);

  if (!stats) {
    return <p style={{ padding: 20 }}>Loading dashboard data…</p>;
  }

  async function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const caRef = collection(db, ...basePath, "currentAffairs");
      const notesRef = collection(db, ...basePath, "master_notes");

      const [caSnap, notesSnap] = await Promise.all([
        getDocs(query(caRef, orderBy("updatedAt", "desc"), limit(200))),
        getDocs(query(notesRef, orderBy("updatedAt", "desc"), limit(200))),
      ]);

      const all = [
        ...caSnap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || d.id,
          slug: d.data().slug || d.id,
          type: d.data().type || "daily",
        })),
        ...notesSnap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || d.id,
          slug: d.data().slug || d.id,
          type: "notes",
        })),
      ];

      setSearchResults(
        all.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.slug.toLowerCase().includes(q)
        )
      );
    } finally {
      setSearchLoading(false);
    }
  }

  const filteredReviews = stats.reviewItems?.filter((item) => {
    if (reviewFilter.type !== "all" && item.type !== reviewFilter.type) return false;
    if (reviewFilter.editor !== "all") {
      const name = item.createdBy?.displayName || item.createdBy?.email || "";
      if (name !== reviewFilter.editor) return false;
    }
    if (reviewFilter.range === "all") return true;
    const ts = item.submittedAt?.toDate?.() || item.createdAt?.toDate?.() || null;
    if (!ts) return false;
    const now = new Date();
    const days = reviewFilter.range === "7d" ? 7 : 30;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return ts >= cutoff;
  });

  const filteredReturned = returnedItems
    .filter((item) =>
      role === "editor"
        ? item.createdBy?.uid === auth.currentUser?.uid
        : true
    )
    .filter((item) =>
      returnedUser === "all"
        ? true
        : (item.createdBy?.displayName || item.createdBy?.email || "Unknown") === returnedUser
    )
    .filter((item) => (returnedFilter.type === "all" ? true : item.type === returnedFilter.type))
    .filter((item) => {
      if (returnedFilter.range === "all") return true;
      const ts = item.reviewedAt?.toDate?.() || item.updatedAt?.toDate?.() || null;
      if (!ts) return false;
      const now = new Date();
      const days = returnedFilter.range === "7d" ? 7 : 30;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      return ts >= cutoff;
    });

  function getUserColor(value) {
    const colors = ["#1d4ed8", "#0f766e", "#a21caf", "#b45309", "#15803d", "#be123c"];
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % colors.length;
    }
    return colors[hash];
  }

  return (
    <div>
      <h1>Dashboard</h1>

      {(role === "admin" || role === "super_admin") && stats.reviewPending > 0 && (
        <div style={ui.alert}>You have {stats.reviewPending} item(s) waiting for review.</div>
      )}

      {errors.length > 0 && role !== "editor" && (
        <div style={ui.errorBox}>
          <b>Permissions</b>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={ui.statsTableWrap}>
        <table style={ui.statsTable}>
          <thead>
            <tr>
              <th style={ui.statsTh}>Type</th>
              <th style={ui.statsTh}>Draft</th>
              <th style={ui.statsTh}>Published</th>
              <th style={ui.statsTh}>Returned</th>
              <th style={ui.statsTh}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={ui.rowDaily}>
              <td style={ui.statsTd}>Daily CA</td>
              <td style={ui.statsTd}>{stats.dailyDraft}</td>
              <td style={ui.statsTd}>{stats.dailyPublished}</td>
              <td style={ui.statsTd}>{stats.dailyRejected}</td>
              <td style={ui.statsTd}>{stats.dailyDraft + stats.dailyPublished + stats.dailyRejected}</td>
            </tr>
            <tr style={ui.rowMonthly}>
              <td style={ui.statsTd}>Monthly CA</td>
              <td style={ui.statsTd}>{stats.monthlyDraft}</td>
              <td style={ui.statsTd}>{stats.monthlyPublished}</td>
              <td style={ui.statsTd}>{stats.monthlyRejected}</td>
              <td style={ui.statsTd}>{stats.monthlyDraft + stats.monthlyPublished + stats.monthlyRejected}</td>
            </tr>
            <tr style={ui.rowNotes}>
              <td style={ui.statsTd}>Notes</td>
              <td style={ui.statsTd}>{stats.notesDraft}</td>
              <td style={ui.statsTd}>{stats.notesPublished}</td>
              <td style={ui.statsTd}>—</td>
              <td style={ui.statsTd}>{stats.notesTotal}</td>
            </tr>
            <tr style={ui.rowQuizzes}>
              <td style={ui.statsTd}>Quizzes</td>
              <td style={ui.statsTd}>{stats.quizDraft}</td>
              <td style={ui.statsTd}>{stats.quizPublished}</td>
              <td style={ui.statsTd}>{stats.quizRejected}</td>
              <td style={ui.statsTd}>{stats.quizTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {(role === "admin" || role === "super_admin" || role === "editor") && (
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin/current-affairs/daily/create" style={ui.quickBtn}>+ Create Daily CA</a>
          <a href="/admin/current-affairs/monthly/create" style={ui.quickBtn}>+ Create Monthly CA</a>
          <a href="/admin/notes/create" style={ui.quickBtn}>+ Create Notes</a>
          <a href="/admin/quizzes/create" style={ui.quickBtn}>+ Create Quizzes</a>
        </div>
      )}

      {(role === "admin" || role === "super_admin") && (
        <div style={ui.searchCard}>
          <div style={ui.searchHeader}>Global Search</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={ui.searchInput}
              placeholder="Search by title or slug…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button style={ui.searchBtn} onClick={handleSearch}>
              {searchLoading ? "Searching…" : "Search"}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {searchResults.slice(0, 20).map((r) => {
                const href = r.type === "notes" ? `/admin/notes/${r.id}` : `/admin/current-affairs/${r.type}/${r.id}`;
                return (
                  <div key={`${r.type}-${r.id}`} style={ui.searchItem}>
                    <a href={href} style={ui.searchLink}>
                      <b>{r.title}</b>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {r.type} • {r.slug}
                      </span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {role === "editor" && editorStats && (
        <div style={ui.editorNotice}>
          <b>Your Work Summary</b>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
            <span>Drafts: {editorStats.drafts}</span>
            <span>Submitted: {editorStats.pending}</span>
            <span>Published: {editorStats.published}</span>
            <span>Returned: {editorStats.rejected}</span>
          </div>
        </div>
      )}

      {(role === "admin" || role === "super_admin") && userStats.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Editor Performance</h3>
          <div style={ui.statsTableWrap}>
            <table style={ui.statsTable}>
              <thead>
                <tr>
                  <th style={ui.statsTh}>User</th>
                  <th style={ui.statsTh}>Role</th>
                  <th style={ui.statsTh}>Drafts</th>
                  <th style={ui.statsTh}>Published</th>
                  <th style={ui.statsTh}>Submitted</th>
                  <th style={ui.statsTh}>Returned</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u) => (
                  <tr key={u.id}>
                    <td style={ui.statsTd}>{u.name}</td>
                    <td style={ui.statsTd}>{u.role}</td>
                    <td style={ui.statsTd}>{u.drafts}</td>
                    <td style={ui.statsTd}>{u.published}</td>
                    <td style={ui.statsTd}>{u.pending}</td>
                    <td style={ui.statsTd}>{u.returned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(role === "admin" || role === "super_admin") && recentItems.length > 0 && (
        <div style={{ marginTop: 24 }} />
      )}

      {(role === "admin" || role === "super_admin") && activity.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Recent Activity</h3>
          <div style={{ marginTop: 8 }}>
            <select
              style={ui.filterSelect}
              value={activityUser}
              onChange={(e) => setActivityUser(e.target.value)}
            >
              <option value="all">All Users</option>
              {activityUsers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div style={ui.activityGrid}>
            {activity
              .filter((a) => (role === "admin" ? a.user?.role !== "super_admin" : true))
              .filter((a) =>
                activityUser === "all"
                  ? true
                  : (a.user?.displayName || a.user?.email || "Unknown") === activityUser
              )
              .map((a) => (
                <div key={a.id} style={ui.recentItemSplit}>
                  <div>
                    <b>{a.title || a.docId}</b>
                    <span style={ui.recentMeta}>
                      {a.action} • {a.type}
                    </span>
                  </div>
                  <div style={ui.recentRight}>
                    <span style={ui.recentMeta}>
                      {a.createdAt?.toDate?.().toLocaleString?.() || "—"}
                    </span>
                    <span
                      style={{
                        ...ui.recentMetaStrong,
                        color: getUserColor(a.user?.email || "Unknown"),
                      }}
                    >
                      {a.user?.email || "Unknown"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}



      {(role === "admin" || role === "super_admin") && filteredReviews?.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Review Queue</h3>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <select
              style={ui.filterSelect}
              value={reviewFilter.type}
              onChange={(e) => setReviewFilter((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="notes">Notes</option>
            </select>
            <select
              style={ui.filterSelect}
              value={reviewFilter.editor}
              onChange={(e) => setReviewFilter((s) => ({ ...s, editor: e.target.value }))}
            >
              <option value="all">All Editors</option>
              {[...new Set(stats.reviewItems.map((i) => i.createdBy?.displayName || i.createdBy?.email || "Unknown"))].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              style={ui.filterSelect}
              value={reviewFilter.range}
              onChange={(e) => setReviewFilter((s) => ({ ...s, range: e.target.value }))}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div style={{ marginTop: 10 }}>
            {filteredReviews.map((item) => {
              const href = item.type === "notes" ? `/admin/notes/${item.docId}` : `/admin/current-affairs/${item.type}/${item.docId}`;
              return (
                <div
                  key={item.id}
                  style={{
                    padding: 10,
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    marginBottom: 8,
                    background: "#fff",
                  }}
                >
                  <b>{item.title || item.docId}</b>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {item.type} • {item.status} • {item.createdBy?.displayName || item.createdBy?.email || "Unknown"}
                  </div>
                  <a href={href} style={ui.openBtn}>Open item</a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredReturned.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Returned With Feedback</h3>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {(role === "admin" || role === "super_admin") && (
              <select
                style={ui.filterSelect}
                value={returnedUser}
                onChange={(e) => setReturnedUser(e.target.value)}
              >
                <option value="all">All Users</option>
                {[
                  ...new Set(
                    returnedItems
                      .filter((i) =>
                        role === "admin" ? i.createdBy?.role !== "super_admin" : true
                      )
                      .map((i) => i.createdBy?.displayName || i.createdBy?.email || "Unknown")
                  ),
                ].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <select
              style={ui.filterSelect}
              value={returnedFilter.type}
              onChange={(e) => setReturnedFilter((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="notes">Notes</option>
            </select>
            <select
              style={ui.filterSelect}
              value={returnedFilter.range}
              onChange={(e) => setReturnedFilter((s) => ({ ...s, range: e.target.value }))}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            {filteredReturned.map((item) => (
              <div key={item.id} style={ui.recentItemSplit}>
                <div>
                  <b>{item.title || item.docId}</b>
                  <span style={ui.recentMeta}>
                    {item.type} • {item.feedback || "No feedback"}
                  </span>
                </div>
                <div style={ui.recentRight}>
                  <span style={ui.recentMeta}>
                    {item.reviewedAt?.toDate?.().toLocaleString?.() || "—"}
                  </span>
                  <span
                    style={{
                      ...ui.recentMetaStrong,
                      color: getUserColor(
                        item.createdBy?.email || "Unknown"
                      ),
                    }}
                  >
                    {item.createdBy?.email || "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ui = {
  alert: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "#fff7ed",
    border: "1px solid #fdba74",
    color: "#9a3412",
    fontSize: 13,
    fontWeight: 600,
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 6,
    fontSize: 13,
  },
  statsTableWrap: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
  statsTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  statsTh: {
    textAlign: "left",
    fontSize: 12,
    padding: "10px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
  },
  statsTd: {
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
  },
  rowDaily: { background: "#eff6ff" },
  rowMonthly: { background: "#f0fdf4" },
  rowNotes: { background: "#fff7ed" },
  rowQuizzes: { background: "#f5f3ff" },
  quickBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontWeight: 600,
    textDecoration: "none",
  },
  editorNotice: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #fde68a",
    background: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
  },
  searchCard: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
  searchHeader: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  searchBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  searchItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 6px",
    borderBottom: "1px solid #f3f4f6",
  },
  searchLink: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    textDecoration: "none",
    color: "inherit",
  },
  recentItem: {
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 8,
    background: "#fff",
  },
  recentItemSplit: {
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 8,
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  recentRight: {
    textAlign: "right",
    minWidth: 180,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  recentMeta: {
    display: "block",
    fontSize: 12,
    color: "#6b7280",
  },
  recentMetaStrong: {
    display: "block",
    fontSize: 12,
    color: "#374151",
    fontWeight: 600,
  },
  filterSelect: {
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
  },
  openBtn: {
    display: "inline-block",
    marginTop: 6,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    textDecoration: "none",
    fontSize: 12,
    color: "#1e3a8a",
    background: "#eff6ff",
  },
  activityGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
};
