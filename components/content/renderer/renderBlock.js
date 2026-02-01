import HeadingBlock from "./blocks/HeadingBlock";
import MarkdownBlock from "./blocks/MarkdownBlock";
import LatexBlock from "./blocks/LatexBlock";
import SectionBlock from "./blocks/SectionBlock";
import PointsBlock from "./blocks/PointsBlock";
import CalloutBlock from "./blocks/CalloutBlock";
import ImageBlock from "./blocks/ImageBlock";
import TableBlock from "./blocks/TableBlock";
import McqBlock from "./blocks/McqBlock";
import FillBlankBlock from "./blocks/FillBlankBlock";
import OneLinerBlock from "./blocks/OneLinerBlock";
import NumericalBlock from "./blocks/NumericalBlock";
import DiagramBlock from "./blocks/DiagramBlock";
import PdfBlock from "./blocks/PdfBlock";
import CodeBlock from "./blocks/CodeBlock";

/* ✅ NEW IMPORT */
import MathStepsBlock from "./blocks/MathStepsBlock";

/**
 * renderBlock
 * -------------------------
 * Pure renderer.
 *
 * ❌ no mode
 * ❌ no editor logic
 * ❌ no role logic
 * ✅ same JSON → same HTML
 */
export default function renderBlock(block, index) {
  if (!block || !block.type) return null;

  const key = block.id || index;

  switch (block.type) {
    case "heading":
      return <HeadingBlock key={key} block={block} />;

    case "markdown":
      return <MarkdownBlock key={key} block={block} />;

    case "latex":
      return <LatexBlock key={key} block={block} />;

    case "section":
      return <SectionBlock key={key} block={block} />;

    case "points":
      return <PointsBlock key={key} block={block} />;

    case "callout":
      return <CalloutBlock key={key} block={block} />;

    case "image":
      return <ImageBlock key={key} block={block} />;

    case "table":
      return <TableBlock key={key} block={block} />;

    case "mcq":
      return <McqBlock key={key} block={block} />;

    case "fill_blank":
      return <FillBlankBlock key={key} block={block} />;

    case "one_liner":
      return <OneLinerBlock key={key} block={block} />;

    case "numerical":
      return <NumericalBlock key={key} block={block} />;

    case "diagram":
      return <DiagramBlock key={key} block={block} />;

    case "pdf":
      return <PdfBlock key={key} block={block} />;

    case "code":
      return <CodeBlock key={key} block={block} />;

    /* ✅ NEW BLOCK RENDERER */
    case "math_steps":
      return <MathStepsBlock key={key} block={block} />;

    default:
      return null;
  }
}
