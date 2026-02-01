"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ImageBlock({ block }) {
  const [open, setOpen] = useState(false);

  if (!block?.url) return null;

  /* IMAGE ALIGNMENT */
  const align =
    block.align === "left"
      ? "text-left"
      : block.align === "right"
      ? "text-right"
      : "text-center";

  /* CAPTION ALIGNMENT */
  const captionAlign =
    block.captionAlign === "left"
      ? "text-left"
      : block.captionAlign === "right"
      ? "text-right"
      : "text-center";

  /* IMAGE WIDTH */
  const widthStyle =
    block.width && block.width !== "auto"
      ? { width: block.width }
      : {};

  return (
    <>
      <figure className={`my-6 ${align}`}>
        {/* WIDTH CONTAINER */}
        <div
          className="inline-block"
          style={widthStyle}
        >
          <img
            src={block.url}
            alt={block.alt || ""}
            title={block.title || ""}
            loading="lazy"
            width={block.imgWidth}
            height={block.imgHeight}
            onClick={() =>
              block.zoom !== false && setOpen(true)
            }
            className="max-w-full rounded border border-gray-300 cursor-zoom-in"
          />

          {block.caption && (
            <figcaption
              className={`mt-2 text-sm text-gray-600 ${captionAlign}`}
            >
              <ReactMarkdown>
                {block.caption}
              </ReactMarkdown>
            </figcaption>
          )}
        </div>
      </figure>

      {/* FULLSCREEN */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
        >
          <img
            src={block.url}
            className="max-h-[90vh] max-w-[90vw]"
          />
        </div>
      )}
    </>
  );
}
