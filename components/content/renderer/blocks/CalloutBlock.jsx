"use client";

export default function CalloutBlock({ block }) {
  if (!block) return null;

  const type = block.variant || "info";

  const colors = {
    info:
      "bg-blue-50 border-blue-400 text-blue-900",

    success:
      "bg-emerald-50 border-emerald-400 text-emerald-900",

    warning:
      "bg-amber-50 border-amber-400 text-amber-900",

    danger:
      "bg-rose-50 border-rose-400 text-rose-900",
  };

  return (
    <div
      className={`border-l-4 p-4 my-4 rounded-md ${colors[type]}`}
    >
      {block.title && (
        <p className="font-semibold mb-1">
          {block.title}
        </p>
      )}

      <div className="text-sm leading-relaxed whitespace-pre-line">
        {block.content}
      </div>
    </div>
  );
}
