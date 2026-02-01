"use client";

import { input, textarea, label } from "../editorStyles";

export default function MathStepsEditor({ block, onChange }) {
  const steps = block.steps || [];

  const updateStep = (i, value) => {
    const copy = [...steps];
    copy[i] = value;
    onChange({ ...block, steps: copy });
  };

  const addStep = () => {
    onChange({
      ...block,
      steps: [...steps, ""],
    });
  };

  const removeStep = (i) => {
    const copy = [...steps];
    copy.splice(i, 1);
    onChange({ ...block, steps: copy });
  };

  return (
    <div className="space-y-3">

      <label className={label}>Derivation title</label>

      <input
        className={input}
        value={block.title || ""}
        placeholder="Example: Derivative of sin x"
        onChange={(e) =>
          onChange({
            ...block,
            title: e.target.value,
          })
        }
      />

      <label className={label}>Steps</label>

      {steps.map((step, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            className={textarea}
            value={step}
            placeholder={`Step ${i + 1}`}
            onChange={(e) =>
              updateStep(i, e.target.value)
            }
          />

          <button
            onClick={() => removeStep(i)}
            className="px-2 border rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={addStep}
        className="px-3 py-1 border rounded hover:bg-gray-100"
      >
        + Add Step
      </button>
    </div>
  );
}
