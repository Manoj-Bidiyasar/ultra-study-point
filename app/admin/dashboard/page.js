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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllReturned, setShowAllReturned] = useState(false);
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
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        setErrors([]);
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, ...basePath, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userRole = userSnap.exists() ? userSnap.data().role : null;
        setRole(userRole);

        const caRef = collection(db, ...basePath, "currentAffairs");
        const notesRef = collection(db, ...basePath, "master_notes");
        const quizRef = collection(db, ...basePath, "Quizzes");
        const pyqRef = collection(db, ...basePath, "PYQs");
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
          pyqTotal,
          pyqDraft,
          pyqPublished,
          pyqRejected,
          usersTotal,
          usersActive,
          reviewSnap,
          statusReviewItems,
          statusReviewCount,
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
            safeCount(pyqRef, "PYQs"),
            safeCount(query(pyqRef, where("status", "==", "draft")), "PYQ Draft"),
            safeCount(query(pyqRef, where("status", "==", "published")), "PYQ Published"),
            safeCount(query(pyqRef, where("status", "==", "rejected")), "PYQ Rejected"),
            canAdminRead ? safeCount(usersRef, "Users") : 0,
            canAdminRead ? safeCount(query(usersRef, where("status", "==", "active")), "Active Users") : 0,
            canAdminRead ? safeGet(query(reviewRef, where("status", "==", "pending")), "Review Queue") : null,
            canAdminRead
              ? Promise.all([
                  safeGet(query(caRef, where("status", "==", "review"), limit(30)), "CA Review Items"),
                  safeGet(query(notesRef, where("status", "==", "review"), limit(30)), "Notes Review Items"),
                  safeGet(query(quizRef, where("status", "==", "review"), limit(30)), "Quiz Review Items"),
                  safeGet(query(pyqRef, where("status", "==", "review"), limit(30)), "PYQ Review Items"),
                ]).then((parts) => parts)
              : [],
            canAdminRead
              ? Promise.all([
                  safeCount(query(caRef, where("status", "==", "review")), "CA Review Count"),
                  safeCount(query(notesRef, where("status", "==", "review")), "Notes Review Count"),
                  safeCount(query(quizRef, where("status", "==", "review")), "Quiz Review Count"),
                  safeCount(query(pyqRef, where("status", "==", "review")), "PYQ Review Count"),
                ]).then((counts) => counts.reduce((sum, n) => sum + n, 0))
              : 0,
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
            canAdminRead
              ? safeGet(query(reviewRef, where("status", "==", "rejected"), limit(50)), "Returned Items")
              : userRole === "editor"
              ? safeGet(
                  query(
                    reviewRef,
                    where("status", "==", "rejected"),
                    where("createdBy.uid", "==", user.uid),
                    limit(50)
                  ),
                  "Editor Returned Items"
                )
              : null,
            canAdminRead ? safeGet(usersRef, "Users List") : null,
          ]);

        const review = reviewSnap ? reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
        const statusReviewList = Array.isArray(statusReviewItems)
          ? [
              ...((statusReviewItems[0]?.docs || []).map((d) => ({ id: `ca-${d.id}`, docId: d.id, type: d.data().type || "daily", title: d.data().title || d.id, slug: d.data().slug || "", status: "pending", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null, editorMessage: d.data()?.review?.editorMessage || "" }))),
              ...((statusReviewItems[1]?.docs || []).map((d) => ({ id: `notes-${d.id}`, docId: d.id, type: "notes", title: d.data().title || d.id, slug: d.data().slug || "", status: "pending", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null, editorMessage: d.data()?.review?.editorMessage || "" }))),
              ...((statusReviewItems[2]?.docs || []).map((d) => ({ id: `quiz-${d.id}`, docId: d.id, type: "quiz", title: d.data().title || d.id, slug: d.data().slug || "", status: "pending", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null, editorMessage: d.data()?.review?.editorMessage || "" }))),
              ...((statusReviewItems[3]?.docs || []).map((d) => ({ id: `pyq-${d.id}`, docId: d.id, type: "pyq", title: d.data().title || d.id, slug: d.data().slug || "", status: "pending", createdBy: d.data().createdBy || {}, submittedAt: d.data().submittedAt || d.data().updatedAt || null, editorMessage: d.data()?.review?.editorMessage || "" }))),
            ]
          : [];
        const effectiveReviewItems = review.length > 0 ? review : statusReviewList;
        const effectiveReviewPending = review.length > 0 ? review.length : (statusReviewCount || 0);

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
          pyqTotal,
          pyqDraft,
          pyqPublished,
          pyqRejected,
          usersTotal,
          usersActive,
          reviewPending: effectiveReviewPending,
          reviewItems: effectiveReviewItems,
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

          // Fallback for editors: if review_queue rejected items are unavailable,
          // read rejected feedback state from their own content docs.
          if (returnedList.length === 0) {
            const [editorCA, editorNotes, editorQuiz, editorPyq] = await Promise.all([
              safeGet(query(caRef, where("createdBy.uid", "==", user.uid), limit(120)), "Editor CA Items"),
              safeGet(query(notesRef, where("createdBy.uid", "==", user.uid), limit(120)), "Editor Notes Items"),
              safeGet(query(quizRef, where("createdBy.uid", "==", user.uid), limit(120)), "Editor Quiz Items"),
              safeGet(query(pyqRef, where("createdBy.uid", "==", user.uid), limit(120)), "Editor PYQ Items"),
            ]);

            const fallbackReturned = [
              ...((editorCA?.docs || [])
                .filter((d) => d.data()?.review?.status === "rejected")
                .map((d) => ({
                  id: `ca-${d.id}`,
                  docId: d.id,
                  type: d.data()?.type || "daily",
                  title: d.data()?.title || d.id,
                  slug: d.data()?.slug || "",
                  feedback: d.data()?.review?.feedback || "",
                  reviewedAt: d.data()?.review?.reviewedAt || d.data()?.updatedAt || null,
                  reviewedBy: d.data()?.review?.reviewedBy || null,
                  reviewedByEmail: d.data()?.review?.reviewedByEmail || "",
                  createdBy: d.data()?.createdBy || {},
                }))),
              ...((editorNotes?.docs || [])
                .filter((d) => d.data()?.review?.status === "rejected")
                .map((d) => ({
                  id: `notes-${d.id}`,
                  docId: d.id,
                  type: "notes",
                  title: d.data()?.title || d.id,
                  slug: d.data()?.slug || "",
                  feedback: d.data()?.review?.feedback || "",
                  reviewedAt: d.data()?.review?.reviewedAt || d.data()?.updatedAt || null,
                  reviewedBy: d.data()?.review?.reviewedBy || null,
                  reviewedByEmail: d.data()?.review?.reviewedByEmail || "",
                  createdBy: d.data()?.createdBy || {},
                }))),
              ...((editorQuiz?.docs || [])
                .filter((d) => d.data()?.review?.status === "rejected")
                .map((d) => ({
                  id: `quiz-${d.id}`,
                  docId: d.id,
                  type: "quiz",
                  title: d.data()?.title || d.id,
                  slug: d.data()?.slug || "",
                  feedback: d.data()?.review?.feedback || "",
                  reviewedAt: d.data()?.review?.reviewedAt || d.data()?.updatedAt || null,
                  reviewedBy: d.data()?.review?.reviewedBy || null,
                  reviewedByEmail: d.data()?.review?.reviewedByEmail || "",
                  createdBy: d.data()?.createdBy || {},
                }))),
              ...((editorPyq?.docs || [])
                .filter((d) => d.data()?.review?.status === "rejected")
                .map((d) => ({
                  id: `pyq-${d.id}`,
                  docId: d.id,
                  type: "pyq",
                  title: d.data()?.title || d.id,
                  slug: d.data()?.slug || "",
                  feedback: d.data()?.review?.feedback || "",
                  reviewedAt: d.data()?.review?.reviewedAt || d.data()?.updatedAt || null,
                  reviewedBy: d.data()?.review?.reviewedBy || null,
                  reviewedByEmail: d.data()?.review?.reviewedByEmail || "",
                  createdBy: d.data()?.createdBy || {},
                }))),
            ];

            if (fallbackReturned.length > 0) {
              fallbackReturned.sort((a, b) => {
                const aTime = a.reviewedAt?.toDate?.() || 0;
                const bTime = b.reviewedAt?.toDate?.() || 0;
                return bTime - aTime;
              });
              setReturnedItems(fallbackReturned);
            }
          }
        }
      } catch (err) {
        console.error("Dashboard stats error:", err);
      }
    }

    loadStats();
  }, [refreshTick]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
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
      const pyqRef = collection(db, ...basePath, "PYQs");

      const [caSnap, notesSnap, pyqSnap] = await Promise.all([
        getDocs(query(caRef, orderBy("updatedAt", "desc"), limit(200))),
        getDocs(query(notesRef, orderBy("updatedAt", "desc"), limit(200))),
        getDocs(query(pyqRef, orderBy("updatedAt", "desc"), limit(200))),
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
        ...pyqSnap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || d.id,
          slug: d.data().slug || d.id,
          type: "pyq",
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
  const visibleReviews = showAllReviews
    ? filteredReviews
    : (filteredReviews || []).slice(0, 3);

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
  const visibleReturned = showAllReturned
    ? filteredReturned
    : (filteredReturned || []).slice(0, 3);

  function getUserColor(value) {
    const colors = ["#1d4ed8", "#0f766e", "#a21caf", "#b45309", "#15803d", "#be123c"];
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) % colors.length;
    }
    return colors[hash];
  }

  function getEditorRowStyle(index) {
    const palette = [ui.rowDaily, ui.rowMonthly, ui.rowNotes, ui.rowQuizzes, ui.rowPyqs];
    return palette[index % palette.length];
  }

  function getAdminEditHref(item) {
    if (item.type === "notes") return `/admin/notes/${item.docId}`;
    if (item.type === "quiz") return `/admin/quizzes/${item.docId}`;
    if (item.type === "pyq") return `/admin/pyqs/${item.docId}`;
    return `/admin/current-affairs/${item.type}/${item.docId}`;
  }

  function renderReviewQueueSection() {
    if (!(role === "admin" || role === "super_admin") || !filteredReviews?.length) {
      return null;
    }
    return (
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Review Queue</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {stats.reviewPending > 0 && (
              <div style={ui.alertInline}>
                {stats.reviewPending} item(s) pending for review
              </div>
            )}
            {(filteredReviews?.length || 0) > 3 && (
              <button
                type="button"
                style={ui.inlineBtn}
                onClick={() => setShowAllReviews((v) => !v)}
              >
                {showAllReviews ? "Show less" : `View all (${filteredReviews.length})`}
              </button>
            )}
          </div>
        </div>
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
            <option value="quiz">Quiz</option>
            <option value="pyq">PYQ</option>
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
          {visibleReviews.map((item) => {
            const href =
              item.type === "notes"
                ? `/admin/notes/${item.docId}`
                : item.type === "quiz"
                ? `/admin/quizzes/${item.docId}`
                : item.type === "pyq"
                ? `/admin/pyqs/${item.docId}`
                : `/admin/current-affairs/${item.type}/${item.docId}`;
            return (
              <div
                key={item.id}
                style={{
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  marginBottom: 8,
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>
                    {item.title || item.docId} ({item.slug || "-"})
                  </b>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Type: {String(item.type || "content").toUpperCase()} | Editor:{" "}
                    {item.createdBy?.displayName || "Unknown"}(
                    {item.createdBy?.email || "no-email"}) | Submitted:{" "}
                    {item.submittedAt?.toDate?.()?.toLocaleString?.() || "-"}
                  </div>
                  {String(item.editorMessage || item.message || "").trim() && (
                    <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                      Message: {item.editorMessage || item.message}
                    </div>
                  )}
                </div>
                <a href={href} style={ui.openBtn}>Open item</a>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderReturnedSection() {
    if (!filteredReturned.length) return null;
    return (
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Returned With Feedback</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={ui.returnedInline}>
              {filteredReturned.length} item(s) returned
            </div>
            {(filteredReturned?.length || 0) > 3 && (
              <button
                type="button"
                style={ui.inlineBtn}
                onClick={() => setShowAllReturned((v) => !v)}
              >
                {showAllReturned ? "Show less" : `View all (${filteredReturned.length})`}
              </button>
            )}
          </div>
        </div>
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
          {visibleReturned.map((item) => {
            const reviewedAtText =
              item.reviewedAt?.toDate?.().toLocaleString?.() ||
              item.updatedAt?.toDate?.().toLocaleString?.() ||
              "—";
            const reviewerText =
              item.reviewedBy?.displayName ||
              item.reviewedBy?.email ||
              item.reviewedByEmail ||
              "Admin";
            return (
              <div key={item.id} style={ui.returnedItemSplit}>
                <div>
                  <b>{item.title || item.docId} ({item.slug || "-"})</b>
                  <span style={ui.recentMeta}>
                    Message: {item.feedback || "No feedback"}
                  </span>
                  <span style={ui.recentMeta}>
                    Type: {String(item.type || "content").toUpperCase()} • Reviewed by: {reviewerText} • Time: {reviewedAtText}
                  </span>
                </div>
                <div style={ui.recentRightCentered}>
                  {role !== "editor" && (
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
                  )}
                  <a href={getAdminEditHref(item)} style={ui.editBtn}>Edit</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>

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

      {renderReviewQueueSection()}
      {renderReturnedSection()}

      <div style={ui.statsTableWrap}>
        <table style={ui.statsTable}>
          <colgroup>
            <col style={{ width: "32%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "17%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={ui.statsThLeft}>Type</th>
              <th style={ui.statsTh}>Draft</th>
              <th style={ui.statsTh}>Published</th>
              <th style={ui.statsTh}>Returned</th>
              <th style={ui.statsTh}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={ui.rowDaily}>
              <td style={ui.statsTdLeft}>Daily CA</td>
              <td style={ui.statsTd}>{stats.dailyDraft}</td>
              <td style={ui.statsTd}>{stats.dailyPublished}</td>
              <td style={ui.statsTd}>{stats.dailyRejected}</td>
              <td style={ui.statsTd}>{stats.dailyDraft + stats.dailyPublished + stats.dailyRejected}</td>
            </tr>
            <tr style={ui.rowMonthly}>
              <td style={ui.statsTdLeft}>Monthly CA</td>
              <td style={ui.statsTd}>{stats.monthlyDraft}</td>
              <td style={ui.statsTd}>{stats.monthlyPublished}</td>
              <td style={ui.statsTd}>{stats.monthlyRejected}</td>
              <td style={ui.statsTd}>{stats.monthlyDraft + stats.monthlyPublished + stats.monthlyRejected}</td>
            </tr>
            <tr style={ui.rowNotes}>
              <td style={ui.statsTdLeft}>Notes</td>
              <td style={ui.statsTd}>{stats.notesDraft}</td>
              <td style={ui.statsTd}>{stats.notesPublished}</td>
              <td style={ui.statsTd}>—</td>
              <td style={ui.statsTd}>{stats.notesTotal}</td>
            </tr>
            <tr style={ui.rowQuizzes}>
              <td style={ui.statsTdLeft}>Quizzes</td>
              <td style={ui.statsTd}>{stats.quizDraft}</td>
              <td style={ui.statsTd}>{stats.quizPublished}</td>
              <td style={ui.statsTd}>{stats.quizRejected}</td>
              <td style={ui.statsTd}>{stats.quizTotal}</td>
            </tr>
            <tr style={ui.rowPyqs}>
              <td style={ui.statsTdLeft}>PYQs</td>
              <td style={ui.statsTd}>{stats.pyqDraft}</td>
              <td style={ui.statsTd}>{stats.pyqPublished}</td>
              <td style={ui.statsTd}>{stats.pyqRejected}</td>
              <td style={ui.statsTd}>{stats.pyqTotal}</td>
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
          <a href="/admin/pyqs/create" style={ui.quickBtn}>+ Create PYQs</a>
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
                const href =
                  r.type === "notes"
                    ? `/admin/notes/${r.id}`
                    : r.type === "pyq"
                    ? `/admin/pyqs/${r.id}`
                    : `/admin/current-affairs/${r.type}/${r.id}`;
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
              <colgroup>
                <col style={{ width: "26%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={ui.statsThLeft}>User</th>
                  <th style={ui.statsThLeft}>Role</th>
                  <th style={ui.statsTh}>Drafts</th>
                  <th style={ui.statsTh}>Published</th>
                  <th style={ui.statsTh}>Submitted</th>
                  <th style={ui.statsTh}>Returned</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u, index) => (
                  <tr key={u.id} style={getEditorRowStyle(index)}>
                    <td style={ui.statsTdLeft}>{u.name}</td>
                    <td style={ui.statsTdLeft}>{u.role}</td>
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
  alertInline: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#fff7ed",
    border: "1px solid #fdba74",
    color: "#9a3412",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  inlineBtn: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #93c5fd",
    background: "#eff6ff",
    color: "#1e3a8a",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    textAlign: "center",
    fontSize: 12,
    padding: "10px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  statsTd: {
    textAlign: "center",
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  statsThLeft: {
    textAlign: "left",
    fontSize: 12,
    padding: "10px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  statsTdLeft: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  rowDaily: { background: "#eff6ff" },
  rowMonthly: { background: "#f0fdf4" },
  rowNotes: { background: "#fff7ed" },
  rowQuizzes: { background: "#f5f3ff" },
  rowPyqs: { background: "#f0f9ff" },
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
  returnedInline: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "#fff1f2",
    border: "1px solid #fda4af",
    color: "#9f1239",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
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
  returnedItemSplit: {
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 8,
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  recentRight: {
    textAlign: "right",
    minWidth: 180,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  recentRightCentered: {
    textAlign: "center",
    minWidth: 112,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #93c5fd",
    textDecoration: "none",
    fontSize: 12,
    color: "#1e3a8a",
    background: "#eff6ff",
    fontWeight: 700,
  },
  activityGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
};
