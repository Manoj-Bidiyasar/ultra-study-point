"use client";

import renderBlock from "../renderBlock";

export default function SectionBlock({ block }) {
  if (!block) return null;

  return (
    <section className="my-8">

      {/* TITLE */}
      {block.title && (
        <h2 className="text-xl font-bold mb-1">
          {block.title}
        </h2>
      )}

      {/* SUBTITLE */}
      {block.subtitle && (
        <div className="text-sm text-gray-600 mb-4">
          {block.subtitle}
        </div>
      )}

      {/* INNER BLOCKS */}
      <div className="space-y-4">
        {(block.blocks || []).map(
          (child, i) =>
            renderBlock(child, i)
        )}
      </div>
    </section>
  );
}
