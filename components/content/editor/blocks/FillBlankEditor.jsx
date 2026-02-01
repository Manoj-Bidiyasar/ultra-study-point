"use client";

import { textarea, input, label } from "../editorStyles";

function countBlanks(text) {
  return (text.match(/____+/g) || []).length;
}

export default function FillBlankEditor({ block, onChange }) {
  const blankCount = countBlanks(block.question || "");

  const answers = Array.from(
    { length: blankCount },
    (_, i) => block.answers?.[i] || ""
  );

  const updateAnswer = (i, value) => {
    const copy = [...answers];
    copy[i] = value;
    onChange({ ...block, answers: copy });
  };

  return (
    <div className="space-y-3 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>
        Question (use ____ for blanks)
      </label>

      <textarea
        className={textarea}
        value={block.question || ""}
        placeholder="The capital of India is ____."
        onChange={(e) =>
          onChange({ ...block, question: e.target.value })
        }
      />

      {blankCount > 0 && (
        <div className="space-y-2">
          <label className={label}>
            Correct Answers
          </label>

          {answers.map((ans, i) => (
            <input
              key={i}
              className={input}
              placeholder={`Answer ${i + 1}`}
              value={ans}
              onChange={(e) =>
                updateAnswer(i, e.target.value)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
