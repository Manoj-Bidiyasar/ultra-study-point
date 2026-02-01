/**
 * Adapters convert external content
 * into block-based format.
 */

export function textToMarkdownBlock(text = "") {
  return {
    type: "markdown",
    content: text,
  };
}

export function aiResponseToBlocks(text = "") {
  return text
    .split("\n\n")
    .map((chunk) => ({
      type: "markdown",
      content: chunk.trim(),
    }))
    .filter((b) => b.content);
}
