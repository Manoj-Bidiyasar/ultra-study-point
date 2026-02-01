"use client";

import { textarea, label } from "../editorStyles";

export default function MarkdownEditor({ block, onChange }) {
  return (
    <div className="space-y-2 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>
        Markdown content
      </label>

      <textarea
        className={`${textarea} font-mono min-h-[220px]`}
        value={block.content || ""}
        placeholder="Write markdown here..."
        onChange={(e) =>
          onChange({
            ...block,
            content: e.target.value,
          })
        }
      />
    </div>
  );
}
