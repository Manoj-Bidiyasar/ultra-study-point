/**
 * Utility transformations between blocks.
 * Used by editor toolbar and AI helpers.
 */

export function markdownToPoints(markdown = "") {
  return {
    type: "points",
    style: "bullet",
    items: markdown
      .split("\n")
      .map((t) => t.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean),
  };
}

export function pointsToMarkdown(items = []) {
  return {
    type: "markdown",
    content: items.map((i) => `- ${i}`).join("\n"),
  };
}
