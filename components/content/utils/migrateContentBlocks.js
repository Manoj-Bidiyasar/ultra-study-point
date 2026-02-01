import { randomUUID } from "crypto";

function id() {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/**
 * Converts legacy content into new block system.
 * Used one-time only.
 */
export function migrateContentBlocks(oldBlocks = []) {
  if (!Array.isArray(oldBlocks)) return [];

  return oldBlocks.map((block) => {
    switch (block.type) {
      case "heading":
        return {
          id: id(),
          type: "heading",
          level: block.level || 2,
          text: block.text || "",
        };

      case "paragraph":
        return {
          id: id(),
          type: "markdown",
          content: block.text || "",
        };

      case "points":
        return {
          id: id(),
          type: "points",
          style: block.style || "bullet",
          items: block.items || [],
        };

      case "table":
        return {
          id: id(),
          type: "table",
          title: block.title || "",
          hasHeader: block.hasHeader ?? true,
          data: block.data || [],
        };

      default:
        return {
          id: id(),
          type: "markdown",
          content: JSON.stringify(block, null, 2),
        };
    }
  });
}
