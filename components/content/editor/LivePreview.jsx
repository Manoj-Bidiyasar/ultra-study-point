"use client";

import { useEffect, useRef } from "react";
import UniversalRenderer from "../renderer/UniversalRenderer";

/**
 * LivePreview
 * ----------------------------------
 * Real-time preview renderer.
 *
 * Uses SAME renderer as public pages.
 *
 * Features:
 * ✅ auto-scroll anchor support
 * ✅ active block highlight
 * ✅ smooth focus animation
 * ✅ preview zoom compatibility
 * ✅ device frame compatibility
 *
 * ❌ no editor logic
 * ❌ no mutation
 * ❌ no preview-only formatting
 */
export default function LivePreview({
  content,
  activeBlockId,
}) {
  const containerRef = useRef(null);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (!activeBlockId) return;

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

  if (!content || !Array.isArray(content.blocks)) {
    return (
      <div className="p-6 text-sm text-gray-500 italic">
        Nothing to preview yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border rounded-lg p-6 bg-white space-y-4"
    >
      {content.blocks.map((block, index) => (
        <div
          key={block.id || index}
          id={`preview-${block.id}`}
          className={`
            transition-all duration-300
            ${
              block.id === activeBlockId
                ? "ring-2 ring-blue-500 bg-blue-50/40 rounded-lg p-2"
                : ""
            }
          `}
        >
          <UniversalRenderer blocks={[block]} />
        </div>
      ))}
    </div>
  );
}
