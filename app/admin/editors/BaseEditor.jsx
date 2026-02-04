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

import { auth, db } from "@/lib/firebase";
import { validateEditorSlug } from "@/lib/caValidation";
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
    summary: rawData.summary || "",
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
quizMeta: rawData.quizMeta || {},

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
  if (type === "quiz") return "master_quiz";

  return "currentAffairs";
}

  const normalizedSlug = state.slug.trim().toLowerCase();

  const isLocked =
    state.isLocked ||
    (role === "editor" && state.status !== "draft");

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
  } catch (err) {
    console.error(err);

    setAutoSaveStatus("Save failed ❌");
    setSaveError(err.message || "Save failed");
  } finally {
    setIsSaving(false);
  }
}

  async function submitForReview() {
    if (!currentUserProfile) return;
    if (isLocked) return;

    try {
      await upsertReviewQueue({ action: "submit" });
      await updateDoc(docRef, {
        submittedAt: serverTimestamp(),
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
    } catch (err) {
      console.error(err);
    }
  }

  async function applyAdminAction(nextStatus) {
    if (!currentUserProfile) return;
    if (role !== "admin" && role !== "super_admin") return;

    try {
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
  state.status,
  state.publishedAt,
]);


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
          </div>
          {state.status === "published" && (
            <div style={ui.warn}>
              This document is published. Changes won’t auto‑publish until you
              manually update the status.
            </div>
          )}
        </div>

        <button
          style={ui.btn}
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
          Public Preview
        </button>
        <button
          style={{ ...ui.btn, marginLeft: 8 }}
          onClick={() => saveToFirestore({ mode: "manual" })}
        >
          Save Now
        </button>
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
            <h3 style={ui.sectionTitle}>Content</h3>
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
    marginBottom: 24,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 16,
  },
  title: { margin: 0, fontSize: 22 },
  meta: { display: "flex", gap: 16, fontSize: 13, color: "#6b7280" },
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
  btn: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
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
