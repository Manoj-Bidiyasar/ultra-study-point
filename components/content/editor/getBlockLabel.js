import { BLOCK_REGISTRY } from "@/components/content/schema/blockRegistry";

export function getBlockLabel(block) {
  if (!block) return "";

  // manual override wins
  if (block.__ui?.label?.trim()) {
    return block.__ui.label;
  }

  switch (block.type) {
    case "heading":
      return block.text?.slice(0, 60);

    case "markdown":
      return block.content
        ?.replace(/[#*_`]/g, "")
        ?.slice(0, 60);

    case "section":
      return block.title;

    case "points":
      return `${block.items?.length || 0} points`;

    case "image":
      return block.caption || block.alt || "Image";

    case "table":
      return block.title || "Table";

    case "mcq":
      return block.question?.slice(0, 60);

    case "fill_blank":
      return block.question?.slice(0, 60);

    case "one_liner":
      return block.question?.slice(0, 60);

    case "numerical":
      return block.question?.slice(0, 60);

    case "math_steps":
      return `${block.steps?.length || 0} steps`;

    case "code":
      return block.language?.toUpperCase() || "Code";

    case "pdf":
      return "PDF document";

    default:
      return BLOCK_REGISTRY[block.type]?.label || "";
  }
}
