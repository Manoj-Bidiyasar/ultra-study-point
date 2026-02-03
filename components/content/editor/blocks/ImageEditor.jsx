"use client";

import { useState } from "react";
import { uploadImage } from "@/components/content/ImageTools/firebaseStorage";
import { input, label } from "../editorStyles";

/* ======================================================
   HELPERS
====================================================== */

function fileNameToText(name = "") {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ======================================================
   IMAGE EDITOR
====================================================== */

export default function ImageEditor({ block, onChange }) {
  const [uploading, setUploading] = useState(false);

  const update = (key, value) =>
    onChange({ ...block, [key]: value });

  const handleFile = async (file) => {
    if (!file) return;

    const cleanName = file.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9.-]/g, "");

    const seoFile = new File([file], cleanName, {
      type: file.type,
    });

    const suggested = fileNameToText(cleanName);

    setUploading(true);
    try {
      const url = await uploadImage(seoFile);

      onChange({
        ...block,
        url,

        // ✅ AUTO SEO (only if empty)
        alt: block.alt || suggested,
        title: block.title || suggested,
        caption: block.caption || suggested,

        // ✅ DEFAULT ALIGNMENT
        align: block.align || "center",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 border border-gray-300 p-4 rounded bg-white">

      {/* IMAGE URL */}
      <label className={label}>Image URL *</label>
      <input
        className={input}
        required
        value={block.url || ""}
        onChange={(e) => update("url", e.target.value)}
      />

      {/* UPLOAD */}
      <label className={label}>Or upload image</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) =>
          handleFile(e.target.files?.[0])
        }
      />

      {uploading && (
        <p className="text-sm text-blue-600">
          Uploading image…
        </p>
      )}

      {/* ALT */}
      <label className={label}>
        Alt text * (SEO)
      </label>
      <input
        className={input}
        required
        placeholder="Describe image clearly"
        value={block.alt || ""}
        onChange={(e) =>
          update("alt", e.target.value)
        }
      />

      {/* TITLE */}
      <label className={label}>
        Image title * (SEO)
      </label>
      <input
        className={input}
        required
        placeholder="Image title"
        value={block.title || ""}
        onChange={(e) =>
          update("title", e.target.value)
        }
      />

      {/* CAPTION */}
      <label className={label}>Caption</label>
      <input
        className={input}
        value={block.caption || ""}
        onChange={(e) =>
          update("caption", e.target.value)
        }
      />

      {/* CAPTION ALIGN */}
      <label className={label}>
        Caption alignment
      </label>
      <select
        className="w-full p-2 border rounded"
        value={block.captionAlign || "center"}
        onChange={(e) =>
          update("captionAlign", e.target.value)
        }
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>

      {/* IMAGE ALIGNMENT */}
      <label className={label}>
        Image alignment
      </label>
      <select
        className="w-full p-2 border rounded"
        value={block.align || "center"}
        onChange={(e) =>
          update("align", e.target.value)
        }
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>

      {/* IMAGE WIDTH */}
      <label className={label}>Image width</label>
      <select
        className="w-full p-2 border rounded"
        value={block.width || "auto"}
        onChange={(e) =>
          update("width", e.target.value)
        }
      >
        <option value="auto">Auto</option>
        <option value="50%">50%</option>
        <option value="75%">75%</option>
        <option value="100%">100%</option>
      </select>

      {/* ZOOM */}
      <label className="flex gap-2 items-center text-sm">
        <input
          type="checkbox"
          checked={block.zoom !== false}
          onChange={(e) =>
            update("zoom", e.target.checked)
          }
        />
        Enable click-to-zoom
      </label>

      {/* SEO SIZE */}
      <label className={label}>Image width (px)</label>
      <input
        className={input}
        type="number"
        value={block.imgWidth || 800}
        onChange={(e) =>
          update("imgWidth", e.target.value)
        }
      />

      <label className={label}>Image height (px)</label>
      <input
        className={input}
        type="number"
        value={block.imgHeight || 450}
        onChange={(e) =>
          update("imgHeight", e.target.value)
        }
      />
    </div>
  );
}
