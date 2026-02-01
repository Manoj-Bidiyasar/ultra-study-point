"use client";

import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
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
import TypeSectionRenderer from "@/components/admin/sections/types/TypeSectionRenderer.jsx";
import {
  buildTitle,
  buildSeoTitle,
  buildCanonicalUrl,
} from "@/lib/content/contentUtils";

const MODULE = "current-affairs";
/* ======================================================
   BASE CURRENT AFFAIRS EDITOR
   Used for:
   - Daily Current Affairs
   - Monthly Current Affairs
====================================================== */

export default function BaseEditor({ rawData, role, type }) {

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
  if (!state.caDate) return;

  const nextTitle =
    state.title ||
    buildTitle({
      module: MODULE,
      type,
      date: state.caDate,
    });

  const nextSeoTitle =
    state.seo.seoTitle ||
    buildSeoTitle({
      module: MODULE,
      type,
      date: state.caDate,
      language: state.language,
    });

  const nextCanonical =
    state.seo.canonicalUrl ||
    buildCanonicalUrl({
      module: MODULE,
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
}, [state.caDate, state.language, state.slug, type]);




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

  /* ======================================================
     AUTO SAVE
  ====================================================== */

  const [autoSaveStatus, setAutoSaveStatus] = useState("Saved ✓");
const [saveError, setSaveError] = useState(null);
const [isSaving, setIsSaving] = useState(false);


  async function saveToFirestore() {
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

const payload = {
  id: state.id,

  title: state.title,
  slug: normalizedSlug,
  summary: state.summary,
  language: state.language,
  tags: state.tags,

  content: state.content,

  dailyMeta: state.dailyMeta,
  monthlyMeta: state.monthlyMeta,
  notesMeta: state.notesMeta,
  quizMeta: state.quizMeta,

  relatedContent: state.relatedContent,

  caDate: safeDate(state.caDate),
  pdfUrl: state.pdfUrl,

  status: state.status,
  publishedAt:
    state.status === "scheduled"
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


useEffect(() => {
  if (!currentUserProfile) return;
  if (isLocked) return;
  if (state.status !== "draft") return;

  const t = setTimeout(saveToFirestore, 3000);
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

  {/* ================= SETTINGS ================= */}
<CollapsibleCard title="Type Specific Settings" defaultOpen>
  <TypeSectionRenderer
  type={type}
  meta={{
    daily: state.dailyMeta,
    monthly: state.monthlyMeta,
    notes: state.notesMeta,
    quiz: state.quizMeta,
  }}
  isLocked={isLocked}
  onChange={(meta) =>
    setState((s) => ({
      ...s,
      dailyMeta: meta.daily ?? s.dailyMeta,
      monthlyMeta: meta.monthly ?? s.monthlyMeta,
      notesMeta: meta.notes ?? s.notesMeta,
      quizMeta: meta.quiz ?? s.quizMeta,
    }))
  }
/>

</CollapsibleCard>



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
};
