"use client";

import { useEffect, useRef, useState } from "react";
import {
  initMermaid,
  renderMermaid,
} from "@/components/content/mermaidClient";

export default function DiagramBlock({ block }) {
  const ref = useRef(null);
  const [error, setError] = useState("");

  // stable id
  const idRef = useRef(
    "diagram-" + Math.random().toString(36).slice(2)
  );

  useEffect(() => {
    initMermaid();
  }, []);

  useEffect(() => {
    if (!block?.code?.trim()) {
      if (ref.current) ref.current.innerHTML = "";
      setError("");
      return;
    }

    renderMermaid(block.code, idRef.current).then(
      (res) => {
        if (res.error) {
          setError(res.error);
          if (ref.current) ref.current.innerHTML = "";
        } else {
          setError("");
          if (ref.current) {
            ref.current.innerHTML = res.svg;
          }
        }
      }
    );
  }, [block?.code]);

  if (error) {
    return (
      <div className="my-6 p-3 border border-red-300 bg-red-50 text-sm text-red-700 rounded">
        ❌ Diagram error: {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 overflow-x-auto"
    />
  );
}
