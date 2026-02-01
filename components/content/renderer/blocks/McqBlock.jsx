"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useExamSection } from "@/components/content/exam/ExamSectionContext";
import "katex/dist/katex.min.css";

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function McqBlock({
  block,
  mode = "study",
  index = 0,
  showNumber = false,
}) {
  const exam = useExamSection();
  const isStudy = mode === "study";

  const [selected, setSelected] = useState([]);
  const [locked, setLocked] = useState(false);
  const [showExplanation, setShowExplanation] =
    useState(false);

  /* ======================================================
     SHUFFLE OPTIONS (EXAM ONLY)
  ====================================================== */

  const options = useMemo(() => {
    if (mode === "exam")
      return shuffle(block.options || []);
    return block.options || [];
  }, [block.options, mode]);

  /* ======================================================
     LOCK ON SUBMIT
  ====================================================== */

  useEffect(() => {
    if (exam?.submitted) {
      setLocked(true);
    }
  }, [exam?.submitted]);

  /* ======================================================
     FINAL VISIBILITY RULES
  ====================================================== */

  const showCorrect =
    exam?.submitted ||
    locked ||
    block.revealAnswer === true;

  const showExplanationContent =
    showCorrect &&
    block.revealExplanation === true &&
    block.explanation;

  /* ======================================================
     SELECTION LOGIC
  ====================================================== */

  const toggleOption = (id) => {
    if (locked || exam?.submitted) return;

    if (block.mode === "multi") {
      setSelected((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
      );
    } else {
      setSelected([id]);
      if (!isStudy) setLocked(true);
    }
  };

  return (
    <div className="border rounded-lg p-4 my-4 space-y-3">

      {/* QUESTION */}
      <div className="flex gap-2 font-medium">
        {showNumber && (
          <span>Q{index + 1}.</span>
        )}

        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {block.question || ""}
        </ReactMarkdown>
      </div>

      {/* OPTIONS */}
      <ul className="space-y-2">
        {options.map((opt) => {
          const id = opt.id;
          const selectedNow =
            selected.includes(id);
          const isCorrect =
            block.correct?.includes(id);

          let bg = "transparent";

          if (selectedNow)
            bg = "rgba(59,130,246,.12)";

          if (showCorrect && isCorrect)
            bg = "rgba(34,197,94,.18)";

          if (
            showCorrect &&
            selectedNow &&
            !isCorrect
          )
            bg = "rgba(239,68,68,.18)";

          return (
            <li
              key={id}
              onClick={() =>
                toggleOption(id)
              }
              style={{
                background: bg,
                padding: "10px",
                borderRadius: 6,
                cursor: "pointer",
                border:
                  "1px solid var(--border)",
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {opt.text || ""}
              </ReactMarkdown>
            </li>
          );
        })}
      </ul>

      {/* SHOW ANSWER BUTTON */}
      {!showCorrect &&
        block.revealAnswer && (
          <button
            onClick={() => setLocked(true)}
            className="text-sm text-blue-600 underline"
          >
            Show answer
          </button>
        )}

      {/* EXPLANATION */}
      {showExplanationContent && (
        <div>
          <button
            className="text-blue-600 underline text-sm"
            onClick={() =>
              setShowExplanation(
                (s) => !s
              )
            }
          >
            {showExplanation
              ? "Hide explanation"
              : "Show explanation"}
          </button>

          {showExplanation && (
            <div className="mt-2 p-3 rounded bg-blue-50 border-l-4 border-blue-500">
              <ReactMarkdown
                remarkPlugins={[
                  remarkMath,
                ]}
                rehypePlugins={[
                  rehypeKatex,
                ]}
              >
                {block.explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
