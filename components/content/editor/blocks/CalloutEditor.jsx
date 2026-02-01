"use client";

import { textarea, label } from "../editorStyles";

export default function CalloutEditor({ block, onChange }) {
  return (
    <div className="space-y-3 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>Callout type</label>

      {/* SELECT — keep light to avoid OS dropdown bug */}
      <select
        className="
          w-full px-3 py-2 rounded-md border
          bg-white text-gray-900 border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        value={block.variant || "info"}
        onChange={(e) =>
          onChange({ ...block, variant: e.target.value })
        }
      >
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="danger">Danger</option>
      </select>

      <textarea
        className={textarea}
        value={block.content || ""}
        placeholder="Callout text"
        onChange={(e) =>
          onChange({ ...block, content: e.target.value })
        }
      />
    </div>
  );
}
