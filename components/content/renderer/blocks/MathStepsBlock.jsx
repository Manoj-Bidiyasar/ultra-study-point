"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import katex from "katex";


export default function MathStepsBlock({ block }) {
  if (!block?.steps?.length) return null;

  return (
    <div className="my-4 border border-gray-300 rounded-md p-4 bg-gray-50">

      {block.title && (
  <h4 className="font-semibold mb-3 text-gray-900">
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <>{children}</>,
        inlineMath: ({ value }) => (
          <span
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(value),
            }}
          />
        ),
        math: () => null,
      }}
    >
      {block.title}
    </ReactMarkdown>
  </h4>
)}


      {block.steps.map((step, i) => (
        <div
          key={i}
          className="mb-3 flex gap-2 items-start"
        >
          <span className="font-semibold text-gray-700 mt-0.5">
            Step {i + 1}.
          </span>

          <div className="flex-1 text-gray-900">

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
              {step}
            </ReactMarkdown>

          </div>
        </div>
      ))}
    </div>
  );
}
