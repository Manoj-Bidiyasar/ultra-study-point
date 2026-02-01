"use client";

import {
  textarea,
  label,
  checkbox,
  optionRow,
} from "../editorStyles";

export default function OneLinerEditor({ block, onChange }) {
  return (
    <div className="space-y-3 border border-gray-300 p-4 rounded-md bg-white">

      {/* QUESTION */}
      <div>
        <label className={label}>
          Question (LaTeX supported)
        </label>

        <textarea
          className={`${textarea} min-h-[80px]`}
          placeholder="Example: Find $\\frac{d}{dx}(x^2)$"
          value={block.question || ""}
          onChange={(e) =>
            onChange({
              ...block,
              question: e.target.value,
            })
          }
        />
      </div>

      {/* ANSWER */}
      <div>
        <label className={label}>
          Answer (LaTeX supported)
        </label>

        <textarea
          className={`${textarea} min-h-[70px]`}
          placeholder="Example: $2x$"
          value={block.answer || ""}
          onChange={(e) =>
            onChange({
              ...block,
              answer: e.target.value,
            })
          }
        />
      </div>

      {/* REVEAL TOGGLE */}
      <label className={optionRow}>
        <input
          type="checkbox"
          className={checkbox}
          checked={block.revealAnswer !== false}
          onChange={(e) =>
            onChange({
              ...block,
              revealAnswer: e.target.checked,
            })
          }
        />
        Require click to reveal answer
      </label>
    </div>
  );
}
