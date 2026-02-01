"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

import "katex/dist/katex.min.css";

export default function MarkdownRenderer({
  children,
  className = "",
}) {
  if (!children) return null;

  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          rehypeRaw, // ✅ REQUIRED
        ]}
        components={{
          p: ({ children }) => (
            <p className="leading-7 my-2 text-gray-800">
              {children}
            </p>
          ),
          li: ({ children }) => (
            <li className="leading-6">
              {children}
            </li>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="px-1 py-0.5 rounded bg-gray-100 text-sm font-mono">
                {children}
              </code>
            ) : (
              <pre className="p-4 rounded overflow-x-auto my-4 text-sm bg-slate-900 text-slate-100">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
