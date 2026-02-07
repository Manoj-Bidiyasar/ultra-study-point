"use client";

import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/* ================= FIREBASE ================= */

import { auth, db } from "@/lib/firebase/client";
import { validateEditorSlug } from "@/lib/ca/validation";
import { createPreviewToken } from "@/lib/preview/previewToken";

/* ================= EDITOR CORE ================= */

import EditorLayout from "@/components/content/editor/EditorLayout";

/* ================= ADMIN SECTIONS =================
   Each section UI is inside its own JSX file
   --------------------------------------------------
   BasicInfoSection.jsx
   SeoSection.jsx
   RelatedContentSection.jsx
   WorkflowSection.jsx
=================================================== */

import BasicInfoSection from "@/components/admin/sections/BasicInfoSection";
import SeoSection from "@/components/admin/sections/SeoSection";

import RelatedContentSection from "@/components/admin/sections/RelatedContentSection";
import WorkflowSection from "@/components/admin/sections/WorkflowSection";
import QuizContentEditor from "@/components/admin/sections/QuizContentEditor";
import CollapsibleCard from "@/components/admin/ui/CollapsibleCard";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import StickySidebar from "@/components/admin/ui/StickySidebar";
import {
  buildTitle,
  buildSeoTitle,
  buildCanonicalUrl,
} from "@/lib/content/contentUtils";

const MODULE_BY_TYPE = {
  daily: "current-affairs",
  monthly: "current-affairs",
  notes: "notes",
  quiz: "quiz",
};
/* ======================================================
   BASE CURRENT AFFAIRS EDITOR
   Used for:
   - Daily Current Affairs
   - Monthly Current Affairs
====================================================== */

