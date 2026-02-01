"use client";

import { useEffect, useState } from "react";
import {
  input,
  textarea,
  label,
  checkbox,
  optionRow,
} from "../editorStyles";
import McqBlock from "@/components/content/renderer/blocks/McqBlock";

export default function McqEditor({ block, onChange }) {
  const update = (key, value) =>
    onChange({ ...block, [key]: value });

  const [previewReveal, setPreviewReveal] =
    useState(false);

  /* ======================================================
     NORMALIZE OPTIONS (legacy safe)
  ====================================================== */

  useEffect(() => {
    const fixed = (block.options || []).map(
      (opt, i) => ({
        id: opt?.id ?? `opt-${i}`,
        text:
          typeof opt === "string"
            ? opt
            : opt?.text ?? "",
      })
    );

    if (
      JSON.stringify(fixed) !==
      JSON.stringify(block.options)
    ) {
      onChange({
        ...block,
        options: fixed,
      });
    }
  }, [block.options]);

  /* ======================================================
     AUTO-FIX SINGLE CORRECT
  ====================================================== */

  useEffect(() => {
    if (
      block.mode === "single" &&
      block.correct?.length > 1
    ) {
      onChange({
        ...block,
        correct: block.correct.slice(0, 1),
      });
    }
  }, [block.mode]);

  /* ======================================================
     RESET PREVIEW ON CONTENT CHANGE
  ====================================================== */

  useEffect(() => {
    setPreviewReveal(false);
  }, [
    block.question,
    block.options,
    block.correct,
  ]);

  /* ======================================================
     HANDLERS
  ====================================================== */

  const updateOption = (index, text) => {
    const copy = [...block.options];
    copy[index] = {
      ...copy[index],
      text,
    };
    update("options", copy);
  };

  const toggleCorrect = (id) => {
    let updated = [...(block.correct || [])];

    if (block.mode === "single") {
      updated = [id];
    } else {
      updated.includes(id)
        ? (updated = updated.filter(
            (x) => x !== id
          ))
        : updated.push(id);
    }

    update("correct", updated);
  };

  return (
    <div className="space-y-4">

      {/* QUESTION */}
      <div>
        <label className={label}>Question</label>
        <textarea
          className={textarea}
          placeholder="Supports LaTeX"
          value={block.question || ""}
          onChange={(e) =>
            update("question", e.target.value)
          }
        />
      </div>

      {/* ANSWER MODE */}
      <div>
        <label className={label}>
          Answer type
        </label>

        <select
          className={input}
          value={block.mode}
          onChange={(e) =>
            update("mode", e.target.value)
          }
        >
          <option value="single">
            Single correct
          </option>
          <option value="multi">
            Multiple correct
          </option>
        </select>
      </div>

      {/* OPTIONS */}
      <div>
        <label className={label}>
          Options
        </label>

        {block.options?.map((opt, i) => (
          <div
            key={opt.id}
            className={optionRow}
          >
            <input
              type="checkbox"
              className={checkbox}
              checked={block.correct?.includes(
                opt.id
              )}
              onChange={() =>
                toggleCorrect(opt.id)
              }
            />

            <textarea
              className={textarea}
              rows={2}
              placeholder={`Option ${
                i + 1
              }`}
              value={opt.text}
              onChange={(e) =>
                updateOption(
                  i,
                  e.target.value
                )
              }
            />
          </div>
        ))}
      </div>

      {/* ANSWER VISIBILITY */}
      <div className="border rounded p-3 space-y-2">
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            className={checkbox}
            checked={block.revealAnswer ?? false}
            onChange={(e) =>
              update(
                "revealAnswer",
                e.target.checked
              )
            }
          />
          Show correct answer
        </label>

        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            className={checkbox}
            checked={
              block.revealExplanation ??
              false
            }
            onChange={(e) =>
              update(
                "revealExplanation",
                e.target.checked
              )
            }
          />
          Show explanation
        </label>
      </div>

      {/* EXPLANATION */}
      <div>
        <label
          className={`${label} text-gray-700 dark:text-gray-300`}
        >
          Explanation (optional)
        </label>

        <textarea
          className={textarea}
          placeholder="LaTeX supported"
          value={block.explanation || ""}
          onChange={(e) =>
            update(
              "explanation",
              e.target.value
            )
          }
        />
      </div>

      {/* PREVIEW MODE */}
      <div className="border rounded p-3 space-y-3 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium ">
            Preview MCQ
          </span>

          <button
            type="button"
            onClick={() =>
              setPreviewReveal((s) => !s)
            }
            className="text-sm text-blue-600 underline"
          >
            {previewReveal
              ? "Hide answer"
              : "Show answer"}
          </button>
        </div>

        <McqBlock
          key={
            previewReveal
              ? "preview-on"
              : "preview-off"
          }
          block={{
            ...block,
            revealAnswer: previewReveal,
            revealExplanation: previewReveal,
          }}
          mode="study"
          showNumber={false}
        />
      </div>
    </div>
  );
}
