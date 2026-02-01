"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function DiagramBlock({ block }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!block?.code) return;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
    });

    mermaid.render(
      "diagram-" + Math.random().toString(36).slice(2),
      block.code
    ).then(({ svg }) => {
      if (ref.current) {
        ref.current.innerHTML = svg;
      }
    });
  }, [block?.code]);

  return (
    <div
      ref={ref}
      className="my-6 overflow-x-auto"
    />
  );
}
