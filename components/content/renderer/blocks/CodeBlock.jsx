"use client";

import { useEffect, useState } from "react";
import Prism from "prismjs";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

export default function CodeBlock({ block }) {
  const {
    code = "",
    language = "javascript",
    filename,
    highlightLines = "",
  } = block;

  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Prism.highlightAll();
  }, [code]);

  const lines = code.split("\n");

  const highlighted = parseHighlight(highlightLines);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="code-wrapper">

      {/* HEADER */}
      <div className="code-header">
        <span>{filename || language}</span>

        <div className="code-actions">
          <button onClick={copyCode}>
            {copied ? "Copied" : "Copy"}
          </button>

          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <pre className={`code-block language-${language}`}>
          <code>
            {lines.map((line, i) => (
              <div
                key={i}
                className={`code-line ${
                  highlighted.has(i + 1)
                    ? "highlight"
                    : ""
                }`}
              >
                <span className="line-number">
                  {i + 1}
                </span>

                <span
                  className="line-content"
                  dangerouslySetInnerHTML={{
                    __html: Prism.highlight(
                      line || " ",
                      Prism.languages[language] ||
                        Prism.languages.javascript,
                      language
                    ),
                  }}
                />
              </div>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------ */
/* helpers                                     */
/* ------------------------------------------ */

function parseHighlight(text) {
  // "2,4-6"
  const set = new Set();

  if (!text) return set;

  text.split(",").forEach((part) => {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= b; i++) set.add(i);
    } else {
      set.add(Number(part));
    }
  });

  return set;
}