export default function BaseEditor({
  rawData,
  role,
  type,
  renderTypeSection,
}) {
  const moduleKey = MODULE_BY_TYPE[type] || "current-affairs";
  const isCA = type === "daily" || type === "monthly";

  /* ======================================================
     STATE
  ====================================================== */

  const [state, setState] = useState(() => ({
    id: rawData.id,

    /* ---------- BASIC INFO ---------- */
    title: rawData.title || "",
    slug: rawData.slug || "",
    summary: rawData.summary || rawData.description || "",
    language: rawData.language || "en",
    tags: rawData.tags || [],

    /* ---------- STATUS ---------- */
    status: rawData.status || "draft",
    isLocked: rawData.isLocked ?? false,
    publishedAt: rawData.publishedAt || "",

    /* ---------- CONTENT ---------- */
    content: rawData.content || {
      mode: "points",
      data: [],
    },
/* ---------- TYPE SPECIFIC META ---------- */
dailyMeta: rawData.dailyMeta || {},
monthlyMeta: rawData.monthlyMeta || {},
notesMeta: rawData.notesMeta || {
  categoryId: "",
  categoryName: "",
  subCategoryId: "",
  subCategoryName: "",
  topic: "",
},
quizMeta: {
  durationMinutes: rawData.durationMinutes ?? rawData.quizMeta?.durationMinutes ?? 60,
  rules: rawData.rules ?? rawData.quizMeta?.rules ?? { minAttemptPercent: 90 },
  scoring: rawData.scoring ?? rawData.quizMeta?.scoring ?? {
    defaultPoints: 1,
    negativeMarking: { type: "fraction", value: 1 / 3 },
  },
  sections: rawData.sections ?? rawData.quizMeta?.sections ?? [],
  questions: rawData.questions ?? rawData.quizMeta?.questions ?? [],
},

    /* ---------- SEO ---------- */
    seo: {
      seoTitle: rawData.seo?.seoTitle || "",
      seoDescription: rawData.seo?.seoDescription || "",
      canonicalUrl: rawData.seo?.canonicalUrl || "",
      keywords: rawData.seo?.keywords || "",
      newsKeywords: rawData.seo?.newsKeywords || "",
    },

    /* ---------- RELATED ---------- */
    relatedContent: rawData.relatedContent || [],

    /* ---------- SETTINGS ---------- */
    caDate: rawData.caDate || "",
    pdfUrl: rawData.pdfUrl || "",

    

    /* ---------- WORKFLOW ---------- */
    createdBy: rawData.createdBy || null,
    updatedBy: rawData.updatedBy || null,
    review: rawData.review || null,

    __isNew: rawData.__isNew === true,
  }));

  /* ======================================================
     CURRENT USER PROFILE
  ====================================================== */

  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(Date.now());
  const [submitState, setSubmitState] = useState({
    loading: false,
    error: null,
    success: null,
  });

  useEffect(() => {
    async function loadUser() {
      const user = auth.currentUser;
      if (!user) return;

      const ref = doc(
        db,
        "artifacts",
        "ultra-study-point",
        "public",
        "data",
        "users",
        user.uid
      );

      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();

      setCurrentUserProfile({
        uid: user.uid,
        email: data.email || user.email,
        displayName:
          data.displayName || data.name || user.email,
        role: data.role,
      });
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUserProfile) return;
    setState((s) => {
      const next = { ...s };
      if (!s.createdBy) {
        next.createdBy = currentUserProfile;
      }
      if (!s.updatedBy) {
        next.updatedBy = currentUserProfile;
      }
      return next;
    });
  }, [currentUserProfile]);

  /* ======================================================
     TAG INPUT BUFFER
  ====================================================== */

  const [tagsInput, setTagsInput] = useState(
    (rawData.tags || []).join(", ")
  );

  useEffect(() => {
    setTagsInput((state.tags || []).join(", "));
  }, [state.tags]);

  

/* SEO + TITLE AUTO GENERATION (SINGLE SOURCE) */

useEffect(() => {
  if (!isCA) return;
  if (!state.caDate) return;

  const nextTitle =
    state.title ||
    buildTitle({
      module: moduleKey,
      type,
      date: state.caDate,
    });

  const nextSeoTitle =
    state.seo.seoTitle ||
    buildSeoTitle({
      module: moduleKey,
      type,
      date: state.caDate,
      language: state.language,
    });

  const nextCanonical =
    state.seo.canonicalUrl ||
    buildCanonicalUrl({
      module: moduleKey,
      type,
      slug: state.slug,
    });

  // ✅ prevent unnecessary setState
  if (
    nextTitle === state.title &&
    nextSeoTitle === state.seo.seoTitle &&
    nextCanonical === state.seo.canonicalUrl
  ) {
    return;
  }

  setState((s) => ({
    ...s,
    title: nextTitle,
    seo: {
      ...s.seo,
      seoTitle: nextSeoTitle,
      canonicalUrl: nextCanonical,
    },
  }));
}, [isCA, state.caDate, state.language, state.slug, type]);




  /* ======================================================
     HELPERS
  ====================================================== */
function getCollectionByType(type) {
  if (type === "notes") return "master_notes";
  if (type === "daily") return "currentAffairs";
  if (type === "monthly") return "currentAffairs";

  // future
  if (type === "quiz") return "Quizzes";

  return "currentAffairs";
}

  const normalizedSlug = state.slug.trim().toLowerCase();

  const isLocked =
    role === "admin" || role === "super_admin"
      ? false
      : state.isLocked || (role === "editor" && state.status !== "draft");

 const collectionName = getCollectionByType(type);

const docRef = doc(
  db,
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  collectionName,
  state.id
);

  function safeDate(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function cleanSeo(seo) {
    const out = {};
    if (seo.seoTitle?.trim()) out.seoTitle = seo.seoTitle.trim();
    if (seo.seoDescription?.trim()) out.seoDescription = seo.seoDescription.trim();
    if (seo.canonicalUrl?.trim()) out.canonicalUrl = seo.canonicalUrl.trim();
    if (seo.keywords?.trim()) out.keywords = seo.keywords.trim();
    if (seo.newsKeywords?.trim()) out.newsKeywords = seo.newsKeywords.trim();
    return out;
  }

  async function upsertReviewQueue({
    action,
    feedback,
  }) {
    const reviewRef = collection(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "review_queue"
    );

    const q = query(
      reviewRef,
      where("docId", "==", state.id),
      where("type", "==", type),
      where("status", "==", "pending")
    );

    const snap = await getDocs(q);

    if (action === "submit") {
      if (!snap.empty) return;

      await addDoc(reviewRef, {
        docId: state.id,
        type,
        title: state.title || "",
        status: "pending",
        createdBy: currentUserProfile,
        submittedAt: serverTimestamp(),
      });
      return;
    }

    if (snap.empty) return;

    const reviewDoc = snap.docs[0];
    await updateDoc(reviewDoc.ref, {
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: serverTimestamp(),
      reviewedBy: currentUserProfile,
      feedback: feedback || "",
    });
  }

  /* ======================================================
     AUTO SAVE
  ====================================================== */

  const [autoSaveStatus, setAutoSaveStatus] = useState("Saved ✓");
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [saveErrors, setSaveErrors] = useState([]);

  function validateQuizMeta(quizMeta) {
    const errors = [];
    if (!quizMeta) return errors;
    const optionEEnabled = quizMeta?.rules?.optionEEnabled === true;
    const optionCount = optionEEnabled ? 5 : 4;
    const questions = Array.isArray(quizMeta?.questions)
      ? quizMeta.questions
      : [];

    questions.forEach((q, idx) => {
      const label = `Q${idx + 1}`;
      if (!q?.prompt || !String(q.prompt).trim()) {
        errors.push(`${label}: Missing question text.`);
      }

      if (q?.type === "single" || q?.type === "multiple") {
        const opts = Array.isArray(q.options) ? q.options : [];
        const required = opts.slice(0, optionCount);
        if (required.some((o) => !String(o || "").trim())) {
          errors.push(`${label}: Fill all options.`);
        }
        if (
          optionEEnabled &&
          required.slice(0, optionCount - 1).every((o) => !String(o || "").trim())
        ) {
          errors.push(`${label}: Only "Unattempted" option filled.`);
        }
        if (q.type === "single") {
          const ans = Number(q.answer);
          if (!Number.isInteger(ans) || ans < 0 || ans >= optionCount) {
            errors.push(`${label}: Correct option index is invalid.`);
          }
        }
        if (q.type === "multiple") {
          const arr = Array.isArray(q.answer) ? q.answer : [];
          const bad = arr.some(
            (v) => !Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) >= optionCount
          );
          if (bad) {
            errors.push(`${label}: Correct option indexes are invalid.`);
          }
        }
      }

      if (q?.type === "fill") {
        const answers = Array.isArray(q.answerText)
          ? q.answerText
          : q.answerText
          ? [q.answerText]
          : [];
        if (answers.every((a) => !String(a || "").trim())) {
          errors.push(`${label}: Missing accepted answers.`);
        }
      }
    });

    return errors;
  }

  async function saveToFirestore({ mode = "auto" } = {}) {
  if (!currentUserProfile) return;
  if (isLocked) return;
  if (isSaving) return;

  setIsSaving(true);
  setSaveError(null);

  // ✅ OPTIMISTIC UI
  setAutoSaveStatus("Saved ✓");
  setLastSavedAt(Date.now());

  try {
    if (type === "quiz") {
      const quizErrors = validateQuizMeta(state.quizMeta);
      if (quizErrors.length > 0) {
        setAutoSaveStatus("Save blocked ⚠");
        setSaveError(quizErrors[0]);
        setSaveErrors(quizErrors);
        return;
      }
    }
  const slugError = await validateEditorSlug({
    slug: normalizedSlug,
    type,
    currentId: state.id,
  });

  if (slugError) {
    throw new Error(slugError);
  }

    const userMeta = {
      uid: currentUserProfile.uid,
      email: currentUserProfile.email,
      displayName: currentUserProfile.displayName,
      role: currentUserProfile.role,
    };

    const {
  __isNew,
  ...cleanState
} = state;

  // Auto-save should never publish. Keep scheduled if set, otherwise draft.
  const safeStatus =
    mode === "auto"
      ? state.status === "scheduled"
        ? "scheduled"
        : "draft"
      : state.status;

const payload = {
  id: state.id,

  title: state.title,
  slug: normalizedSlug,
  summary: state.summary,
  language: state.language,
  tags: state.tags,

  content: state.content,

  dailyMeta: isCA ? state.dailyMeta : {},
  monthlyMeta: isCA ? state.monthlyMeta : {},
  notesMeta: type === "notes" ? state.notesMeta : {},
  quizMeta: type === "quiz" ? state.quizMeta : {},

  ...(type === "quiz"
    ? {
        description: state.summary,
        durationMinutes: state.quizMeta?.durationMinutes ?? 0,
        rules: state.quizMeta?.rules || {},
        scoring: state.quizMeta?.scoring || {},
        sections: state.quizMeta?.sections || [],
        questions: state.quizMeta?.questions || [],
      }
    : {}),

  relatedContent: state.relatedContent,

  caDate: isCA ? safeDate(state.caDate) : null,
  pdfUrl: isCA ? state.pdfUrl : "",

  status: safeStatus,
  publishedAt:
    safeStatus === "scheduled"
      ? safeDate(state.publishedAt)
      : null,

  seo: cleanSeo(state.seo),
};



    if (state.__isNew) {
      await setDoc(docRef, {
  ...payload,

  // 🔴 REQUIRED BY RULES
  type,                 // "daily" | "monthly"
  isDeleted: false,
  status: "draft",

  // audit
  createdAt: serverTimestamp(),
  createdBy: userMeta,
});


      setState((s) => ({ ...s, __isNew: false }));
    } else {
      await updateDoc(docRef, payload);
    }

    setAutoSaveStatus("Saved ✓");
    setSaveErrors([]);

    if (mode === "manual") {
      await addDoc(
        collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "admin_activity"
        ),
        {
          action: "save_manual",
          docId: state.id,
          type,
          title: state.title || "",
          user: currentUserProfile,
          createdAt: serverTimestamp(),
        }
      );
    }
  } catch (err) {
    console.error(err);

    setAutoSaveStatus("Save failed ❌");
    setSaveError(err.message || "Save failed");
    setSaveErrors([]);
  } finally {
    setIsSaving(false);
  }
}

  async function submitForReview() {
    if (isLocked) return;
    if (!currentUserProfile) {
      setSubmitState({
        loading: false,
        error: "User profile is still loading. Please try again.",
        success: null,
      });
      return;
    }

    setSubmitState({ loading: true, error: null, success: null });

    try {
      await saveToFirestore({ mode: "manual" });
      await upsertReviewQueue({ action: "submit" });

      await updateDoc(docRef, {
        status: "draft",
        submittedAt: serverTimestamp(),
        updatedBy: currentUserProfile,
        updatedAt: serverTimestamp(),
        isLocked: true,
        review: {
          status: "pending",
          feedback: "",
        },
      });

      setState((s) => ({
        ...s,
        isLocked: true,
        review: {
          status: "pending",
          feedback: "",
        },
      }));

      await addDoc(
        collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "admin_activity"
        ),
        {
          action: "submit_review",
          docId: state.id,
          type,
          title: state.title || "",
          user: currentUserProfile,
          createdAt: serverTimestamp(),
        }
      );

      setSubmitState({
        loading: false,
        error: null,
        success: "Submitted for review.",
      });
    } catch (err) {
      console.error(err);
      setSubmitState({
        loading: false,
        error: err?.message || "Failed to submit for review.",
        success: null,
      });
    }
  }

  async function applyAdminAction(nextStatus) {
    if (!currentUserProfile) return;
    if (role !== "admin" && role !== "super_admin") return;

    try {
      if (nextStatus === "published" && type === "quiz") {
        const snapshot = {
          ...state,
          snapshotAt: serverTimestamp(),
          snapshotBy: currentUserProfile,
        };
        await addDoc(collection(docRef, "versions"), snapshot);
      }
      const update = {
        status: nextStatus,
        updatedBy: currentUserProfile,
        updatedAt: serverTimestamp(),
        isLocked: false,
      };

      if (nextStatus === "published") {
        update.publishedAt = serverTimestamp();
      }
      if (nextStatus === "scheduled") {
        update.publishedAt = state.publishedAt || null;
      }

      await updateDoc(docRef, update);

      if (nextStatus === "published") {
        await upsertReviewQueue({ action: "approve" });
        update.review = {
          status: "approved",
          feedback: state.review?.feedback || "",
          reviewedBy: currentUserProfile,
        };
      }
      if (nextStatus === "draft") {
        await upsertReviewQueue({
          action: "reject",
          feedback: state.review?.feedback || "",
        });
        update.review = {
          status: "rejected",
          feedback: state.review?.feedback || "",
          reviewedBy: currentUserProfile,
        };
      }

      setState((s) => ({
        ...s,
        ...update,
      }));

      await addDoc(
        collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "admin_activity"
        ),
        {
          action: `status_${nextStatus}`,
          docId: state.id,
          type,
          title: state.title || "",
          user: currentUserProfile,
          createdAt: serverTimestamp(),
        }
      );
    } catch (err) {
      console.error(err);
    }
  }


