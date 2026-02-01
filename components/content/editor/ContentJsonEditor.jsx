"use client";

import { useEffect, useState } from "react";
import { validateBlocks } from "@/components/content/utils/validateBlocks";
import { isValidContent } from "@/components/content/schema/contentSchema";

export default function BulkJsonEditor({ value, onChange }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  const validate = () => {
    try {
      const obj = JSON.parse(text);

      // full document allowed
      const content = obj.content || obj;

      if (!isValidContent(content)) {
        return setError("Invalid content schema");
      }

      const blockError = validateBlocks(content.blocks);
      if (blockError) {
        return setError(blockError);
      }

      setParsed(obj);
      setError(null);
    } catch (e) {
      setError("Invalid JSON syntax");
    }
  };

  const apply = () => {
    if (!parsed) return;
    onChange(parsed);
    setParsed(null);
  };

  return (
    <div className="mt-6 space-y-3">

      <p className="font-semibold">
        Bulk JSON Editor (Admin only)
      </p>

      <textarea
        className="w-full h-[420px] font-mono text-sm border p-3 rounded"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setParsed(null);
        }}
      />

      {/* ACTIONS */}
      <div className="flex gap-3">

        <button
          type="button"
          className="px-4 py-1.5 bg-gray-200 rounded"
          onClick={validate}
        >
          Validate
        </button>

        <button
          type="button"
          disabled={!parsed}
          className={`px-4 py-1.5 rounded ${
            parsed
              ? "bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500"
          }`}
          onClick={apply}
        >
          Apply
        </button>
      </div>

      {/* ERRORS */}
      {error && (
        <div className="text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {!error && parsed && (
        <div className="text-sm text-green-700">
          ✅ JSON valid — ready to apply
        </div>
      )}
    </div>
  );
}
