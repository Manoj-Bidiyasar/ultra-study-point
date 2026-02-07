export const CATEGORY_DEFINITIONS = [
  { id: "miscellaneous", name: "Miscellaneous" },
  { id: "indian-gk", name: "Indian GK" },
  { id: "rajasthan-gk", name: "Rajasthan GK" },
  { id: "science", name: "Science" },
  { id: "maths", name: "Maths" },
  { id: "reasoning", name: "Reasoning" },
];

export const SUBCATEGORY_CONFIG = {
  "static-gk": { label: "Static GK", category: "miscellaneous" },

  "indian-history": { label: "Indian History", category: "indian-gk" },
  "indian-geography": { label: "Indian Geography", category: "indian-gk" },
  "indian-polity": { label: "Indian Polity", category: "indian-gk" },
  "indian-economy": { label: "Indian Economy", category: "indian-gk" },
  "indian-art-culture": { label: "Art & Culture", category: "indian-gk" },

  "rajasthan-history": { label: "History of Rajasthan", category: "rajasthan-gk" },
  "rajasthan-geography": { label: "Geography of Rajasthan", category: "rajasthan-gk" },
  "rajasthan-polity": { label: "Admin & Polity", category: "rajasthan-gk" },
  "rajasthan-economy": { label: "Economy", category: "rajasthan-gk" },
  "rajasthan-art-culture": { label: "Art & Culture", category: "rajasthan-gk" },

  physics: { label: "Physics", category: "science" },
  chemistry: { label: "Chemistry", category: "science" },
  biology: { label: "Biology", category: "science" },

  arithmetic: { label: "Arithmetic", category: "maths" },
  algebra: { label: "Algebra", category: "maths" },

  "logical-reasoning": { label: "Logical Reasoning", category: "reasoning" },
};
