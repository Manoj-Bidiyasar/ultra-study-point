"use client";

import { useEffect, useRef, useState } from "react";
import { textarea, label } from "../editorStyles";
import {
  initMermaid,
  renderMermaid,
} from "@/components/content/mermaidClient";

export default function DiagramEditor({ block, onChange }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  // ✅ stable ID (IMPORTANT)
  const diagramId = useRef(
    "diagram-" + Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    initMermaid();
  }, []);

  useEffect(() => {
    if (!block.code?.trim()) {
      setSvg("");
      setError("");
      return;
    }

    renderMermaid(block.code, diagramId.current).then(
      (res) => {
        if (res.error) {
          setError(res.error);
          setSvg("");
        } else {
          setSvg(res.svg);
          setError("");
        }
      }
    );
  }, [block.code]);

  const copySvg = async () => {
    await navigator.clipboard.writeText(svg);
    alert("SVG copied");
  };

  const downloadSvg = () => {
    const blob = new Blob([svg], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 border border-gray-300 p-3 rounded-md bg-white">

      <label className={label}>
        Mermaid / Diagram code
      </label>

      <textarea
        className={`${textarea} font-mono text-sm min-h-[200px]`}
        placeholder={`flowchart TD
A[Start] --> B{Decision}
B -->|Yes| C[Process]
B -->|No| D[End]`}
        value={block.code || ""}
        onChange={(e) =>
          onChange({ ...block, code: e.target.value })
        }
      />

      {/* ERROR */}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
          ❌ {error}
        </div>
      )}

      {/* PREVIEW */}
      {svg && (
        <div className="border rounded bg-gray-50 p-3 overflow-auto">
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}

      {/* ACTIONS */}
      {svg && (
        <div className="flex gap-3 text-sm">
          <button
            onClick={copySvg}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Copy SVG
          </button>

          <button
            onClick={downloadSvg}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Export SVG
          </button>
        </div>
      )}
    </div>
  );
}