useEffect(() => {
  if (!currentUserProfile) return;
  if (isLocked) return;
  if (state.status !== "draft") return;

  const t = setTimeout(() => saveToFirestore({ mode: "auto" }), 3000);
  return () => clearTimeout(t);
}, [
  currentUserProfile, // ✅ CRITICAL
  state.title,
  state.slug,
  state.summary,
  state.tags,
  state.content,
  state.seo,
  state.caDate,
  state.pdfUrl,
  state.notesMeta,
  state.quizMeta,
  state.status,
  state.publishedAt,
]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveToFirestore({ mode: "manual" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveToFirestore]);

  function formatSince(ts) {
    const diff = Math.max(0, nowTick - ts);
    const s = Math.floor(diff / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }


  /* ======================================================
     UI
  ====================================================== */

  return (
    <div style={ui.page}>

      {/* ================= HEADER ================= */}
      <div style={ui.header}>
        <div>
          <h1 style={ui.title}>{state.title || "Untitled"}</h1>
          <div style={ui.meta}>
            <span><b>ID:</b> {state.id}</span>
            <StatusBadge status={state.status} />
            <span>{autoSaveStatus}</span>
            <span>Last saved {formatSince(lastSavedAt)}</span>
          </div>
          {state.status === "published" && (
            <div style={ui.warn}>
              This document is published. Changes won’t auto‑publish until you
              manually update the status.
            </div>
          )}
          {type === "quiz" && saveErrors.length > 0 && (
            <div style={ui.warn}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Quiz validation errors:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {saveErrors.map((e, i) => (
                  <li key={`${e}-${i}`}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={ui.headerActions}>
          <button
            style={ui.btnPrimary}
            onClick={async () => {
              const url = await createPreviewToken({
                docId: state.id,
                slug: normalizedSlug,
                type,
              });
              const previewWindow = window.open(url, "_blank");

              setInterval(() => {
                if (previewWindow && !previewWindow.closed) {
                  previewWindow.location.reload();
                }
              }, 5000);
            }}
          >
            Preview
          </button>
          <button
            style={ui.btnSecondary}
            onClick={() => saveToFirestore({ mode: "manual" })}
          >
            Save
          </button>
        </div>
      </div>

      {/* ================= LAYOUT ================= */}
      <div style={ui.grid}>

        {/* LEFT COLUMN */}
        <div>

  {/* ================= BASIC INFO ================= */}
  <CollapsibleCard title="Basic Information" defaultOpen>
    <BasicInfoSection
      state={state}
      role={role}
      isLocked={isLocked}
      onChange={setState}
    />
  </CollapsibleCard>

  {/* ================= SEO ================= */}
  <CollapsibleCard title="SEO & Meta">
    <SeoSection
      seo={state.seo}
      tagsInput={tagsInput}
      setTagsInput={setTagsInput}
      isLocked={isLocked}
      onChange={(seo) =>
        setState((s) => ({ ...s, seo }))
      }
      onTagsChange={(tags) =>
        setState((s) => ({ ...s, tags }))
      }
    />
  </CollapsibleCard>

  {/* ================= RELATED ================= */}
  <CollapsibleCard title="Related Content">
    <RelatedContentSection
      value={state.relatedContent}
      pageType={type}
      pageCaDate={state.caDate}
      notesMeta={state.notesMeta}
      onChange={(val) =>
        setState((s) => ({
          ...s,
          relatedContent: val,
        }))
      }
    />
  </CollapsibleCard>

</div>


        {/* RIGHT COLUMN */}
        <div>
          <StickySidebar>

  {/* ================= SETTINGS (OPTIONAL) ================= */}
  {renderTypeSection?.({
    type,
    isLocked,
    meta: {
      daily: state.dailyMeta,
      monthly: state.monthlyMeta,
      notes: state.notesMeta,
      quiz: state.quizMeta,
    },
    onChange: (meta) =>
      setState((s) => ({
        ...s,
        dailyMeta: meta.daily ?? s.dailyMeta,
        monthlyMeta: meta.monthly ?? s.monthlyMeta,
        notesMeta: meta.notes ?? s.notesMeta,
        quizMeta: meta.quiz ?? s.quizMeta,
      })),
  })}

  {/* ================= WORKFLOW ================= */}
  <CollapsibleCard
    title="Workflow"
    right={<StatusBadge status={state.status} />}
    defaultOpen
  >
    <WorkflowSection
      state={state}
      rawData={rawData}
      role={role}
      submitState={submitState}
      onReviewChange={(feedback) =>
        setState((s) => ({
          ...s,
          review: {
            ...s.review,
            feedback,
          },
        }))
      }
      onSubmitForReview={submitForReview}
      onAdminAction={applyAdminAction}
    />
  </CollapsibleCard>

</StickySidebar>

        </div>

        {/* FULL WIDTH CONTENT */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={ui.card}>
            <h3 style={ui.sectionTitle}>
              {type === "quiz" ? "Quiz Content" : "Content"}
            </h3>

            {type === "quiz" ? (
              <QuizContentEditor
                title={state.title}
                description={state.summary}
                value={state.quizMeta}
                isLocked={isLocked}
                role={role}
                docId={state.id}
                onChange={(quizMeta) =>
                  setState((s) => ({ ...s, quizMeta }))
                }
              />
            ) : (
              <EditorLayout
                value={state.content}
                onChange={(content) =>
                  setState((s) => ({ ...s, content }))
                }
                documentValue={state}
                onDocumentChange={setState}
                role={role}
                /* ✅ REAL SAVE FUNCTION */
                onSave={saveToFirestore}
                /* ✅ WORKFLOW STATE */
                workflow={state.status}
                /* ✅ LOCK BANNER */
                lockedBy={
                  state.isLocked
                    ? state.updatedBy?.displayName || "Another editor"
                    : null
                }
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ================= UI STYLES ================= */

const ui = {
  page: { padding: 24, background: "#f3f4f6" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 16,
  },
  title: { margin: 0, fontSize: 22 },
  meta: { display: "flex", gap: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap" },
  grid: {
  display: "grid",
  gridTemplateColumns: "3fr 1fr",
  gap: 24,
  alignItems: "start", // ⭐ THIS FIXES HEIGHT
},

  card: {
    background: "#fff",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  btnPrimary: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  warn: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #f59e0b",
    background: "#fffbeb",
    color: "#92400e",
    fontSize: 12,
  },
};

