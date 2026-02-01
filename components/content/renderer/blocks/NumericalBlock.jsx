"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function NumericalBlock({ block }) {
  return (
    <div className="border border-gray-300 p-4 my-4 rounded-md bg-white">

      {/* QUESTION */}
      {block.question && (
        <div className="mb-3 text-gray-900">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ children }) => (
                <p className="leading-7">
                  {children}
                </p>
              ),
            }}
          >
            {block.question}
          </ReactMarkdown>
        </div>
      )}

      {/* ANSWER */}
      {block.answer && (
        <div className="mt-2 text-green-700 font-medium">

          Answer:&nbsp;

          <span className="font-semibold">
            {block.answer}
          </span>

          {block.unit && (
            <span className="ml-1">
              <span className="mx-1">·</span>
              <span className="inline-block">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {`$${block.unit}$`}
                </ReactMarkdown>
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
