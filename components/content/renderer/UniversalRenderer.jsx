"use client";

import renderBlock from "./renderBlock";

/**
 * UniversalRenderer
 * ----------------------
 * Pure content renderer.
 *
 * - same renderer for:
 *   notes
 *   current affairs
 *   articles
 *   preview
 *   PDF export
 *
 * ❌ no mode
 * ❌ no role
 * ❌ no editor logic
 */
export default function UniversalRenderer({ blocks }) {
  if (!Array.isArray(blocks)) return null;

  return (
    <div className="prose max-w-none">
      {blocks.map((block, index) =>
        renderBlock(block, index)
      )}
    </div>
  );
}
