export const QUIZ_TAXONOMY = [
  {
    id: "current-affairs",
    name: "Current Affairs",
    desc: "Daily and monthly current affairs quizzes.",
    legacyCategories: ["Daily CA", "Monthly CA", "Current Affairs"],
    subcategories: [
      { id: "daily-ca", name: "Daily CA" },
      { id: "monthly-ca", name: "Monthly CA" },
    ],
  },
  {
    id: "general-science",
    name: "General Science",
    desc: "Physics, Biology, Chemistry practice sets.",
    legacyCategories: ["General Science"],
    subcategories: [
      { id: "physics", name: "Physics" },
      { id: "chemistry", name: "Chemistry" },
      { id: "biology", name: "Biology" },
    ],
  },
  {
    id: "indian-gk",
    name: "Indian GK",
    desc: "Polity, History, Geography practice sets.",
    legacyCategories: ["Indian GK"],
    subcategories: [
      { id: "polity", name: "Polity" },
      { id: "economy", name: "Economy" },
      { id: "geography", name: "Geography" },
      { id: "history", name: "History" },
      { id: "culture", name: "Culture" },
    ],
  },
  {
    id: "rajasthan-gk",
    name: "Rajasthan GK",
    desc: "Culture, Polity, History practice sets.",
    legacyCategories: ["Rajasthan GK"],
    subcategories: [
      { id: "history", name: "History" },
      { id: "geography", name: "Geography" },
      { id: "polity", name: "Polity" },
      { id: "economy", name: "Economy" },
      { id: "culture", name: "Culture" },
    ],
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous",
    desc: "Awards, firsts, and important days.",
    legacyCategories: ["Miscellaneous"],
    subcategories: [
      { id: "awards", name: "Awards" },
      { id: "first-in-india", name: "First in India" },
      { id: "important-days", name: "Important Days" },
    ],
  },
  {
    id: "exams",
    name: "Exams by Pattern",
    desc: "SSC, Patwar, RPSC and other exam mocks.",
    legacyCategories: ["Exams by Pattern", "Exam", "Mock"],
    subcategories: [
      { id: "ssc", name: "SSC" },
      { id: "patwar", name: "Patwar" },
      { id: "rpsc", name: "RPSC" },
      { id: "railways", name: "Railways" },
    ],
  },
  {
    id: "mock-marathon",
    name: "Mock Marathon",
    desc: "Full-length practice tests.",
    legacyCategories: ["Mock Marathon", "Mock"],
    subcategories: [
      { id: "full-length", name: "Full Length" },
      { id: "sectional", name: "Sectional" },
    ],
  },
  {
    id: "quick-revision",
    name: "Quick Revision",
    desc: "Short quizzes for quick practice.",
    legacyCategories: ["Quick Revision"],
    subcategories: [
      { id: "one-liners", name: "One Liners" },
      { id: "mixed-practice", name: "Mixed Practice" },
    ],
  },
  {
    id: "math",
    name: "Math",
    desc: "Arithmetic, algebra, geometry practice sets.",
    legacyCategories: ["Math", "Mathematics"],
    subcategories: [
      { id: "arithmetic", name: "Arithmetic" },
      { id: "algebra", name: "Algebra" },
      { id: "geometry", name: "Geometry" },
      { id: "trigonometry", name: "Trigonometry" },
      { id: "mensuration", name: "Mensuration" },
    ],
  },
  {
    id: "reasoning",
    name: "Reasoning",
    desc: "Logical, verbal, and non-verbal practice sets.",
    legacyCategories: ["Reasoning", "Logical Reasoning"],
    subcategories: [
      { id: "logical", name: "Logical" },
      { id: "verbal", name: "Verbal" },
      { id: "non-verbal", name: "Non-Verbal" },
      { id: "analytical", name: "Analytical" },
    ],
  },
];

export const QUIZ_TAXONOMY_MAP = QUIZ_TAXONOMY.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

export const QUIZ_COURSE_OPTIONS = [
  "SSC",
  "Railway",
  "Banking",
  "RPSC",
  "State PSC",
  "UPSC",
  "Teaching",
  "Police",
  "Defence",
  "Current Affairs",
];

export const QUIZ_TYPE_OPTIONS = [
  "Mock Test",
  "Practice",
  "Sectional",
  "Full Length",
  "Previous Year",
  "Topic Wise",
  "Revision",
  "Speed Test",
];

export const QUIZ_EXAM_OPTIONS = [
  "SSC CGL",
  "SSC CHSL",
  "SSC MTS",
  "SSC CPO",
  "SSC GD",
  "RRB NTPC",
  "RRB Group D",
  "RPSC Grade 2",
  "Rajasthan Patwar",
  "UPSC CSE",
];
