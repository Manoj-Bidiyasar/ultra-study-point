/**
 * contentSchema.js
 * --------------------------------------------------
 * Defines the canonical structure of all content
 * stored in Firestore.
 *
 * Used by:
 * - editor
 * - renderer
 * - validation
 * - migrations
 */

export const CONTENT_VERSION = 1;

/**
 * Base content schema
 *
 * Firestore field:
 *
 * content: {
 *   version: 1,
 *   blocks: []
 * }
 */
export const CONTENT_SCHEMA = {
  version: CONTENT_VERSION,

  /**
   * Ordered array of blocks
   */
  blocks: [],
};

/**
 * Create empty content
 */
export function createEmptyContent() {
  return {
    version: CONTENT_VERSION,
    blocks: [],
  };
}

/**
 * Validate minimal structure
 */
export function isValidContent(content) {
  if (!content) return false;

  if (typeof content !== "object") return false;

  if (content.version !== CONTENT_VERSION) return false;

  if (!Array.isArray(content.blocks)) return false;

  return true;
}
