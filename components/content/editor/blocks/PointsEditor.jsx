"use client";

import {
  textarea,
  label,
  input,
} from "../editorStyles";

export default function PointsEditor({ block, onChange }) {
  const update = (key, value) =>
    onChange({ ...block, [key]: value });

  return (
    <div className="space-y-3 border border-gray-300 p-4 rounded-md bg-white">

      {/* STYLE */}
      <div>
        <label className={label}>
          Point style
        </label>

        <select
          className={input}
          value={block.style || "bullet"}
          onChange={(e) =>
            update("style", e.target.value)
          }
        >
          {/* SYMBOL */}
          <optgroup label="Symbol bullets">
            <option value="bullet">● Filled circle</option>
            <option value="circle">○ Hollow circle</option>
            <option value="square">■ Square</option>
            <option value="triangle">▲ Triangle</option>
            <option value="thumb">👍 Thumb</option>
          </optgroup>

          {/* NUMERIC */}
          <optgroup label="Numeric">
            <option value="number">1. Number</option>
          </optgroup>

          {/* ALPHABET */}
          <optgroup label="Alphabetical">
            <option value="alpha_upper">A. Upper (A, B)</option>
            <option value="alpha_lower">a. Lower (a, b)</option>
            <option value="alpha_bracket">a) Lower bracket</option>
          </optgroup>

          {/* ROMAN */}
          <optgroup label="Roman numerals">
            <option value="roman_upper">I. Upper Roman</option>
            <option value="roman_lower">i. Lower Roman</option>
          </optgroup>
        </select>
      </div>

      {/* ITEMS */}
      <div>
        <label className={label}>
          Points (one per line)
        </label>

        <textarea
          className={`${textarea} min-h-[150px] font-mono`}
          placeholder={`Example:
Fundamental Rights
Directive Principles
Fundamental Duties`}
          value={(block.items || []).join("\n")}
          onChange={(e) =>
            update(
              "items",
              e.target.value.split("\n")
            )
          }
        />
      </div>
    </div>
  );
}
