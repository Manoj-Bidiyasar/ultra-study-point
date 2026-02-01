"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import katex from "katex";
import "katex/dist/katex.min.css";

import { label, checkbox, optionRow } from "../editorStyles";

/* ======================================================
   LATEX EDITOR — ADVANCED (LIGHT MODE ONLY)
====================================================== */

export default function LatexEditor({ block, onChange }) {
  const editorRef = useRef(null);
  const [error, setError] = useState("");

  /* ======================================================
     MONACO SETUP + LATEX SNIPPETS
  ====================================================== */

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;

    // ✅ LaTeX snippets
    monaco.languages.registerCompletionItemProvider("latex", {
      provideCompletionItems: () => ({
        suggestions: [
          snippet("frac", "\\frac{${1:a}}{${2:b}}"),
          snippet("sum", "\\sum_{i=1}^{n}"),
          snippet("int", "\\int_{a}^{b}"),
          snippet("sqrt", "\\sqrt{${1:x}}"),
          snippet("lim", "\\lim_{x \\to 0}"),
          snippet("matrix", "\\begin{bmatrix}\n${1}\n\\end{bmatrix}"),
          snippet("cases", "\\begin{cases}\n${1}\n\\end{cases}"),
          snippet("theta", "\\theta"),
          snippet("alpha", "\\alpha"),
          snippet("beta", "\\beta"),
          snippet("gamma", "\\gamma"),
          snippet("pi", "\\pi"),
          snippet("rightarrow", "\\rightarrow"),
          snippet("leq", "\\leq"),
          snippet("geq", "\\geq"),
          snippet("label", "\\label{eq:${1:name}}"),
          snippet("ref", "\\ref{eq:${1:name}}"),
        ],
      }),
    });
  }

  /* ======================================================
     ERROR HIGHLIGHTING (KaTeX)
  ====================================================== */

  useEffect(() => {
    if (!block?.latex?.trim()) {
      setError("");
      return;
    }

    try {
      katex.renderToString(block.latex, {
        throwOnError: true,
      });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [block?.latex]);

  /* ======================================================
     AUTO WRAP MULTI-LINE MATH
  ====================================================== */

  const autoWrap = (value) => {
    if (!value) return "";

    // already block math
    if (
      value.includes("\\begin") ||
      value.includes("\\end")
    ) {
      return value;
    }

    // multiline → aligned
    if (value.includes("\n")) {
      return `\\begin{aligned}\n${value}\n\\end{aligned}`;
    }

    return value;
  };

  /* ======================================================
     COPY LATEX
  ====================================================== */

  const copyLatex = async () => {
    await navigator.clipboard.writeText(
      block.latex || ""
    );
    alert("LaTeX copied");
  };

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="space-y-2 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>
        LaTeX Expression
      </label>

      <Editor
        height="230px"
        defaultLanguage="latex"
        theme="vs"
        value={block.latex || ""}
        onMount={handleEditorDidMount}
        onChange={(value) =>
          onChange({
            ...block,
            latex: autoWrap(value || ""),
          })
        }
        options={{
          fontSize: 14,
          fontFamily:
            "JetBrains Mono, Fira Code, Consolas, monospace",

          lineNumbers: "on",
          wordWrap: "on",
          wrappingIndent: "indent",

          autoIndent: "advanced",
          formatOnPaste: true,
          formatOnType: true,

          minimap: { enabled: false },
          scrollBeyondLastLine: false,

          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          matchBrackets: "always",

          smoothScrolling: true,
          cursorBlinking: "smooth",
        }}
      />

      {/* ERROR */}
      {error && (
        <div className="text-sm bg-red-50 text-red-700 p-2 rounded">
          ❌ {error}
        </div>
      )}

      {/* OPTIONS */}
      <div className="flex flex-col gap-2 text-sm mt-2">

        <label className={optionRow}>
          <input
            type="checkbox"
            className={checkbox}
            checked={block.inlineOnly || false}
            onChange={(e) =>
              onChange({
                ...block,
                inlineOnly: e.target.checked,
              })
            }
          />
          Inline math
        </label>

        <label className={optionRow}>
          <input
            type="checkbox"
            className={checkbox}
            checked={block.number || false}
            onChange={(e) =>
              onChange({
                ...block,
                number: e.target.checked,
              })
            }
          />
          Show equation number
        </label>

        <button
          type="button"
          onClick={copyLatex}
          className="w-fit px-3 py-1 border border-gray-400 text-gray-900 rounded hover:bg-gray-100"
        >
          📋 Copy equation
        </button>
      </div>
    </div>
  );
}

/* ======================================================
   SNIPPET HELPER
====================================================== */

function snippet(label, body) {
  return {
    label,
    kind: 15, // CompletionItemKind.Snippet
    insertText: body,
    insertTextRules: 4, // InsertAsSnippet
  };
}
