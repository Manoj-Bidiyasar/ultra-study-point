"use client";

import { input, label } from "../editorStyles";

export default function PdfEditor({ block, onChange }) {
  const update = (key, value) =>
    onChange({ ...block, [key]: value });

  return (
    <div className="space-y-3 border border-gray-300 p-4 rounded-md bg-white">

      {/* TITLE */}
      <div>
        <label className={label}>PDF title</label>
        <input
          className={input}
          placeholder="Example: Polity NCERT Chapter 1"
          value={block.title || ""}
          onChange={(e) =>
            update("title", e.target.value)
          }
        />
      </div>

      {/* URL */}
      <div>
        <label className={label}>PDF URL</label>
        <input
          className={input}
          placeholder="https://..."
          value={block.url || ""}
          onChange={(e) =>
            update("url", e.target.value)
          }
        />
      </div>

      {/* MODE */}
      <div>
        <label className={label}>Display mode</label>
        <select
          className={input}
          value={block.mode || "embed"}
          onChange={(e) =>
            update("mode", e.target.value)
          }
        >
          <option value="embed">Embed viewer</option>
          <option value="link">Download only</option>
        </select>
      </div>

      {/* PAGE + ZOOM */}
      <div className="grid grid-cols-2 gap-3">

        <div>
          <label className={label}>Start page</label>
          <input
            type="number"
            min="1"
            className={input}
            value={block.page || 1}
            onChange={(e) =>
              update("page", Number(e.target.value))
            }
          />
        </div>

        <div>
          <label className={label}>Zoom (%)</label>
          <input
            type="number"
            min="50"
            max="200"
            className={input}
            value={block.zoom || 100}
            onChange={(e) =>
              update("zoom", Number(e.target.value))
            }
          />
        </div>

      </div>

      {/* FIREBASE UPLOAD (optional) */}
      <p className="text-xs text-gray-600">
        Tip: Upload PDFs to Firebase Storage for best performance.
      </p>
    </div>
  );
}
