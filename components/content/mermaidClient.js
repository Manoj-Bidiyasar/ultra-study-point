import mermaid from "mermaid";

let initialized = false;

export function initMermaid() {
  if (initialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "monospace",
  });

  initialized = true;
}

export async function renderMermaid(code, id) {
  try {
    const { svg } = await mermaid.render(id, code);
    return { svg };
  } catch (err) {
    return { error: err.message };
  }
}
