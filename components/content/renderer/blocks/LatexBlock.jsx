"use client";

import { BlockMath, InlineMath } from "react-katex";
import { useEquationRegistry } from "@/components/latex/EquationRegistry";

export default function LatexBlock({ block }) {
  const { register } = useEquationRegistry();

  if (!block?.latex) return null;

  // ✅ detect label
  const labelMatch =
    block.latex.match(/\\label\{(.+?)\}/);

  const label = labelMatch?.[1];

  // ✅ register equation
  const number = label
    ? register(label, block.latex)
    : null;

  // ✅ remove label before render
  const cleanLatex = block.latex.replace(
    /\\label\{.*?\}/g,
    ""
  );

  if (block.inlineOnly) {
    return <InlineMath math={cleanLatex} />;
  }

  return (
    <div
      id={label ? `eq-${label}` : undefined}
      className="my-4 flex justify-between"
    >
      <BlockMath
        math={`\\displaystyle ${cleanLatex}`}
      />

      {number && (
        <span className="ml-4 text-sm text-gray-600">
          ({number})
        </span>
      )}
    </div>
  );
}
