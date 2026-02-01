"use client";

/* ==========================================
   HELPERS
========================================== */

function toAlpha(i, upper = true) {
  const char = String.fromCharCode(
    (i % 26) + 65
  );
  return upper ? char : char.toLowerCase();
}

function toRoman(num) {
  const map = [
    ["M",1000],["CM",900],["D",500],["CD",400],
    ["C",100],["XC",90],["L",50],["XL",40],
    ["X",10],["IX",9],["V",5],["IV",4],["I",1],
  ];

  let res = "";
  for (const [r,v] of map) {
    while (num >= v) {
      res += r;
      num -= v;
    }
  }
  return res;
}

/* ==========================================
   RENDER
========================================== */

export default function PointsBlock({ block }) {
  if (!Array.isArray(block.items)) return null;

  const style = block.style || "bullet";

  const symbolMap = {
    bullet: "●",
    circle: "○",
    square: "■",
    triangle: "▲",
    thumb: "👍",
  };

  /* NUMBERED */
  if (style === "number") {
    return (
      <ol className="list-decimal pl-6 my-4 space-y-1">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    );
  }

  /* ALPHABET */
  if (
    style === "alpha_upper" ||
    style === "alpha_lower" ||
    style === "alpha_bracket"
  ) {
    return (
      <ul className="my-4 space-y-1">
        {block.items.map((item, i) => {
          const letter =
            style === "alpha_upper"
              ? toAlpha(i, true)
              : toAlpha(i, false);

          const suffix =
            style === "alpha_bracket"
              ? ")"
              : ".";

          return (
            <li key={i} className="flex gap-2">
              <span className="w-6 font-medium">
                {letter}
                {suffix}
              </span>
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  /* ROMAN */
  if (
    style === "roman_upper" ||
    style === "roman_lower"
  ) {
    return (
      <ul className="my-4 space-y-1">
        {block.items.map((item, i) => {
          const roman = toRoman(i + 1);
          return (
            <li key={i} className="flex gap-2">
              <span className="w-6 font-medium">
                {style === "roman_lower"
                  ? roman.toLowerCase()
                  : roman}
                .
              </span>
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  /* SYMBOL BULLETS */
  return (
    <ul className="my-4 space-y-2">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-5">
            {symbolMap[style] || "●"}
          </span>
          <span className="leading-7">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
