import { BLOCK_RENDERERS } from "../registry/blockComponents";

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
export default function renderBlock(block, index, context = {}) {
  if (!block || !block.type) return null;

  const key = block.id || index;
  const Renderer = BLOCK_RENDERERS[block.type];

  if (!Renderer) return null;

  return <Renderer key={key} block={block} context={context} />;
}
