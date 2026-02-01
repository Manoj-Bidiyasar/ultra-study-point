"use client";

import { useState } from "react";

export default function FillBlankBlock({ block }) {
  const parts = (block.question || "").split(/____+/g);
  const blankCount = parts.length - 1;

  const [inputs, setInputs] = useState(
    Array(blankCount).fill("")
  );

  const [checked, setChecked] = useState(false);

  const update = (i, value) => {
    const copy = [...inputs];
    copy[i] = value;
    setInputs(copy);
  };

  const evaluate = () => {
    setChecked(true);
  };

  return (
    <div className="my-4 p-4 rounded-md border border-gray-300 bg-white">

      <p className="mb-3 text-gray-900 leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blankCount && (
              <input
                value={inputs[i]}
                onChange={(e) =>
                  update(i, e.target.value)
                }
                className="
                  inline-block mx-1 px-2 py-1 w-28
                  border-b-2 border-gray-500
                  bg-transparent outline-none
                  focus:border-blue-600
                "
              />
            )}
          </span>
        ))}
      </p>

      {!checked && (
        <button
          onClick={evaluate}
          className="mt-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Check Answer
        </button>
      )}

      {checked && (
        <div className="mt-3 space-y-1 text-sm">
          {block.answers?.map((ans, i) => {
            const correct =
              inputs[i]?.trim().toLowerCase() ===
              ans?.trim().toLowerCase();

            return (
              <div
                key={i}
                className={
                  correct
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                Blank {i + 1}:{" "}
                {correct
                  ? "Correct"
                  : `Correct answer: ${ans}`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
