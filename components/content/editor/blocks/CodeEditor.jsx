"use client";

import { input, textarea, label } from "../editorStyles";

export default function CodeEditor({ block, onChange }) {
  return (
    <div className="space-y-3 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>Language</label>

      <input
        className={`${input} font-mono`}
        value={block.language || ""}
        placeholder="e.g. javascript, python, html"
        onChange={(e) =>
          onChange({
            ...block,
            language: e.target.value
              .toLowerCase()
              .trim(),
          })
        }
      />

      <label className={label}>Code</label>

      <textarea
        className={`${textarea} font-mono text-sm min-h-[160px]`}
        value={block.code || ""}
        placeholder="Write your code here..."
        spellCheck={false}
        onChange={(e) =>
          onChange({
            ...block,
            code: e.target.value,
          })
        }
      />
    </div>
  );
}
