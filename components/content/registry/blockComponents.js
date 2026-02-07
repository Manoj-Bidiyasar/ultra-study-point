import CalloutBlock from "../renderer/blocks/CalloutBlock";
import CodeBlock from "../renderer/blocks/CodeBlock";
import FillBlankBlock from "../renderer/blocks/FillBlankBlock";
import HeadingBlock from "../renderer/blocks/HeadingBlock";
import ImageBlock from "../renderer/blocks/ImageBlock";
import LatexBlock from "../renderer/blocks/LatexBlock";
import MarkdownBlock from "../renderer/blocks/MarkdownBlock";
import MathStepsBlock from "../renderer/blocks/MathStepsBlock";
import McqBlock from "../renderer/blocks/McqBlock";
import NumericalBlock from "../renderer/blocks/NumericalBlock";
import OneLinerBlock from "../renderer/blocks/OneLinerBlock";
import PdfBlock from "../renderer/blocks/PdfBlock";
import PointsBlock from "../renderer/blocks/PointsBlock";
import SectionBlock from "../renderer/blocks/SectionBlock";
import TableBlock from "../renderer/blocks/TableBlock";

import CalloutEditor from "../editor/blocks/CalloutEditor";
import CodeEditor from "../editor/blocks/CodeEditor";
import FillBlankEditor from "../editor/blocks/FillBlankEditor";
import HeadingEditor from "../editor/blocks/HeadingEditor";
import ImageEditor from "../editor/blocks/ImageEditor";
import LatexEditor from "../editor/blocks/LatexEditor";
import MarkdownEditor from "../editor/blocks/MarkdownEditor";
import MathStepsEditor from "../editor/blocks/MathStepsEditor";
import McqEditor from "../editor/blocks/McqEditor";
import NumericalEditor from "../editor/blocks/NumericalEditor";
import OneLinerEditor from "../editor/blocks/OneLinerEditor";
import PdfEditor from "../editor/blocks/PdfEditor";
import PointsEditor from "../editor/blocks/PointsEditor";
import SectionEditor from "../editor/blocks/SectionEditor";
import TableEditor from "../editor/blocks/TableEditor";

export const BLOCK_RENDERERS = {
  heading: HeadingBlock,
  markdown: MarkdownBlock,
  latex: LatexBlock,
  section: SectionBlock,
  points: PointsBlock,
  callout: CalloutBlock,
  image: ImageBlock,
  table: TableBlock,
  mcq: McqBlock,
  fill_blank: FillBlankBlock,
  one_liner: OneLinerBlock,
  numerical: NumericalBlock,
  pdf: PdfBlock,
  code: CodeBlock,
  math_steps: MathStepsBlock,
};

export const BLOCK_EDITORS = {
  heading: HeadingEditor,
  markdown: MarkdownEditor,
  latex: LatexEditor,
  section: SectionEditor,
  points: PointsEditor,
  callout: CalloutEditor,
  image: ImageEditor,
  table: TableEditor,
  mcq: McqEditor,
  fill_blank: FillBlankEditor,
  one_liner: OneLinerEditor,
  numerical: NumericalEditor,
  pdf: PdfEditor,
  code: CodeEditor,
  math_steps: MathStepsEditor,
};

