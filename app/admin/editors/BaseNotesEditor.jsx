"use client";

import { useState, useEffect } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ================= FIREBASE ================= */

import { auth, db } from "@/lib/firebase";

/* ================= EDITOR CORE ================= */

import EditorLayout from "@/components/content/editor/EditorLayout";

/* ================= ADMIN SECTIONS ================= */

import BasicInfoSection from "@/components/admin/sections/BasicInfoSection";
import SeoSection from "@/components/admin/sections/SeoSection";
import RelatedContentSection from "@/components/admin/sections/RelatedContentSection";
import WorkflowSection from "@/components/admin/sections/WorkflowSection";

/* ================= NOTES SECTION ================= */

import NotesSection from "@/components/admin/sections/types/NotesSection";

/* ================= UI ================= */

import CollapsibleCard from "@/components/admin/ui/CollapsibleCard";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import StickySidebar from "@/components/admin/ui/StickySidebar";

import {
  buildSeoTitle,
  buildCanonicalUrl,
} from "@/lib/content/contentUtils";

/* ====================================================== */

const MODULE = "notes";

export default function BaseNotesEditor({ rawData, role }) {
  /* ======================================================
     STATE
  ====================================================== */

  const [state, setState] = useState(() => ({
    id: rawData?.id || "",

    type: "notes",

    title: rawData?.title || "",
    slug: rawData?.slug || "",
    summary: rawData?.summary || "",
    language: rawData?.language || "en",
    tags: rawData?.tags || [],

    /* ===== NOTES TAXONOMY ===== */
    categoryId: rawData?.categoryId || "",
    categoryName: rawData?.categoryName || "",
    subCategoryId: rawData?.subCategoryId || "",
    subCategoryName: rawData?.subCategoryName || "",
    topic: rawData?.topic || "",

    status: rawData?.status || "draft",
    isLocked: rawData?.isLocked ?? false,
    publishedAt: rawData?.publishedAt || "",

    content: rawData?.content || { mode: "blocks", data: [] },

    seo: rawData?.seo || {},
    relatedContent: rawData?.relatedContent || [],

    createdBy: rawData?.createdBy || null,
    updatedBy: rawData?.updatedBy || null,
    review: rawData?.review || null,

    __isNew: rawData?.__isNew === true,
  }));

  /* ======================================================
     FIX: LOAD STATUS WHEN RAWDATA ARRIVES
  ====================================================== */

  useEffect(() => {
    if (!rawData) return;

    setState((s) => ({
      ...s,
      id: rawData.id,

      title: rawData.title || "",
      slug: rawData.slug || "",
      summary: rawData.summary || "",
      language: rawData.language || "en",
      tags: rawData.tags || [],

      categoryId: rawData.categoryId || "",
      categoryName: rawData.categoryName || "",
      subCategoryId: rawData.subCategoryId || "",
      subCategoryName: rawData.subCategoryName || "",
      topic: rawData.topic || "",

      status: rawData.status || "draft",
      isLocked: rawData.isLocked ?? false,
      publishedAt: rawData.publishedAt || "",

      content: rawData.content || { mode: "blocks", data: [] },
      seo: rawData.seo || {},
      relatedContent: rawData.relatedContent || [],

      createdBy: rawData.createdBy || null,
      updatedBy: rawData.updatedBy || null,
      review: rawData.review || null,

      __isNew: rawData.__isNew === true,
    }));
  }, [rawData]);

  const [autoSaveStatus, setAutoSaveStatus] = useState("Saved ✓");
  const [isSaving, setIsSaving] = useState(false);

  /* ======================================================
     AUTO SEO
  ====================================================== */

  useEffect(() => {
    setState((s) => ({
      ...s,
      seo: {
        ...s.seo,
        seoTitle:
          s.seo?.seoTitle ||
          buildSeoTitle({
            module: MODULE,
            title: s.title,
            language: s.language,
          }),
        canonicalUrl:
          s.seo?.canonicalUrl ||
          buildCanonicalUrl({
            module: MODULE,
            slug: s.slug,
          }),
      },
    }));
  }, [state.title, state.slug, state.language]);

  /* ======================================================
     SAVE TO FIRESTORE
  ====================================================== */

  async function saveToFirestore() {
    const user = auth.currentUser;
    if (!user || state.isLocked || isSaving) return;

    setIsSaving(true);
    setAutoSaveStatus("Saving…");

    const userMeta = {
      uid: user.uid,
      email: user.email,
      role,
    };

    const ref = doc(
      db,
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "master_notes",
      state.id
    );

    const payload = {
      id: state.id,
      type: "notes",

      title: state.title,
      slug: state.slug,
      summary: state.summary,
      language: state.language,
      tags: state.tags,

      categoryId: state.categoryId,
      categoryName: state.categoryName,
      subCategoryId: state.subCategoryId,
      subCategoryName: state.subCategoryName,
      topic: state.topic,

      content: state.content,
      relatedContent: state.relatedContent,

      seo: state.seo,

      status: state.status,
      updatedAt: serverTimestamp(),
      updatedBy: userMeta,
    };

    try {
      if (state.__isNew) {
        await setDoc(ref, {
          ...payload,
          isDeleted: false,
          createdAt: serverTimestamp(),
          createdBy: userMeta,
        });

        setState((s) => ({
          ...s,
          __isNew: false,
        }));
      } else {
        await updateDoc(ref, payload);
      }

      setAutoSaveStatus("Saved ✓");
    } catch (err) {
      console.error(err);
      setAutoSaveStatus("Save failed ❌");
    } finally {
      setIsSaving(false);
    }
  }

  /* ======================================================
     AUTO SAVE
  ====================================================== */

  useEffect(() => {
    if (state.isLocked) return;
    if (state.status !== "draft") return;

    const t = setTimeout(saveToFirestore, 4000);
    return () => clearTimeout(t);
  }, [
    state.title,
    state.slug,
    state.summary,
    state.content,
    state.seo,
    state.categoryId,
    state.subCategoryId,
    state.topic,
  ]);

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div style={{ padding: 24 }}>
      {/* ================= HEADER ================= */}
      <div style={ui.header}>
        <div>
          <h1 style={ui.title}>{state.title || "Untitled Note"}</h1>

          <div style={ui.meta}>
            <span>
              <b>ID:</b> {state.id}
            </span>
            <StatusBadge status={state.status} />
            <span>{autoSaveStatus}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={ui.saveBtn} onClick={saveToFirestore}>
            💾 Save
          </button>

          {role === "editor" && state.status === "draft" && (
            <button
              style={ui.reviewBtn}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  status: "in_review",
                }))
              }
            >
              📤 Submit for Review
            </button>
          )}

          {(role === "admin" || role === "super_admin") && (
            <button
              style={ui.publishBtn}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  status: "published",
                  publishedAt: new Date().toISOString(),
                }))
              }
            >
              🚀 Publish
            </button>
          )}
        </div>
      </div>

      {/* ================= LAYOUT ================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 1fr",
          gap: 24,
        }}
      >
        {/* LEFT */}
        <div>
          <CollapsibleCard title="Basic Information" defaultOpen>
            <BasicInfoSection
              state={state}
              isLocked={state.isLocked}
              onChange={setState}
            />
          </CollapsibleCard>

          <CollapsibleCard title="SEO">
            <SeoSection
              seo={state.seo}
              isLocked={state.isLocked}
              onChange={(seo) =>
                setState((s) => ({
                  ...s,
                  seo,
                }))
              }
            />
          </CollapsibleCard>

          <CollapsibleCard title="Related Content">
            <RelatedContentSection
              value={state.relatedContent}
              onChange={(v) =>
                setState((s) => ({
                  ...s,
                  relatedContent: v,
                }))
              }
            />
          </CollapsibleCard>
        </div>

        {/* RIGHT */}
        <div>
          <StickySidebar>
            <CollapsibleCard title="Notes Classification" defaultOpen>
              <NotesSection
                value={state}
                isLocked={state.isLocked}
                onChange={(v) =>
                  setState((s) => ({
                    ...s,
                    ...v,
                  }))
                }
              />
            </CollapsibleCard>

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

        {/* CONTENT */}
        <div style={{ gridColumn: "1 / -1" }}>
          <EditorLayout
            value={state.content}
            onChange={(content) =>
              setState((s) => ({
                ...s,
                content,
              }))
            }
            onSave={saveToFirestore}
            workflow={state.status}
          />
        </div>
      </div>
    </div>
  );
}

/* ================= UI ================= */

const ui = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 14,
  },
  title: {
    margin: 0,
    fontSize: 22,
  },
  meta: {
    display: "flex",
    gap: 16,
    fontSize: 13,
    color: "#6b7280",
  },
  saveBtn: {
    padding: "6px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  reviewBtn: {
    padding: "6px 14px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  publishBtn: {
    padding: "6px 14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};