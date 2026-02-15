"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

export default function MarkdownBlock({ block }) {
  if (!block?.content || typeof block.content !== "string")
    return null;

  return (
    <div className="prose prose-slate max-w-none">

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 mb-4 text-2xl font-bold text-gray-900">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mt-7 mb-3 text-xl font-semibold text-gray-900">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 text-lg font-semibold text-gray-900">
              {children}
            </h3>
          ),

          p: ({ children }) => (
            <p className="leading-7 my-2 text-gray-800">
              {children}
            </p>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="italic text-gray-600">
              {children}
            </em>
          ),

          ul: ({ children }) => (
            <ul className="list-disc pl-6 my-3 space-y-1 text-gray-800">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="list-decimal pl-6 my-3 space-y-1 text-gray-800">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="leading-6">
              {children}
            </li>
          ),

          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border border-gray-300">
                {children}
              </table>
            </div>
          ),

          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold bg-gray-100 border border-gray-300">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="px-3 py-2 border border-gray-300">
              {children}
            </td>
          ),

          blockquote: ({ children }) => (
            <blockquote className="p-3 my-4 rounded border-l-4 border-blue-500 bg-blue-50">
              {children}
            </blockquote>
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
        {block.content}
      </ReactMarkdown>
    </div>
  );
}
