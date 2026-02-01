"use client";

import { useState, useEffect, useRef, memo } from "react";
import UniversalEditor from "./UniversalEditor";
import ContentJsonEditor from "./ContentJsonEditor";
import BulkJsonEditor from "./BulkJsonEditor";
import LivePreview from "./LivePreview";
import PreviewErrorBoundary from "./PreviewErrorBoundary";


/* ================= MEMO PREVIEW ================= */
const MemoPreview = memo(LivePreview);

export default function EditorLayout({
  value,
  onChange,
  saveStatus,
  isSaving,
  saveError,


  onSave,          // ✅ NEW
  workflow,        // ✅ NEW
  lockedBy,        // ✅ NEW

  documentValue,
  onDocumentChange,  
  role = "editor",
}) {
  const [tab, setTab] = useState("editor");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
const [secondsAgo, setSecondsAgo] = useState(0);





  /* ================= ACTIVE BLOCK ================= */
  const [activeBlockId, setActiveBlockId] = useState(null);

  /* ================= SPLIT SIZE ================= */
  const [leftWidth, setLeftWidth] = useState(50);
  const dragging = useRef(false);

  /* ================= MOBILE ================= */
  const [mobileView, setMobileView] = useState("editor");
  const [isDesktop, setIsDesktop] = useState(false);

  /* ================= PREVIEW OPTIONS ================= */
  const [previewZoom, setPreviewZoom] = useState(1);
  const [device, setDevice] = useState("desktop");
  const [previewLoading, setPreviewLoading] = useState(false);


  /* ================= SCROLL SYNC ================= */
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  /* ================= PREVIEW DEBOUNCE ================= */
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
  setPreviewLoading(true);

  const t = setTimeout(() => {
    setDebouncedValue(value);
    setPreviewLoading(false);
  }, 600);

  return () => clearTimeout(t);
}, [value]);

useEffect(() => {
  setDirty(true);
}, [value]);


/* ================= DESKTOP DETECT ================= */
useEffect(() => {
  const update = () =>
    setIsDesktop(window.innerWidth >= 1024);

  update();
  window.addEventListener("resize", update);
  return () =>
    window.removeEventListener("resize", update);
}, []);


