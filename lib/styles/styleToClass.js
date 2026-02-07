// lib/styleToClass.js
export function styleToClass(style = {}) {
  return [
    style.bold && "font-bold",
    style.italic && "italic",
    style.align === "center" && "text-center",
    style.align === "right" && "text-right",
  ]
    .filter(Boolean)
    .join(" ");
}
