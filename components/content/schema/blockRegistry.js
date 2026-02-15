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
    icon: "âˆ‘",
    default: {
      latex: "",
      inlineOnly: false,
      number: false, // âœ… already supported by LatexBlock
    },
    fields: ["latex", "inlineOnly", "number"],
  },

  section: {
  label: "Section",
  icon: "Â§",
  default: {
    title: "",
    subtitle: "",
    tone: "simple",
    blocks: [],
  },
  fields: ["title", "subtitle", "blocks"],
},


  points: {
    label: "Points",
    icon: "â€¢",
    default: {
      style: "bullet",
      items: [],
    },
    fields: ["style", "items"],
  },

  callout: {
    label: "Callout",
    icon: "âš ï¸",
    default: {
      variant: "info",
      content: "",
    },
    fields: ["variant", "content"],
  },

  image: {
    label: "Image",
    icon: "ðŸ–¼",
    default: {
      url: "",
      caption: "",
      alt: "",
    },
    fields: ["url", "caption", "alt"],
  },

table: {
  label: "Table",
  icon: "â–¦",
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
  icon: "ðŸ“„",
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
    icon: "â“",

    default: {
      type: "mcq",

      question: "",

      // âœ… REQUIRED
      mode: "single", // single | multi

      // âœ… ALWAYS ID-BASED OPTIONS
      options: [
        { id: "a", text: "" },
        { id: "b", text: "" },
        { id: "c", text: "" },
        { id: "d", text: "" },
      ],

      // âœ… store option IDs
      correct: [],

      explanation: "",

      // study behaviour
      revealAnswer: false,
      revealExplanation: false,

      // âœ… grouped exam config
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
    icon: "âœï¸",
    default: {
      question: "",
      answers: {},
    },
    fields: ["question", "answers"],
  },

  one_liner: {
  label: "One Liner",
  icon: "ðŸ§ ",
  default: {
    question: "",
    answer: "",
    revealAnswer: true,   // âœ… NEW
  },
  fields: ["question", "answer", "revealAnswer"],
},


  numerical: {
    label: "Numerical",
    icon: "ðŸ”¢",
    default: {
      question: "",
      answer: "",
      tolerance: 0,
      unit: "",
    },
    fields: ["question", "answer", "tolerance", "unit"],
  },

  /* ======================
     âœ… NEW â€” STEP MATH BLOCK
     ====================== */

  math_steps: {
    label: "Math Steps",
    icon: "ðŸ“",
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
  label: "",        // âœ… manual override
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


