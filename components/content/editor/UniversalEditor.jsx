"use client";

import { useEffect, useState, useRef } from "react";
import { BLOCK_REGISTRY, createBlock } from "../schema/blockRegistry";

import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { getBlockLabel } from "./getBlockLabel";
import { BLOCK_EDITORS } from "../registry/blockComponents";

/* ======================================================
   SORTABLE ITEM
====================================================== */
function SortableItem({ id, children }) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging,
  } = useSortable({
    id,
    activationConstraint: { distance: 5 },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        dragHandleProps: {
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        },
      })}
    </div>
  );
}

/* ======================================================
   ICON BUTTON
====================================================== */
function IconButton({ title, color, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        px-2 py-1.5 rounded-md text-lg font-bold
        transition hover:scale-110
        ${color}
        hover:bg-gray-100 dark:hover:bg-gray-800
      `}
    >
      {children}
    </button>
  );
}

/* ======================================================
   UNIVERSAL EDITOR
====================================================== */
export default function UniversalEditor({
  value,
  onChange,
  onActiveChange,
}) {
  const [blocks, setBlocks] = useState(value?.blocks || []);
  const [activeId, setActiveId] = useState(null);
  const [showAddBlocks, setShowAddBlocks] = useState(false);
  



  /* ================= HISTORY ================= */
  const history = useRef([]);
  const future = useRef([]);

  /* sync external value */
  useEffect(() => {
  if (!Array.isArray(value?.blocks)) return;

  setBlocks(value.blocks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);




  /* emit JSON */
  useEffect(() => {
    onChange?.({ version: 1, blocks });
  }, [blocks]);

  /* ================= UNDO / REDO ================= */
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        if (!history.current.length) return;

        const prev = history.current.pop();
        future.current.push(blocks);
        setBlocks(prev);
      }

      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        if (!future.current.length) return;

        const next = future.current.pop();
        history.current.push(blocks);
        setBlocks(next);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [blocks]);

  /* ================= STATE WRAPPER ================= */
  const commit = (next) => {
    history.current.push(blocks);
    future.current = [];
    setBlocks(next);
  };

  /* ================= ACTIONS ================= */

  const addBlock = (type) =>
    commit([...blocks, createBlock(type)]);

  const updateBlock = (i, b) => {
    const copy = [...blocks];
    copy[i] = b;
    commit(copy);
  };

  const removeBlock = (i) => {
    const copy = [...blocks];
    copy.splice(i, 1);
    commit(copy);
  };

  const duplicateBlock = (i) => {
    const clone = structuredClone(blocks[i]);
    clone.id = crypto.randomUUID();

    commit([
      ...blocks.slice(0, i + 1),
      clone,
      ...blocks.slice(i + 1),
    ]);
  };

  const moveBlock = (from, to) => {
    if (to < 0 || to >= blocks.length) return;
    commit(arrayMove(blocks, from, to));
  };

  const toggleCollapse = (i) => {
    const copy = [...blocks];
    copy[i].__collapsed = !copy[i].__collapsed;
    commit(copy);
  };

  const togglePin = (i) => {
    const copy = [...blocks];
    copy[i].__pinned = !copy[i].__pinned;
    commit(copy);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(
      (b) => b.id === active.id
    );
    const newIndex = blocks.findIndex(
      (b) => b.id === over.id
    );

    commit(arrayMove(blocks, oldIndex, newIndex));
  };







  /* ================= PIN ORDER ================= */
  const orderedBlocks = [
    ...blocks.filter((b) => b.__pinned),
    ...blocks.filter((b) => !b.__pinned),
  ];

  /* ================= RENDER ================= */

/* ================= RENDER ================= */

return (
  <div className="space-y-6 text-gray-900 dark:text-gray-100">

    {/* ================= ADD BLOCK PANEL ================= */}
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b pb-2">

      {/* TOGGLE */}
      <button
        onClick={() => setShowAddBlocks(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 px-2 py-1 hover:underline"
      >
        {showAddBlocks ? "▼" : "▶"} Add blocks
      </button>

      {/* BUTTONS */}
      {showAddBlocks && (
  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
    {Object.entries(BLOCK_REGISTRY).map(([type, def]) => (
      <button
        key={type}
        onClick={() => addBlock(type)}
        className="
          px-2 py-1.5 text-xs rounded-md border
          bg-blue-50 dark:bg-gray-800
          border-blue-200 dark:border-gray-700
          text-blue-800 dark:text-blue-200
          hover:bg-blue-100 dark:hover:bg-gray-700
          transition
        "
      >
        + {def.label}
      </button>
    ))}
  </div>
)}
</div>

    {/* ================= BLOCK LIST ================= */}

    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={orderedBlocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        {orderedBlocks.map((block) => {
          const Editor = BLOCK_EDITORS[block.type];

          const realIndex = blocks.findIndex(
            (b) => b.id === block.id
          );

          const isActive = activeId === block.id;

          return (
            <SortableItem key={block.id} id={block.id}>
              {({ dragHandleProps }) => (
                <div
                  onClick={() => {
                    setActiveId(block.id);
                    onActiveChange?.(block.id);
                  }}
                  className={`
                    border rounded-xl p-5 shadow-sm 
                    bg-white dark:bg-gray-900 cursor-pointer
                    ${
                      isActive
                        ? "ring-2 ring-blue-500"
                        : "border-gray-300 dark:border-gray-700"
                    }
                  `}
                >
                {/* HEADER */}
<div className="flex justify-between items-center mb-2">

  {/* LEFT SIDE */}
  <div className="flex items-center gap-2 text-sm min-w-0">

    {/* drag handle */}
    <span
      {...dragHandleProps}
      className="cursor-grab text-xl opacity-70 select-none"
    >
      ☰
    </span>

    {/* collapse arrow */}
    <span className="opacity-60">
      {block.__collapsed ? "▶" : "▼"}
    </span>

    {/* block type */}
    <span className="font-semibold whitespace-nowrap">
      {BLOCK_REGISTRY[block.type]?.label || block.type}
    </span>


{/* editable block title */}
<input
  value={block.__ui?.label || ""}
  placeholder={getBlockLabel(block) || "Title…"}
  onClick={(e) => e.stopPropagation()}
  onChange={(e) =>
    updateBlock(realIndex, {
      ...block,
      __ui: {
        ...block.__ui,
        label: e.target.value,
      },
    })
  }
  className="
    bg-transparent border-none outline-none
    text-sm font-medium
    text-gray-800 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    max-w-[320px]
    truncate
  "
/>

  </div>

  {/* RIGHT ACTIONS */}
  <div className="flex gap-1">
    <IconButton title="Pin" color="text-orange-600" onClick={() => togglePin(realIndex)}>📌</IconButton>
    <IconButton title="Up" color="text-indigo-600" onClick={() => moveBlock(realIndex, realIndex - 1)}>↑</IconButton>
    <IconButton title="Down" color="text-indigo-600" onClick={() => moveBlock(realIndex, realIndex + 1)}>↓</IconButton>
    <IconButton title="Duplicate" color="text-green-600" onClick={() => duplicateBlock(realIndex)}>⧉</IconButton>

    <IconButton
      title="Collapse"
      color="text-yellow-600"
      onClick={() => toggleCollapse(realIndex)}
    >
      {block.__collapsed ? "▶" : "▼"}
    </IconButton>

    <IconButton title="Delete" color="text-red-600" onClick={() => removeBlock(realIndex)}>✕</IconButton>
  </div>

</div>



{/* OPTIONAL EDITOR-ONLY BLOCK TITLE */}






                    

                  {!block.__collapsed && Editor && (
                    <Editor
                      block={block}
                      onChange={(b) =>
                        updateBlock(realIndex, b)
                      }
                    />
                  )}
                </div>
              )}
            </SortableItem>
          );
        })}
      </SortableContext>
    </DndContext>
      

  </div>
);
}

/* ====================================================== */
// keep file local functions minimal
