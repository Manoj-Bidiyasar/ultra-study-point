"use client";

import UniversalEditor from "../UniversalEditor";
import { input, label } from "../editorStyles";

export default function SectionEditor({ block, onChange }) {
  const update = (key, value) =>
    onChange({ ...block, [key]: value });

  return (
    <div className="space-y-4 border border-gray-400 p-4 rounded-md bg-white">

      {/* SECTION TITLE */}
      <div>
        <label className={label}>Section title</label>
        <input
          className={input}
          value={block.title || ""}
          placeholder="Example: Inflation"
          onChange={(e) =>
            update("title", e.target.value)
          }
        />
      </div>

      {/* SECTION SUBTITLE */}
      <div>
        <label className={label}>Subtitle (optional)</label>
        <input
          className={input}
          value={block.subtitle || ""}
          placeholder="Economy | GS-III"
          onChange={(e) =>
            update("subtitle", e.target.value)
          }
        />
      </div>

      <div>
        <label className={label}>Section theme</label>
        <select
          className={input}
          value={block.tone || "simple"}
          onChange={(e) => update("tone", e.target.value)}
        >
          <option value="simple">Simple (Default)</option>
          <option value="blue">Light Blue</option>
          <option value="red">Classic Red</option>
        </select>
      </div>

      {/* NESTED BLOCK EDITOR */}
      <div className="border-t pt-4">
        <UniversalEditor
          value={{
            version: 1,
            blocks: block.blocks || [],
          }}
          onChange={(val) =>
            update("blocks", val.blocks)
          }
        />
      </div>
    </div>
  );
}
