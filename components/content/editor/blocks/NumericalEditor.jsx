"use client";

import { input, textarea, label } from "../editorStyles";

export default function NumericalEditor({ block, onChange }) {
  return (
    <div className="space-y-3 border border-gray-300 p-4 rounded-md bg-white">

      <label className={label}>
        Question (supports LaTeX)
      </label>

      <textarea
        className={`${textarea} min-h-[90px]`}
        placeholder="Example: Find the kinetic energy when $m=2\,kg$ and $v=3\,m/s$"
        value={block.question || ""}
        onChange={(e) =>
          onChange({
            ...block,
            question: e.target.value,
          })
        }
      />

      <div className="grid grid-cols-2 gap-3">

        <div>
          <label className={label}>
            Correct answer
          </label>

          <input
            className={input}
            placeholder="e.g. 9"
            value={block.answer || ""}
            onChange={(e) =>
              onChange({
                ...block,
                answer: e.target.value,
              })
            }
          />
        </div>

        <div>
          <label className={label}>
            Unit (LaTeX supported)
          </label>

          <input
            className={input}
            placeholder="e.g. m/s^2 or kg·m^{-1}"
            value={block.unit || ""}
            onChange={(e) =>
              onChange({
                ...block,
                unit: e.target.value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
