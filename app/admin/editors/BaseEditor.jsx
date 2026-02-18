"use client";

import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
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
import PyqContentEditor from "@/components/admin/sections/PyqContentEditor";
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
  pyq: "quiz",
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
  section: "subject",
  categoryId: "",
  categoryName: "",
  subCategoryId: "",
  subCategoryName: "",
  topic: "",
},
pyqMeta: {
  exam: rawData.pyqMeta?.exam || rawData.exam || "",
  year: rawData.pyqMeta?.year || rawData.year || "",
  subject: rawData.pyqMeta?.subject || rawData.subject || "",
  course: rawData.pyqMeta?.course || rawData.course || "",
  type: rawData.pyqMeta?.type || rawData.type || "",
  examYearDisplayMode: rawData.pyqMeta?.examYearDisplayMode || "auto",
  categoryMode: rawData.pyqMeta?.categoryMode || "exam",
  examCategoryId: rawData.pyqMeta?.examCategoryId || "",
  subjectCategoryId: rawData.pyqMeta?.subjectCategoryId || "",
  pyqCategoryId:
    rawData.pyqMeta?.pyqCategoryId ||
    rawData.pyqCategoryId ||
    "",
  hideAnswersDefault:
    rawData.pyqMeta?.hideAnswersDefault ??
    rawData.hideAnswersDefault ??
    true,
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
    review: {
      ...(rawData.review || {}),
      feedback: rawData.review?.feedback || "",
      editorMessage:
        rawData.review?.editorMessage || rawData.review?.message || "",
      messageThread: Array.isArray(rawData.review?.messageThread)
        ? rawData.review.messageThread
        : [],
    },

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
  const [contentDirty, setContentDirty] = useState(false);

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

  useEffect(() => {
    const canCleanup = role === "admin" || role === "super_admin";
    if (!canCleanup) return;
    if (state.status !== "published") return;
    if (!hasWorkflowMessages(state.review)) return;

    const publishedMs = dateToMs(rawData?.publishedAt || state.publishedAt);
    if (!publishedMs) return;

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - publishedMs < sevenDaysMs) return;

    let cancelled = false;

    async function clearOldWorkflowMessages() {
      try {
        await updateDoc(docRef, {
          review: {
            ...(state.review || {}),
            feedback: "",
            editorMessage: "",
            messageThread: [],
          },
        });

        if (cancelled) return;
        setState((s) => ({
          ...s,
          review: {
            ...(s.review || {}),
            feedback: "",
            editorMessage: "",
            messageThread: [],
          },
        }));
      } catch (err) {
        if (!isPermissionDenied(err)) {
          console.error("Workflow message cleanup failed:", err);
        }
      }
    }

    clearOldWorkflowMessages();
    return () => {
      cancelled = true;
    };
  }, [role, state.status, state.publishedAt, state.review, rawData?.publishedAt]);

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

  // âœ… prevent unnecessary setState
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
  if (type === "pyq") return "PYQs";

  return "currentAffairs";
}

  function isPermissionDenied(err) {
    const msg = String(err?.message || "").toLowerCase();
    return err?.code === "permission-denied" || msg.includes("insufficient") || msg.includes("permission");
  }

  function toRuntimeError(err) {
    if (err instanceof Error) return err;
    const message =
      typeof err === "string"
        ? err
        : String(err?.message || err?.type || "Unknown runtime error");
    return new Error(message);
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
    if (v instanceof Date) {
      return Number.isNaN(v.getTime()) ? null : v;
    }
    if (typeof v === "object" && typeof v.toDate === "function") {
      const d = v.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof v === "object" && typeof v.seconds === "number") {
      const ms = v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function dateToMs(value) {
    if (!value) return 0;
    if (typeof value === "object" && typeof value.toDate === "function") {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function hasWorkflowMessages(review) {
    const feedback = String(review?.feedback || "").trim();
    const editorMessage = String(review?.editorMessage || "").trim();
    const thread = Array.isArray(review?.messageThread) ? review.messageThread : [];
    const threadHasText = thread.some((m) => String(m?.text || "").trim());
    return Boolean(feedback || editorMessage || threadHasText);
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

  function normalizeDateInput(value) {
    const d = safeDate(value);
    return d ? d.toISOString() : "";
  }

  function getDateSyncErrorFromDoc(docValue) {
    if (!docValue || (type !== "daily" && type !== "monthly")) return "";
    const top = normalizeDateInput(docValue.caDate);
    const metaDate =
      type === "daily"
        ? normalizeDateInput(docValue?.dailyMeta?.caDate)
        : normalizeDateInput(docValue?.monthlyMeta?.caDate);

    if (top && metaDate && top !== metaDate) {
      return `Date mismatch: caDate (${top.slice(0, 10)}) and ${
        type === "daily" ? "dailyMeta.caDate" : "monthlyMeta.caDate"
      } (${metaDate.slice(0, 10)}) must be same.`;
    }
    return "";
  }

  function validateImportedDocument(next) {
    return getDateSyncErrorFromDoc(next);
  }

  function normalizeImportedDocument(prev, next) {
    if (!next || typeof next !== "object") return prev;

    const out = { ...prev };
    const apply = (key) => {
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        out[key] = next[key];
      }
    };

    // Common editable fields.
    [
      "title",
      "slug",
      "summary",
      "language",
      "tags",
      "status",
      "publishedAt",
      "content",
      "seo",
      "relatedContent",
      "review",
    ].forEach(apply);

    // Keep editor identity stable even if JSON contains mismatched ids/types.
    out.id = prev.id;
    out.__isNew = prev.__isNew;
    out.createdBy = prev.createdBy;
    out.updatedBy = prev.updatedBy;
    out.isLocked = prev.isLocked;

    if (type === "daily") {
      const normalizedTop = normalizeDateInput(next.caDate);
      const normalizedMeta = normalizeDateInput(next?.dailyMeta?.caDate);
      const normalized = normalizedTop || normalizedMeta;

      if (next.dailyMeta && typeof next.dailyMeta === "object") {
        out.dailyMeta = {
          ...next.dailyMeta,
          caDate: normalized || "",
        };
      }
      if (normalized) {
        out.caDate = normalized;
      } else if (Object.prototype.hasOwnProperty.call(next, "caDate")) {
        out.caDate = next.caDate || "";
      }
      return out;
    }

    if (type === "monthly") {
      const normalizedTop = normalizeDateInput(next.caDate);
      const normalizedMeta = normalizeDateInput(next?.monthlyMeta?.caDate);
      const normalized = normalizedTop || normalizedMeta;

      if (next.monthlyMeta && typeof next.monthlyMeta === "object") {
        out.monthlyMeta = {
          ...next.monthlyMeta,
          caDate: normalized || "",
        };
      }
      if (normalized) {
        out.caDate = normalized;
      } else if (Object.prototype.hasOwnProperty.call(next, "caDate")) {
        out.caDate = next.caDate || "";
      }
      if (Object.prototype.hasOwnProperty.call(next, "pdfUrl")) {
        out.pdfUrl = next.pdfUrl;
      } else if (next.monthlyMeta?.pdfUrl) {
        out.pdfUrl = next.monthlyMeta.pdfUrl;
      }
      return out;
    }

    if (type === "notes") {
      if (next.notesMeta && typeof next.notesMeta === "object") {
        out.notesMeta = next.notesMeta;
      }
      return out;
    }

    if (type === "quiz") {
      if (next.quizMeta && typeof next.quizMeta === "object") {
        out.quizMeta = next.quizMeta;
      }
      return out;
    }

    if (type === "pyq") {
      if (next.quizMeta && typeof next.quizMeta === "object") {
        out.quizMeta = next.quizMeta;
      }
      if (next.pyqMeta && typeof next.pyqMeta === "object") {
        out.pyqMeta = next.pyqMeta;
      }
      return out;
    }

    return out;
  }

  function buildBulkDocumentValue(doc) {
    if (!doc || typeof doc !== "object") return doc;

    const base = {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      summary: doc.summary,
      language: doc.language,
      tags: doc.tags,
      status: doc.status,
      isLocked: doc.isLocked,
      publishedAt: doc.publishedAt,
      content: doc.content,
      seo: doc.seo,
      relatedContent: doc.relatedContent,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      review: doc.review,
      __isNew: doc.__isNew,
    };

    if (type === "daily") {
      return {
        ...base,
        dailyMeta: doc.dailyMeta || {},
        caDate: doc.caDate || doc.dailyMeta?.caDate || "",
      };
    }

    if (type === "monthly") {
      return {
        ...base,
        monthlyMeta: doc.monthlyMeta || {},
        caDate: doc.caDate || doc.monthlyMeta?.caDate || "",
        pdfUrl: doc.pdfUrl || doc.monthlyMeta?.pdfUrl || "",
      };
    }

    if (type === "notes") {
      return {
        ...base,
        notesMeta: doc.notesMeta || {},
      };
    }

    if (type === "quiz") {
      return {
        ...base,
        quizMeta: doc.quizMeta || {},
      };
    }

    if (type === "pyq") {
      return {
        ...base,
        quizMeta: doc.quizMeta || {},
        pyqMeta: doc.pyqMeta || {},
      };
    }

    return base;
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
        slug: state.slug || "",
        status: "pending",
        createdBy: currentUserProfile,
        message: String(state.review?.editorMessage || "").trim(),
        editorMessage: String(state.review?.editorMessage || "").trim(),
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

  const dateSyncError = getDateSyncErrorFromDoc(state);
  const bulkDocumentValue = buildBulkDocumentValue(state);

  /* ======================================================
     AUTO SAVE
  ====================================================== */

  const [autoSaveStatus, setAutoSaveStatus] = useState("Saved âœ“");
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

  function derivePyqFromQuestions(questions = []) {
    const list = Array.isArray(questions) ? questions : [];
    const subjects = [];
    const exams = [];
    const years = [];

    const push = (arr, value) => {
      const v = String(value || "").trim();
      if (v) arr.push(v);
    };

    list.forEach((q) => {
      const meta = q?.meta || {};
      push(subjects, meta.subject);
      push(subjects, q?.subject);

      const rows = Array.isArray(meta.pyqData) ? meta.pyqData : [];
      rows.forEach((r) => {
        push(exams, r?.exam);
        push(years, r?.year);
      });

      push(exams, meta.exam);
      push(exams, q?.exam);
      push(years, meta.year);
      push(years, q?.year);
    });

    const top = (arr) => {
      const freq = new Map();
      arr.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
      if (freq.size === 0) return "";
      return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };

    return {
      exam: top(exams),
      year: top(years),
      subject: top(subjects),
    };
  }

  async function saveToFirestore({ mode = "auto" } = {}) {
    if (!currentUserProfile) return false;
    if (isLocked) return false;
    if (isSaving) return false;

    setIsSaving(true);
    setSaveError(null);

    // Optimistic UI state.
    setAutoSaveStatus("Saved");
    setLastSavedAt(Date.now());

    try {
      if (type === "quiz" || type === "pyq") {
        const quizErrors = validateQuizMeta(state.quizMeta);
        if (quizErrors.length > 0) {
          setAutoSaveStatus("Save blocked");
          setSaveError(quizErrors[0]);
          setSaveErrors(quizErrors);
          return false;
        }
      }

      const slugError = await validateEditorSlug({
        slug: normalizedSlug,
        type,
        currentId: state.id,
      });
      if (slugError) throw new Error(slugError);

      const userMeta = {
        uid: currentUserProfile.uid,
        email: currentUserProfile.email,
        displayName: currentUserProfile.displayName,
        role: currentUserProfile.role,
      };

      const safeStatus =
        mode === "auto"
          ? state.status === "scheduled"
            ? "scheduled"
            : "draft"
          : state.status;
      const derivedPyq = derivePyqFromQuestions(state.quizMeta?.questions || []);
      const nextPyqMeta =
        type === "pyq"
          ? {
              ...state.pyqMeta,
              exam: derivedPyq.exam || state.pyqMeta?.exam || "",
              year: derivedPyq.year || state.pyqMeta?.year || "",
              subject: derivedPyq.subject || state.pyqMeta?.subject || "",
            }
          : {};

      const basePayload = {
        id: state.id,
        type,
        title: state.title,
        slug: normalizedSlug,
        summary: state.summary,
        language: state.language,
        tags: state.tags,
        content: state.content,
        relatedContent: state.relatedContent,
        status: safeStatus,
        publishedAt: safeStatus === "scheduled" ? safeDate(state.publishedAt) : null,
        review: {
          ...(state.review || {}),
          feedback: String(state.review?.feedback || ""),
          editorMessage: String(state.review?.editorMessage || ""),
        },
        seo: cleanSeo(state.seo),
      };

      const quizPayload =
        type === "quiz" || type === "pyq"
          ? {
              quizMeta: state.quizMeta,
              description: state.summary,
              durationMinutes: state.quizMeta?.durationMinutes ?? 0,
              rules: state.quizMeta?.rules || {},
              scoring: state.quizMeta?.scoring || {},
              sections: state.quizMeta?.sections || [],
              questions: state.quizMeta?.questions || [],
            }
          : {};

      const typePayload =
        type === "daily"
          ? {
              dailyMeta: {
                ...(state.dailyMeta || {}),
                caDate: safeDate(
                  state.dailyMeta?.caDate || state.caDate
                ),
              },
              caDate: safeDate(
                state.caDate || state.dailyMeta?.caDate
              ),
            }
          : type === "monthly"
          ? {
              monthlyMeta: {
                ...(state.monthlyMeta || {}),
                caDate: safeDate(
                  state.monthlyMeta?.caDate || state.caDate
                ),
                pdfUrl:
                  state.monthlyMeta?.pdfUrl ||
                  state.pdfUrl ||
                  "",
              },
              caDate: safeDate(
                state.caDate || state.monthlyMeta?.caDate
              ),
              pdfUrl: state.monthlyMeta?.pdfUrl || state.pdfUrl || "",
            }
          : type === "notes"
          ? {
              notesMeta: state.notesMeta || {},
            }
          : type === "pyq"
          ? {
              pyqMeta: nextPyqMeta,
              exam: nextPyqMeta.exam || "",
              year: nextPyqMeta.year || "",
              subject: nextPyqMeta.subject || "",
              course: nextPyqMeta.course || "",
              pyqCategoryId:
                nextPyqMeta.pyqCategoryId ||
                (nextPyqMeta.categoryMode === "subject"
                  ? nextPyqMeta.subjectCategoryId || ""
                  : nextPyqMeta.examCategoryId || ""),
              hideAnswersDefault: nextPyqMeta.hideAnswersDefault ?? true,
            }
          : {};

      const payload = {
        ...basePayload,
        ...quizPayload,
        ...typePayload,
      };

      const cleanupPayload = {
        dailyMeta: type === "daily" ? payload.dailyMeta : deleteField(),
        monthlyMeta: type === "monthly" ? payload.monthlyMeta : deleteField(),
        notesMeta: type === "notes" ? payload.notesMeta : deleteField(),
        quizMeta:
          type === "quiz" || type === "pyq"
            ? payload.quizMeta
            : deleteField(),
        pyqMeta: type === "pyq" ? payload.pyqMeta : deleteField(),
        caDate: isCA ? payload.caDate : deleteField(),
        pdfUrl: type === "monthly" ? payload.pdfUrl : deleteField(),
        description:
          type === "quiz" || type === "pyq"
            ? payload.description
            : deleteField(),
        durationMinutes:
          type === "quiz" || type === "pyq"
            ? payload.durationMinutes
            : deleteField(),
        rules:
          type === "quiz" || type === "pyq" ? payload.rules : deleteField(),
        scoring:
          type === "quiz" || type === "pyq" ? payload.scoring : deleteField(),
        sections:
          type === "quiz" || type === "pyq"
            ? payload.sections
            : deleteField(),
        questions:
          type === "quiz" || type === "pyq"
            ? payload.questions
            : deleteField(),
        exam: type === "pyq" ? payload.exam : deleteField(),
        year: type === "pyq" ? payload.year : deleteField(),
        subject: type === "pyq" ? payload.subject : deleteField(),
        course: type === "pyq" ? payload.course : deleteField(),
        pyqCategoryId:
          type === "pyq" ? payload.pyqCategoryId : deleteField(),
        hideAnswersDefault:
          type === "pyq"
            ? payload.hideAnswersDefault
            : deleteField(),
      };

      if (state.__isNew) {
        await setDoc(docRef, {
          ...payload,
          isDeleted: false,
          status: "draft",
          createdAt: serverTimestamp(),
          createdBy: userMeta,
        });
        setState((s) => ({ ...s, __isNew: false }));
      } else {
        await updateDoc(docRef, {
          ...payload,
          ...cleanupPayload,
        });
      }

      setAutoSaveStatus("Saved");
      setSaveErrors([]);

      if (mode === "manual") {
        try {
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
        } catch (err) {
          if (!isPermissionDenied(err)) throw toRuntimeError(err);
        }
      }

      return true;
    } catch (err) {
      console.error(err);
      setAutoSaveStatus("Save failed");
      setSaveError(err.message || "Save failed");
      setSaveErrors([]);
      return false;
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
      const saved = await saveToFirestore({ mode: "manual" });
      if (!saved) {
        setSubmitState({
          loading: false,
          error: "Please fix save errors before submitting for review.",
          success: null,
        });
        return;
      }
      const nextReviewThread = Array.isArray(state.review?.messageThread)
        ? [...state.review.messageThread]
        : [];
      const editorMessage = String(state.review?.editorMessage || "").trim();
      if (editorMessage) {
        nextReviewThread.push({
          by: "editor",
          text: editorMessage,
          at: new Date().toISOString(),
          uid: currentUserProfile.uid,
          name: currentUserProfile.displayName || "",
          email: currentUserProfile.email || "",
        });
      }

      try {
        // Keep submit payload minimal to satisfy stricter Firestore rules.
        await updateDoc(docRef, {
          status: "review",
          submittedAt: serverTimestamp(),
          updatedBy: currentUserProfile,
          updatedAt: serverTimestamp(),
          review: {
            ...(state.review || {}),
            status: "pending",
            editorMessage,
            messageThread: nextReviewThread,
          },
        });
      } catch (err) {
        // Retry with the smallest possible payload if field-level rules are strict.
        if (!isPermissionDenied(err)) throw toRuntimeError(err);
        await updateDoc(docRef, {
          status: "review",
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setState((s) => ({
        ...s,
        status: "review",
        isLocked: true,
        review: {
          ...(s.review || {}),
          status: "pending",
          editorMessage,
          messageThread: nextReviewThread,
        },
      }));

      try {
        await upsertReviewQueue({ action: "submit" });
      } catch (err) {
        if (isPermissionDenied(err)) {
          // Optional queue entry; status=review is the primary signal for admins.
        } else {
          throw toRuntimeError(err);
        }
      }

      try {
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
      } catch (err) {
        if (!isPermissionDenied(err)) throw toRuntimeError(err);
      }

      setSubmitState({
        loading: false,
        error: null,
        success: "Submitted for review.",
      });
    } catch (err) {
      console.error(err);
      const friendlyError = isPermissionDenied(err)
        ? "Submit failed due to Firestore permissions for this document. Please ensure the editor owns this document (createdBy.uid) and has submit access."
        : err?.message || "Failed to submit for review.";
      setSubmitState({
        loading: false,
        error: friendlyError,
        success: null,
      });
    }
  }

  async function applyAdminAction(nextStatus) {
    if (!currentUserProfile) return;
    if (role !== "admin" && role !== "super_admin") return;

    try {
      const reviewFeedback = String(state.review?.feedback || "").trim();
      const creatorRole = String(state?.createdBy?.role || "").toLowerCase();
      const creatorUid = state?.createdBy?.uid || "";
      const isCreatorEditor = creatorRole === "editor";
      const isOwnDoc = Boolean(
        creatorUid && currentUserProfile?.uid && creatorUid === currentUserProfile.uid
      );
      const isReturnToEditor = nextStatus === "draft" && state?.status === "rejected";
      const requiresReturnFeedback =
        isReturnToEditor &&
        isCreatorEditor &&
        !isOwnDoc;

      if (requiresReturnFeedback && !reviewFeedback) {
        setSubmitState({
          loading: false,
          error: "Please add feedback before returning to editor.",
          success: null,
        });
        return;
      }

      if (nextStatus === "published" && (type === "quiz" || type === "pyq")) {
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
      if (nextStatus === "published") {
        update.review = {
          status: "approved",
          feedback: reviewFeedback,
          editorMessage: String(state.review?.editorMessage || ""),
          messageThread: Array.isArray(state.review?.messageThread)
            ? [
                ...state.review.messageThread,
                ...(reviewFeedback
                  ? [
                      {
                        by: "admin",
                        text: reviewFeedback,
                        at: new Date().toISOString(),
                        uid: currentUserProfile.uid,
                        name: currentUserProfile.displayName || "",
                        email: currentUserProfile.email || "",
                      },
                    ]
                  : []),
              ]
            : reviewFeedback
            ? [
                {
                  by: "admin",
                  text: reviewFeedback,
                  at: new Date().toISOString(),
                  uid: currentUserProfile.uid,
                  name: currentUserProfile.displayName || "",
                  email: currentUserProfile.email || "",
                },
              ]
            : [],
          reviewedBy: currentUserProfile,
          reviewedByUid: currentUserProfile.uid,
          reviewedByEmail: currentUserProfile.email,
          reviewedAt: serverTimestamp(),
        };
      }
      if (isReturnToEditor) {
        update.review = {
          status: "rejected",
          feedback: reviewFeedback,
          editorMessage: String(state.review?.editorMessage || ""),
          messageThread: Array.isArray(state.review?.messageThread)
            ? [
                ...state.review.messageThread,
                {
                  by: "admin",
                  text: reviewFeedback,
                  at: new Date().toISOString(),
                  uid: currentUserProfile.uid,
                  name: currentUserProfile.displayName || "",
                  email: currentUserProfile.email || "",
                },
              ]
            : [
                {
                  by: "admin",
                  text: reviewFeedback,
                  at: new Date().toISOString(),
                  uid: currentUserProfile.uid,
                  name: currentUserProfile.displayName || "",
                  email: currentUserProfile.email || "",
                },
              ],
          reviewedBy: currentUserProfile,
          reviewedByUid: currentUserProfile.uid,
          reviewedByEmail: currentUserProfile.email,
          reviewedAt: serverTimestamp(),
        };
      }

      await updateDoc(docRef, update);

      if (nextStatus === "published") {
        try {
          await upsertReviewQueue({ action: "approve" });
        } catch (err) {
          if (!isPermissionDenied(err)) throw toRuntimeError(err);
        }
      }
      if (isReturnToEditor) {
        try {
          await upsertReviewQueue({
            action: "reject",
            feedback: reviewFeedback,
          });
        } catch (err) {
          if (!isPermissionDenied(err)) throw toRuntimeError(err);
        }
      }

      setState((s) => ({
        ...s,
        ...update,
      }));

      setSubmitState({
        loading: false,
        error: null,
        success:
          isReturnToEditor
            ? "Returned to editor with feedback."
            : nextStatus === "draft"
            ? "Draft saved."
            : nextStatus === "published"
            ? "Published successfully."
            : "Status updated.",
      });

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
      setSubmitState({
        loading: false,
        error: err?.message || "Failed to update status.",
        success: null,
      });
    }
  }


useEffect(() => {
  if (!currentUserProfile) return;
  if (isLocked) return;
  if (state.status !== "draft") return;

  const t = setTimeout(() => saveToFirestore({ mode: "auto" }), 3000);
  return () => clearTimeout(t);
}, [
  currentUserProfile, // âœ… CRITICAL
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

  async function saveDraftForLater() {
    if (isLocked) return;
    const saved = await saveToFirestore({ mode: "manual" });
    setSubmitState({
      loading: false,
      error: saved ? null : "Failed to save draft.",
      success: saved ? "Draft saved." : null,
    });
  }

  async function openPreview() {
    const saved = await saveToFirestore({ mode: "manual" });
    if (!saved) return;
    const previewSlug = type === "notes" ? state.id : normalizedSlug;
    const url = await createPreviewToken({
      docId: state.id,
      slug: previewSlug,
      type,
    });
    window.open(url, "_blank");
  }


  /* ======================================================
     UI
  ====================================================== */

  return (
    <div style={ui.page}>

      {/* ================= HEADER ================= */}
      <div style={ui.header}>
        <div style={ui.headerMain}>
          <h1 style={ui.title}>{state.title || "Untitled"}</h1>
          <div style={ui.meta}>
            <span><b>ID:</b> {state.id}</span>
            <StatusBadge status={state.status} />
          </div>
        </div>
          {state.status === "published" && (
            <div style={ui.warn}>
              This document is published. Changes wonâ€™t autoâ€‘publish until you
              manually update the status.
            </div>
          )}
      </div>

      {/* ================= LAYOUT ================= */}
      <div style={ui.grid}>

        {/* LEFT COLUMN */}
        <div>

  {/* ================= BASIC INFO ================= */}
  <CollapsibleCard title="Basic Information" defaultOpen>
    <BasicInfoSection
      state={state}
      isLocked={isLocked}
      onChange={setState}
    />
    {dateSyncError && (
      <div style={ui.warn}>
        {dateSyncError}
      </div>
    )}
  </CollapsibleCard>

  {/* ================= SEO ================= */}
  <CollapsibleCard title="SEO & Meta" defaultOpen>
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
      daily: {
        ...(state.dailyMeta || {}),
        caDate: state.dailyMeta?.caDate || state.caDate || "",
      },
      monthly: {
        ...(state.monthlyMeta || {}),
        caDate: state.monthlyMeta?.caDate || state.caDate || "",
      },
      notes: state.notesMeta,
      pyq: state.pyqMeta,
      quiz: state.quizMeta,
    },
    onChange: (meta) =>
      setState((s) => ({
        ...s,
        dailyMeta: meta.daily ?? s.dailyMeta,
        monthlyMeta: meta.monthly ?? s.monthlyMeta,
        notesMeta: meta.notes ?? s.notesMeta,
        pyqMeta: meta.pyq ?? s.pyqMeta,
        quizMeta: meta.quiz ?? s.quizMeta,
        caDate:
          type === "daily"
            ? (meta.daily?.caDate ?? s.caDate)
            : type === "monthly"
            ? (meta.monthly?.caDate ?? s.caDate)
            : s.caDate,
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
      onStatusChange={(status) =>
        setState((s) => ({
          ...s,
          status,
        }))
      }
      onPublishedAtChange={(publishedAt) =>
        setState((s) => ({
          ...s,
          publishedAt,
        }))
      }
      onReviewChange={(value, field = "feedback") =>
        setState((s) => ({
          ...s,
          review: {
            ...s.review,
            [field]: value,
          },
        }))
      }
      onSubmitForReview={submitForReview}
      onSaveDraft={saveDraftForLater}
      onAdminAction={applyAdminAction}
    />
  </CollapsibleCard>

</StickySidebar>

        </div>

        {/* FULL WIDTH CONTENT */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={ui.card}>
            <div style={ui.sectionHeader}>
              <h3 style={ui.sectionTitle}>
                {type === "quiz"
                  ? "Quiz Content"
                  : type === "pyq"
                  ? "PYQ Content"
                  : "Content"}
              </h3>
              <div style={ui.sectionMeta}>
                <span style={ui.contentStatusText}>
                  Status: {state.status}
                </span>
                {contentDirty && (
                  <span style={ui.unsavedText}>• Unsaved changes</span>
                )}
              </div>
            </div>

            {type === "quiz" || type === "pyq" ? (
              <>
                {saveErrors.length > 0 && (
                  <div style={ui.warn}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {type === "pyq"
                        ? "PYQ validation errors:"
                        : "Quiz validation errors:"}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {saveErrors.map((e, i) => (
                        <li key={`${e}-${i}`}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {type === "pyq" ? (
                  <PyqContentEditor
                    title={state.title}
                    description={state.summary}
                    value={state.quizMeta}
                    examYearDisplayMode={state.pyqMeta?.examYearDisplayMode || "auto"}
                    hideAnswersDefault={state.pyqMeta?.hideAnswersDefault ?? true}
                    isLocked={isLocked}
                    role={role}
                    docId={state.id}
                    onChange={(quizMeta) =>
                      setState((s) => ({ ...s, quizMeta }))
                    }
                    onExamYearDisplayModeChange={(examYearDisplayMode) =>
                      setState((s) => ({
                        ...s,
                        pyqMeta: {
                          ...(s.pyqMeta || {}),
                          examYearDisplayMode:
                            String(examYearDisplayMode || "auto"),
                        },
                      }))
                    }
                    onHideAnswersDefaultChange={(hideAnswersDefault) =>
                      setState((s) => ({
                        ...s,
                        pyqMeta: {
                          ...(s.pyqMeta || {}),
                          hideAnswersDefault: !!hideAnswersDefault,
                        },
                      }))
                    }
                  />
                ) : (
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
                )}
              </>
            ) : (
              <EditorLayout
                value={state.content}
                onChange={(content) =>
                  setState((s) => ({ ...s, content }))
                }
                documentValue={bulkDocumentValue}
                onDocumentChange={(nextDoc) =>
                  setState((prev) =>
                    normalizeImportedDocument(prev, nextDoc)
                  )
                }
                onDocumentValidate={validateImportedDocument}
                role={role}
                saveStatus={autoSaveStatus}
                isSaving={isSaving}
                saveError={saveError}
                /* âœ… REAL SAVE FUNCTION */
                onSave={saveToFirestore}
                /* âœ… WORKFLOW STATE */
                workflow={state.status}
                /* âœ… LOCK BANNER */
                lockedBy={
                  state.isLocked
                    ? state.updatedBy?.displayName || "Another editor"
                    : null
                }
                onDirtyChange={setContentDirty}
              />
            )}
          </div>
        </div>

      </div>

      <div
        style={{
          ...ui.floatingSavePanel,
          ...(saveError
            ? ui.floatingSaveError
            : isSaving
            ? ui.floatingSaveSaving
            : ui.floatingSaveIdle),
        }}
      >
        <button
          type="button"
          onClick={() => saveToFirestore({ mode: "manual" })}
          disabled={isSaving || isLocked}
          style={{
            ...ui.floatingSaveRow,
            ...(isSaving || isLocked ? ui.floatingSaveDisabled : {}),
          }}
        >
          <span style={ui.floatingSaveInlineTitle}>
            {isLocked
              ? "Locked"
              : saveError
              ? "Save failed - Retry"
              : isSaving
              ? "Saving..."
              : "Save"}
          </span>
          <span style={ui.floatingSaveInlineTime}>
            {saveError
              ? String(saveError).slice(0, 80)
              : `Saved ${formatSince(lastSavedAt)}`}
          </span>
        </button>
        <button
          type="button"
          onClick={openPreview}
          disabled={isSaving || isLocked}
          style={{
            ...ui.floatingPreviewBtn,
            ...(isSaving || isLocked ? ui.floatingSaveDisabled : {}),
          }}
        >
          Preview
        </button>
      </div>
    </div>
  );
}

/* ================= UI STYLES ================= */

const ui = {
  page: { padding: 16, background: "#f3f4f6" },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "stretch",
    marginBottom: 12,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 8,
  },
  headerMain: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "60vw",
  },
  meta: {
    display: "flex",
    gap: 14,
    fontSize: 11,
    color: "#6b7280",
    flexWrap: "nowrap",
    alignItems: "center",
    minWidth: 0,
  },
  grid: {
  display: "grid",
  gridTemplateColumns: "3fr 1fr",
  gap: 24,
  alignItems: "start", // â­ THIS FIXES HEIGHT
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
    marginBottom: 0,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  contentStatusText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },
  unsavedText: {
    fontSize: 12,
    fontWeight: 600,
    color: "#b45309",
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
  floatingSavePanel: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 60,
    minWidth: 190,
    borderRadius: 12,
    border: "1px solid #111827",
    boxShadow: "0 6px 14px rgba(0,0,0,0.14)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  floatingSaveRow: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  floatingPreviewBtn: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.15)",
    color: "inherit",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
  },
  floatingSaveIdle: {
    background: "#111827",
    color: "#f9fafb",
    borderColor: "#111827",
  },
  floatingSaveSaving: {
    background: "#f59e0b",
    color: "#111827",
    borderColor: "#d97706",
  },
  floatingSaveError: {
    background: "#b91c1c",
    color: "#fef2f2",
    borderColor: "#991b1b",
  },
  floatingSaveDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  floatingSaveInlineTitle: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
  },
  floatingSaveInlineTime: {
    fontSize: 11,
    opacity: 0.9,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
};

