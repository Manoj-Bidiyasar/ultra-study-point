"use client";

import { input, label } from "../editorStyles";

export default function HeadingEditor({ block, onChange }) {
  return (
    <div className="space-y-3 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>Heading text</label>

      <input
        className={input}
        value={block.text || ""}
        placeholder="Enter heading text"
        onChange={(e) =>
          onChange({ ...block, text: e.target.value })
        }
      />

      <label className={label}>Heading level</label>

      <select
        className="
          w-full px-3 py-2 rounded-md border
          bg-white text-gray-900 border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        value={block.level || 2}
        onChange={(e) =>
          onChange({
            ...block,
            level: Number(e.target.value),
          })
        }
      >
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            H{n}
          </option>
        ))}
      </select>
    </div>
  );
}
