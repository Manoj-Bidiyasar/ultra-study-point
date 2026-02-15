"use client";

import renderBlock from "../renderBlock";

export default function SectionBlock({ block, context }) {
  if (!block) return null;

  const isDailyPage = context?.pageType === "daily";
  const isMonthlyPage = context?.pageType === "monthly";
  const tone =
    block.tone ||
    (isDailyPage ? "blue" : isMonthlyPage ? "red" : "simple");
  const useStyledCard =
    (isDailyPage || isMonthlyPage) &&
    (tone === "blue" || tone === "red");

  if (!useStyledCard) {
    return (
      <section className="my-8">
        {block.title && (
          <h2 className="text-xl font-bold mb-1">
            {block.title}
          </h2>
        )}

        {block.subtitle && (
          <div className="text-sm text-gray-600 mb-4">
            {block.subtitle}
          </div>
        )}

        <div className="space-y-4">
          {(block.blocks || []).map((child, i) =>
            renderBlock(child, i, context)
          )}
        </div>
      </section>
    );
  }

  const toneClasses =
    tone === "red"
      ? {
          shell: "border-red-200 bg-red-50/30",
          titleBar: "bg-red-100 text-red-900",
          subtitle: "text-red-700/80",
          body: "[&_li::marker]:text-red-500",
        }
      : {
          shell: "border-blue-200 bg-blue-50/30",
          titleBar: "bg-blue-100 text-blue-900",
          subtitle: "text-blue-700/80",
          body: "[&_li::marker]:text-blue-500",
        };

  return (
    <section className={`my-6 overflow-hidden rounded-xl border ${toneClasses.shell}`}>

      {/* TITLE */}
      {block.title && (
        <h2 className={`px-4 py-2 text-lg md:text-xl font-bold ${toneClasses.titleBar}`}>
          {block.title}
        </h2>
      )}

      <div className={`px-4 py-4 md:py-5 ${toneClasses.body}`}>
        {/* SUBTITLE */}
        {block.subtitle && (
          <div className={`text-sm mb-3 ${toneClasses.subtitle}`}>
            {block.subtitle}
          </div>
        )}

        {/* INNER BLOCKS */}
        <div className="space-y-3 md:space-y-4">
          {(block.blocks || []).map((child, i) =>
            renderBlock(child, i, context)
          )}
        </div>
      </div>
    </section>
  );
}
