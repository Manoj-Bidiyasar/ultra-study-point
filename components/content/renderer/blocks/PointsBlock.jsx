"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

function toAlpha(i, upper = true) {
  const char = String.fromCharCode((i % 26) + 65);
  return upper ? char : char.toLowerCase();
}

function toRoman(num) {
  const map = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];

  let res = "";
  for (const [r, v] of map) {
    while (num >= v) {
      res += r;
      num -= v;
    }
  }
  return res;
}

function renderItemContent(item) {
  if (typeof item !== "string") return item;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => <span>{children}</span>,
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {item}
    </ReactMarkdown>
  );
}

export default function PointsBlock({ block }) {
  if (!Array.isArray(block.items)) return null;

  const style = block.style || "bullet";
  const symbolMap = {
    bullet: "\u2022",
    circle: "\u25CB",
    square: "\u25A0",
    triangle: "\u25B2",
    thumb: "\uD83D\uDC4D",
  };

  if (style === "number") {
    return (
      <ol className="list-decimal pl-6 my-4 space-y-1">
        {block.items.map((item, i) => (
          <li key={i}>{renderItemContent(item)}</li>
        ))}
      </ol>
    );
  }

  if (
    style === "alpha_upper" ||
    style === "alpha_lower" ||
    style === "alpha_bracket"
  ) {
    return (
      <ul className="my-4 space-y-1">
        {block.items.map((item, i) => {
          const letter =
            style === "alpha_upper" ? toAlpha(i, true) : toAlpha(i, false);
          const suffix = style === "alpha_bracket" ? ")" : ".";

          return (
            <li key={i} className="flex gap-2">
              <span className="w-6 font-medium">
                {letter}
                {suffix}
              </span>
              <span>{renderItemContent(item)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (style === "roman_upper" || style === "roman_lower") {
    return (
      <ul className="my-4 space-y-1">
        {block.items.map((item, i) => {
          const roman = toRoman(i + 1);
          return (
            <li key={i} className="flex gap-2">
              <span className="w-6 font-medium">
                {style === "roman_lower" ? roman.toLowerCase() : roman}.
              </span>
              <span>{renderItemContent(item)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="my-4 space-y-2">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-5">{symbolMap[style] || "\u2022"}</span>
          <span className="leading-7">{renderItemContent(item)}</span>
        </li>
      ))}
    </ul>
  );
}
