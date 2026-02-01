/**
 * blockRegistry.js
 * --------------------------------------------------
 * Single source of truth for all content blocks.
 *
 * Used by:
 * - UniversalEditor
 * - UniversalRenderer
 * - schema validation
 * - migrations
 */

export const BLOCK_REGISTRY = {
  heading: {
    label: "Heading",
    icon: "H",
    default: {
      text: "",
      level: 2,
    },
    fields: ["text", "level"],
  },

  markdown: {
    label: "Markdown",
    icon: "MD",
    default: {
      content: "",
    },
    fields: ["content"],
  },

  latex: {
    label: "LaTeX",
    icon: "∑",
    default: {
      latex: "",
      inlineOnly: false,
      number: false, // ✅ already supported by LatexBlock
    },
    fields: ["latex", "inlineOnly", "number"],
  },

  section: {
  label: "Section",
  icon: "§",
  default: {
    title: "",
    subtitle: "",
    blocks: [],
  },
  fields: ["title", "subtitle", "blocks"],
},


  points: {
    label: "Points",
    icon: "•",
    default: {
      style: "bullet",
      items: [],
    },
    fields: ["style", "items"],
  },

  callout: {
    label: "Callout",
    icon: "⚠️",
    default: {
      variant: "info",
      content: "",
    },
    fields: ["variant", "content"],
  },

  image: {
    label: "Image",
    icon: "🖼",
    default: {
      url: "",
      caption: "",
      alt: "",
    },
    fields: ["url", "caption", "alt"],
  },

table: {
  label: "Table",
  icon: "▦",
  default: {
    title: "",
    captionAlign: "center",
    tableAlign: "center",
    textAlign: "left",
    hasHeader: true,
    data: [
      ["", ""],
      ["", ""],
    ],
  },
  fields: [
    "title",
    "captionAlign",
    "tableAlign",
    "textAlign",
    "hasHeader",
    "data",
  ],
},






  diagram: {
    label: "Diagram",
    icon: "↗",
    default: {
      engine: "mermaid",
      code: "",
    },
    fields: ["engine", "code"],
  },

  code: {
    label: "Code",
    icon: "</>",
    default: {
      language: "js",
      code: "",
    },
    fields: ["language", "code"],
  },

  pdf: {
  label: "PDF",
  icon: "📄",
  default: {
    title: "",
    url: "",
    mode: "embed",   // embed | link
    page: 1,
    zoom: 100,
  },
  fields: ["title", "url", "mode", "page", "zoom"],
},


  /* ======================
     QUESTION BLOCKS
     ====================== */

  mcq: {
    label: "MCQ",
    icon: "❓",

    default: {
      type: "mcq",

      question: "",

      // ✅ REQUIRED
      mode: "single", // single | multi

      // ✅ ALWAYS ID-BASED OPTIONS
      options: [
        { id: "a", text: "" },
        { id: "b", text: "" },
        { id: "c", text: "" },
        { id: "d", text: "" },
      ],

      // ✅ store option IDs
      correct: [],

      explanation: "",

      // study behaviour
      revealAnswer: false,
      revealExplanation: false,

      // ✅ grouped exam config
      exam: {
        marks: 1,
        negative: 0,
        difficulty: "medium",
        pyq: false,
        year: "",
        topic: "",
      },
    },

    fields: {
      content: [
        "question",
        "options",
        "correct",
        "explanation",
      ],

      study: ["revealAnswer"],

      exam: [
        "marks",
        "negative",
        "difficulty",
        "pyq",
        "year",
        "topic",
      ],
    },
  },


  fill_blank: {
    label: "Fill in the blanks",
    icon: "✍️",
    default: {
      question: "",
      answers: {},
    },
    fields: ["question", "answers"],
  },

  one_liner: {
  label: "One Liner",
  icon: "🧠",
  default: {
    question: "",
    answer: "",
    revealAnswer: true,   // ✅ NEW
  },
  fields: ["question", "answer", "revealAnswer"],
},


  numerical: {
    label: "Numerical",
    icon: "🔢",
    default: {
      question: "",
      answer: "",
      tolerance: 0,
      unit: "",
    },
    fields: ["question", "answer", "tolerance", "unit"],
  },

  /* ======================
     ✅ NEW — STEP MATH BLOCK
     ====================== */

  math_steps: {
    label: "Math Steps",
    icon: "📐",
    default: {
      title: "",
      steps: [],
    },
    fields: ["title", "steps"],
  },
};

/* ======================================================
   CREATE BLOCK
====================================================== */

export function createBlock(type) {
  const def = BLOCK_REGISTRY[type];

  if (!def) {
    throw new Error(
      `Unknown block type: ${type}`
    );
  }

  return {
    id: crypto.randomUUID(),

    type,

    // UI-only metadata (never saved)
    __ui: {
  collapsed: false,
  label: "",        // ✅ manual override
},


    // deep clone defaults safely
    ...structuredClone(def.default),
  };
}

/* ======================================================
   UTILITIES
====================================================== */

export function getAllBlockTypes() {
  return Object.keys(BLOCK_REGISTRY);
}

/**
 * Clone a block safely (used for duplicate)
 */
export function cloneBlock(block) {
  const copy = structuredClone(block);
  copy.id = crypto.randomUUID();
  copy.__ui = { collapsed: false };
  return copy;
}
