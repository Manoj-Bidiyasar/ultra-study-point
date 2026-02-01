"use client";

import {
  input,
  textarea,
  label,
  smallButton,
} from "../editorStyles";

export default function TableEditor({ block, onChange }) {
  const data = block.data;

  const update = (k, v) =>
    onChange({ ...block, [k]: v });

  /* ---------------- ROW ---------------- */

  const addRow = () =>
    update("data", [
      ...data,
      Array(data[0].length).fill(""),
    ]);

  const removeRow = () => {
    if (data.length <= 2) return;
    update("data", data.slice(0, -1));
  };

  /* ---------------- COLUMN ---------------- */

  const addColumn = () =>
    update(
      "data",
      data.map((r) => [...r, ""])
    );

  const removeColumn = () => {
    if (data[0].length <= 2) return;
    update(
      "data",
      data.map((r) => r.slice(0, -1))
    );
  };

  /* ---------------- PASTE ---------------- */

  const handlePaste = (e, r, c) => {
    const text =
      e.clipboardData.getData("text");

    if (!text.includes("\n")) return;

    e.preventDefault();

    const rows = text
      .trim()
      .split(/\r?\n/)
      .map((r) => r.split("\t"));

    const copy = data.map((r) => [...r]);

    rows.forEach((row, i) => {
      if (!copy[r + i]) copy[r + i] = [];
      row.forEach((cell, j) => {
        copy[r + i][c + j] = cell.trim();
      });
    });

    update("data", copy);
  };
const handleKeyDown = (e, r, c) => {
  const rows = data.length;
  const cols = data[0].length;

  let nextR = r;
  let nextC = c;

  switch (e.key) {
    case "ArrowRight":
    case "Tab":
      e.preventDefault();
      nextC++;
      if (nextC >= cols) {
        nextC = 0;
        nextR++;
      }
      break;

    case "ArrowLeft":
      e.preventDefault();
      nextC--;
      if (nextC < 0) {
        nextC = cols - 1;
        nextR--;
      }
      break;

    case "ArrowDown":
    case "Enter":
      e.preventDefault();
      nextR++;
      break;

    case "ArrowUp":
      e.preventDefault();
      nextR--;
      break;

    default:
      return;
  }

  const el = document.getElementById(
    `cell-${nextR}-${nextC}`
  );
  el?.focus();
};

  /* ---------------- RENDER ---------------- */

  return (
    <div className="space-y-4 border border-gray-400 bg-white text-gray-900 p-4 rounded-md">

      {/* TITLE */}
      <div>
        <label className={label}>Table title</label>
        <input
          className={input}
          value={block.title || ""}
          onChange={(e) =>
            update("title", e.target.value)
          }
        />
      </div>

      {/* ALIGNMENTS */}
      <div className="grid grid-cols-3 gap-4">

        <div>
          <label className={label}>
            Caption alignment
          </label>
          <select
            className={input}
            value={block.captionAlign}
            onChange={(e) =>
              update(
                "captionAlign",
                e.target.value
              )
            }
          >
            <option>left</option>
            <option>center</option>
            <option>right</option>
          </select>
        </div>

        <div>
          <label className={label}>
            Table alignment
          </label>
          <select
            className={input}
            value={block.tableAlign}
            onChange={(e) =>
              update(
                "tableAlign",
                e.target.value
              )
            }
          >
            <option>left</option>
            <option>center</option>
            <option>right</option>
          </select>
        </div>

        <div>
          <label className={label}>
            Text alignment
          </label>
          <select
            className={input}
            value={block.textAlign}
            onChange={(e) =>
              update(
                "textAlign",
                e.target.value
              )
            }
          >
            <option>left</option>
            <option>center</option>
            <option>right</option>
            <option>justify</option>
          </select>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 flex-wrap">
        <button className={smallButton} onClick={addRow}>
          + Row
        </button>
        <button className={smallButton} onClick={removeRow}>
          − Row
        </button>
        <button className={smallButton} onClick={addColumn}>
          + Column
        </button>
        <button className={smallButton} onClick={removeColumn}>
          − Column
        </button>
      </div>

      {/* GRID */}
      <div className="overflow-auto border border-gray-400 bg-white">
        <table className="border-collapse text-sm w-full">
          <tbody>
            {data.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border border-gray-400 p-1"
                    style={{
                      textAlign: block.textAlign,
                    }}
                  >
                    <textarea
  id={`cell-${r}-${c}`}
  className="w-full resize-none outline-none bg-white text-gray-900"
  rows={1}
  value={cell}

  /* ---------- Excel paste ---------- */
  onPaste={(e) => handlePaste(e, r, c)}

  /* ---------- auto-grow height ---------- */
  onInput={(e) => {
    e.target.style.height = "auto";
    e.target.style.height =
      e.target.scrollHeight + "px";
  }}

  /* ---------- keyboard navigation ---------- */
  onKeyDown={(e) =>
    handleKeyDown(e, r, c)
  }

  /* ---------- update cell ---------- */
  onChange={(e) => {
    const copy = data.map((row) => [...row]);
    copy[r][c] = e.target.value;
    update("data", copy);
  }}
/>

                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600">
        Supports Excel paste · Markdown · LaTeX
      </p>
    </div>
  );
}
