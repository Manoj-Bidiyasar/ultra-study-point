/**
 * Extract plain text from blocks (used for AI, preview, summary)
 */
export function extractText(blocks = []) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") return block.content?.text || "";
      if (block.type === "heading") return block.content?.text || "";
      if (block.type === "callout") return block.content?.text || "";
      return "";
    })
    .join("\n");
}
