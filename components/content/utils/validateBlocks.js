/**
 * validateBlocks.js
 * --------------------------------------------------
 * Runtime validation for content blocks.
 *
 * Used by:
 * - UniversalEditor
 * - Bulk JSON editor
 * - Firestore save pipeline
 */

import { BLOCK_REGISTRY } from "../schema/blockRegistry";

/**
 * Validate a single block
 */
export function validateBlock(block) {
  if (!block || typeof block !== "object") {
    return "Block must be an object";
  }

  if (!block.type) {
    return "Block missing 'type'";
  }

  const def = BLOCK_REGISTRY[block.type];

  if (!def) {
    return `Unknown block type: ${block.type}`;
  }

  // required fields
  for (const field of def.fields) {
    if (!(field in block)) {
      return `Block '${block.type}' missing field '${field}'`;
    }
  }

  return null;
}

/**
 * Validate full blocks array
 */
export function validateBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return "Content blocks must be an array";
  }

  for (let i = 0; i < blocks.length; i++) {
    const error = validateBlock(blocks[i]);
    if (error) {
      return `Block #${i + 1}: ${error}`;
    }
  }

  return null;
}
