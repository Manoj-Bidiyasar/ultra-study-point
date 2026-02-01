"use client";

import { useEffect, useState } from "react";
import { BLOCK_REGISTRY, createBlock } from "../schema/blockRegistry";

/**
 * UniversalEditor
 * ---------------------------------
 * Visual editor for content.blocks
 *
 * ❌ no document logic
 * ❌ no bulk json
 * ❌ no renderer logic
 *
 * Only edits blocks.
 */
export default function UniversalEditor({
  value,
  onChange,
}) {
  const [blocks, setBlocks] = useState(
    value?.blocks || []
  );

  // propagate changes
  useEffect(() => {
    onChange?.({
      version: 1,
      blocks,
    });
  }, [blocks]);

  const addBlock = (type) => {
    setBlocks([...blocks, createBlock(type)]);
  };

  const updateBlock = (index, newBlock) => {
    const copy = [...blocks];
    copy[index] = newBlock;
    setBlocks(copy);
  };

  const removeBlock = (index) => {
    const copy = [...blocks];
    copy.splice(index, 1);
    setBlocks(copy);
  };

  return (
    <div className="space-y-4">

      {/* ADD BLOCK TOOLBAR */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(BLOCK_REGISTRY).map(
          ([type, def]) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="px-3 py-1 border rounded bg-gray-50 text-sm"
            >
              + {def.label}
            </button>
          )
        )}
      </div>

      {/* BLOCK EDITORS */}
      {blocks.map((block, index) => {
        const Editor =
          require(`./blocks/${capitalize(
            block.type
          )}Editor`).default;

        return (
          <div
            key={block.id || index}
            className="border rounded p-4 bg-white"
          >
            <div className="flex justify-between mb-2">
              <span className="text-xs uppercase font-bold text-gray-500">
                {block.type}
              </span>

              <button
                className="text-red-600 text-sm"
                onClick={() => removeBlock(index)}
              >
                Delete
              </button>
            </div>

            <Editor
              block={block}
              onChange={(b) =>
                updateBlock(index, b)
              }
            />
          </div>
        );
      })}
    </div>
  );
}

function capitalize(str) {
  return str
    .split("_")
    .map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1)
    )
    .join("");
}
