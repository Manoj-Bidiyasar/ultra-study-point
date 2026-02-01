"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function TableBlock({ block }) {
  if (!block?.data?.length) return null;

  const tableAlignStyle =
    block.tableAlign === "center"
      ? { margin: "0 auto" }
      : block.tableAlign === "right"
      ? { marginLeft: "auto" }
      : {};

  return (
    <div className="my-6 w-full overflow-x-auto">
      <div
        style={{
          background: "#ffffff",
          color: "#111827",
          padding: "14px",
          borderRadius: "8px",
          border: "1px solid #d1d5db",
          maxWidth: "100%",
        }}
      >
        {/* CAPTION */}
        {block.title && (
          <div
            style={{
              marginBottom: "8px",
              fontWeight: 600,
              textAlign: block.captionAlign || "left",
            }}
          >
            {block.title}
          </div>
        )}

        {/* TABLE */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "auto",
            fontSize: "14px",
            ...tableAlignStyle,
          }}
        >
          <tbody>
            {block.data.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const isHeader =
                    block.hasHeader && r === 0;

                  const Cell = isHeader
                    ? "th"
                    : "td";

                  return (
                    <Cell
                      key={c}
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        verticalAlign: "top",
                        textAlign:
                          block.textAlign || "left",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        lineHeight: "1.6",
                        background: isHeader
                          ? "#f3f4f6"
                          : "#ffffff",
                        fontWeight: isHeader
                          ? 600
                          : 400,
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[
                          remarkMath,
                          remarkBreaks, // ✅ THIS IS THE KEY
                        ]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {cell || ""}
                      </ReactMarkdown>
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
