"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function OneLinerBlock({ block }) {
  const [show, setShow] = useState(
    block.revealAnswer === false
  );

  return (
    <div className="border border-gray-300 p-4 my-4 rounded bg-gray-50">

      {/* QUESTION */}
      {block.question && (
        <div className="font-medium text-gray-900">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {`Q. ${block.question}`}
          </ReactMarkdown>
        </div>
      )}

      {/* ANSWER BUTTON */}
      {block.answer &&
        block.revealAnswer !== false && (
          <button
            onClick={() => setShow(!show)}
            className="mt-3 px-3 py-1 border rounded text-sm bg-white hover:bg-gray-100"
          >
            {show ? "Hide Answer" : "Show Answer"}
          </button>
        )}

      {/* ANSWER */}
      {block.answer &&
        (block.revealAnswer === false ||
          show) && (
          <div className="mt-3 text-green-700 font-medium">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {`Ans: ${block.answer}`}
            </ReactMarkdown>
          </div>
        )}
    </div>
  );
}