/* ================= KEYBOARD SHORTCUTS ================= */
useEffect(() => {
  const handler = (e) => {

    // Ctrl + S → Save
    if (e.ctrlKey && e.key === "s") {
  e.preventDefault();
  onSave?.();
}



    // Ctrl + / → Content JSON
    if (e.ctrlKey && e.key === "/") {
      e.preventDefault();
      setTab("content-json");
    }

    // Ctrl + Enter → Preview
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      setMobileView("preview");
    }
  };

  window.addEventListener("keydown", handler);
  return () =>
    window.removeEventListener("keydown", handler);
}, []);


  /* ================= RESIZE LOGIC ================= */
  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return;
      const percent = (e.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.min(75, Math.max(25, percent)));
    };

    const stop = () => (dragging.current = false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  /* ================= AUTO SCROLL PREVIEW ================= */
  useEffect(() => {
    if (!activeBlockId || !previewRef.current) return;

    const el = document.getElementById(
      `preview-${activeBlockId}`
    );

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeBlockId]);



  useEffect(() => {
  if (!lastSavedAt) return;

  const t = setInterval(() => {
    const diff = Math.floor(
      (Date.now() - lastSavedAt) / 1000
    );
    setSecondsAgo(diff);
  }, 1000);

  return () => clearInterval(t);
}, [lastSavedAt]);

useEffect(() => {
  if (!isSaving && !saveError) {
    setLastSavedAt(Date.now());
    setDirty(false);
  }
}, [isSaving, saveError, saveStatus]);





  /* ================= SCROLL SYNC ================= */
  const syncScroll = (from, to) => {
    if (!from || !to) return;

    const ratio =
      from.scrollTop /
      (from.scrollHeight - from.clientHeight);

    to.scrollTop =
      ratio *
      (to.scrollHeight - to.clientHeight);
  };

  const frameWidth =
    device === "mobile"
      ? 375
      : device === "tablet"
      ? 768
      : "100%";

      useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () =>
      window.removeEventListener("beforeunload", handler);
  }, [dirty]);


  return (
    <div className="space-y-3 relative">

      {lockedBy && (
  <div className="bg-red-100 text-red-800 px-4 py-2 text-sm">
    🔒 Locked by {lockedBy}
  </div>
)}

<div className="flex items-center gap-3 px-1">
  <span
  className={`
    text-xs px-2 py-1 rounded font-semibold
    ${
      workflow === "draft"
        ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300"
        : workflow === "published"
        ? "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300"
        : workflow === "scheduled"
        ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300"
        : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  `}
>
  Status: {workflow}
</span>


  {dirty && (
    <span className="text-xs text-orange-600">
      ● Unsaved changes
    </span>
  )}
</div>






      {/* ================= TAB BAR ================= */}
      <div className="flex flex-wrap gap-2 border-b pb-2">

        <TabButton
          active={tab === "editor"}
          onClick={() => setTab("editor")}
        >
          Editor
        </TabButton>

        <TabButton
          active={tab === "content-json"}
          onClick={() => setTab("content-json")}
        >
          Content JSON
        </TabButton>

        {role !== "editor" && (
          <TabButton
            active={tab === "bulk-json"}
            onClick={() => setTab("bulk-json")}
          >
            Bulk JSON
          </TabButton>
        )}

        {/* MOBILE TOGGLE */}
        <div className="ml-auto flex gap-2 lg:hidden">
          <button
            onClick={() => setMobileView("editor")}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            Editor
          </button>
          <button
            onClick={() => setMobileView("preview")}
            className="px-3 py-1 rounded bg-gray-600 text-white text-sm"
          >
            Preview
          </button>
        </div>
      </div>

      {/* ================= MAIN LAYOUT ================= */}
      <div className="flex h-[calc(100vh-170px)]">

        {/* ================= LEFT ================= */}
        {(mobileView === "editor" || isDesktop) && (
          <div
            ref={editorRef}
            onScroll={() =>
              syncScroll(
                editorRef.current,
                previewRef.current
              )
            }
            style={{ width: `${leftWidth}%` }}
            className="overflow-y-auto border-r p-3 bg-white dark:bg-gray-900"
          >
            {tab === "editor" && (
              <UniversalEditor
                value={value}
                onChange={onChange}
                onActiveChange={setActiveBlockId}
              />
            )}

            {tab === "content-json" && (
              <ContentJsonEditor
                value={value}
                onChange={onChange}
              />
            )}

            {tab === "bulk-json" &&
              role !== "editor" && (
                <BulkJsonEditor
                  value={documentValue}
                  onChange={onDocumentChange}
                />
              )}
          </div>
        )}

        {/* ================= RESIZER ================= */}
        <div
          className="hidden lg:block w-1 cursor-col-resize bg-gray-300 hover:bg-blue-500"
          onMouseDown={() =>
            (dragging.current = true)
          }
        />

        {/* ================= RIGHT ================= */}
        {(mobileView === "preview" || isDesktop) && (
          <div
            ref={previewRef}
            onScroll={() =>
              syncScroll(
                previewRef.current,
                editorRef.current
              )
            }
            style={{ width: `${100 - leftWidth}%` }}
            className="overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4"
          >
            {/* TOOLBAR */}
            <div className="flex gap-2 mb-3 text-xs justify-end">

              {/* 🔄 PREVIEW REFRESH INDICATOR */}
{previewLoading && (
  <div
    className="
      flex items-center gap-2
      px-3 py-1 rounded-full text-xs font-semibold
      bg-blue-100 text-blue-800
      dark:bg-blue-900/40 dark:text-blue-300
      border border-blue-200 dark:border-blue-800
      shadow-sm
      animate-pulse
    "
  >
    <span
      className="
        h-2 w-2 rounded-full
        bg-blue-600 dark:bg-blue-400
        animate-ping
      "
    />
    Refreshing preview
  </div>
)}


              <button
  className="px-2 py-1 rounded border
             bg-white dark:bg-gray-800
             text-gray-700 dark:text-gray-200
             border-gray-300 dark:border-gray-700
             hover:bg-gray-100 dark:hover:bg-gray-700"
  onClick={() => setPreviewZoom(0.8)}
>
  80%
</button>
<button
  className="px-2 py-1 rounded border
             bg-white dark:bg-gray-800
             text-gray-700 dark:text-gray-200
             border-gray-300 dark:border-gray-700
             hover:bg-gray-100 dark:hover:bg-gray-700"
  onClick={() => setPreviewZoom(1)}
>
  100%
</button>
<button
  className="px-2 py-1 rounded border
             bg-white dark:bg-gray-800
             text-gray-700 dark:text-gray-200
             border-gray-300 dark:border-gray-700
             hover:bg-gray-100 dark:hover:bg-gray-700"
  onClick={() => setPreviewZoom(1.2)}
>
  120%
</button>

              
              <button onClick={() => setDevice("desktop")}>🖥</button>
<button onClick={() => setDevice("tablet")}>📱</button>
<button onClick={() => setDevice("mobile")}>📱</button>

            </div>

            <div
              className="mx-auto border rounded-xl bg-white"
              style={{
                width: frameWidth,
                transform: `scale(${previewZoom})`,
                transformOrigin: "top center",
              }}
            >
              <PreviewErrorBoundary>
  <MemoPreview
    content={debouncedValue}
    activeBlockId={activeBlockId}
  />
</PreviewErrorBoundary>

            </div>
          </div>
        )}
      </div>

      {/* ================= SAVE STATUS ================= */}
<div className="fixed bottom-5 right-6 z-50 flex items-center gap-3">

  {/* ⏳ SPINNER */}
  {isSaving && (
    <div className="
      animate-spin h-4 w-4 rounded-full
      border-2
      border-blue-600 dark:border-blue-400
      border-t-transparent
    " />
  )}

  {/* STATUS BADGE */}
  <div
    className={`
      px-4 py-1.5 rounded-full shadow text-sm font-medium
      ring-1 ring-black/5 dark:ring-white/10
      ${
        saveError
          ? "bg-red-600 text-white"
          : isSaving
          ? "bg-yellow-400 text-black"
          : "bg-green-600 text-white"
      }
    `}
  >
    {saveError
      ? "Save failed ❌"
      : isSaving
      ? "Saving…"
      : saveStatus || "Saved ✓"}
  </div>

  {/* 🕒 LAST SAVED */}
  {lastSavedAt && !isSaving && !saveError && (
    <span className="
      text-xs font-medium
      text-gray-800 dark:text-gray-200
    ">
      🕒 Last saved {secondsAgo}s ago
    </span>
  )}

  {/* 🔁 RETRY BUTTON */}
  {saveError && (
    <button
      onClick={onSave}
      className="
        text-xs px-3 py-1 rounded
        border border-red-400
        text-red-700 dark:text-red-300
        bg-white dark:bg-gray-900
        hover:bg-red-50 dark:hover:bg-red-900/30
      "
    >
      🔁 Retry
    </button>
  )}
</div>



    </div>
  );
}

/* ================= TAB BUTTON ================= */

function TabButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`
        px-4 py-1.5 rounded-t-md
        text-sm font-medium transition
        ${
          active
            ? "bg-blue-600 text-white shadow"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }
      `}
    >
      {children}
    </button>
  );
}
