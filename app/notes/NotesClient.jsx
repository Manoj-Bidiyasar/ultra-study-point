"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORY_DEFINITIONS = [
  { id: "miscellaneous", name: "Miscellaneous", icon: "📁" },
  { id: "indian-gk", name: "Indian GK", icon: "🏛️" },
  { id: "rajasthan-gk", name: "Rajasthan GK", icon: "🏰" },
  { id: "science", name: "Science", icon: "🧪" },
  { id: "maths", name: "Maths", icon: "📐" },
  { id: "reasoning", name: "Reasoning", icon: "🧠" },
];

const SUBCATEGORY_CONFIG = {
  "static-gk": { label: "Static GK", icon: "📘", color: "text-blue-600", bg: "bg-blue-50" },
  "computer-awareness": { label: "Computer Awareness", icon: "💻", color: "text-gray-700", bg: "bg-gray-50" },
  "general-awareness": { label: "General Awareness", icon: "🌐", color: "text-indigo-600", bg: "bg-indigo-50" },

  "indian-history": { label: "Indian History", icon: "📜", color: "text-orange-600", bg: "bg-orange-50" },
  "indian-geography": { label: "Indian Geography", icon: "🌍", color: "text-orange-600", bg: "bg-orange-50" },
  "indian-polity": { label: "Indian Polity", icon: "⚖️", color: "text-orange-600", bg: "bg-orange-50" },
  "indian-economy": { label: "Indian Economy", icon: "₹", color: "text-orange-600", bg: "bg-orange-50" },
  "indian-art-culture": { label: "Art & Culture", icon: "🎨", color: "text-orange-600", bg: "bg-orange-50" },

  "rajasthan-history": { label: "History of Rajasthan", icon: "🏕️", color: "text-red-600", bg: "bg-red-50" },
  "rajasthan-geography": { label: "Geography of Rajasthan", icon: "📍", color: "text-red-600", bg: "bg-red-50" },
  "rajasthan-polity": { label: "Admin & Polity", icon: "⚖️", color: "text-red-600", bg: "bg-red-50" },
  "rajasthan-economy": { label: "Economy", icon: "💰", color: "text-red-600", bg: "bg-red-50" },
  "rajasthan-art-culture": { label: "Art & Culture", icon: "🖌️", color: "text-red-600", bg: "bg-red-50" },

  "general-science": { label: "General Science", icon: "🔬", color: "text-green-600", bg: "bg-green-50" },
  physics: { label: "Physics", icon: "⚛️", color: "text-green-600", bg: "bg-green-50" },
  chemistry: { label: "Chemistry", icon: "🧪", color: "text-green-600", bg: "bg-green-50" },
  biology: { label: "Biology", icon: "🧬", color: "text-green-600", bg: "bg-green-50" },
  "environment-ecology": { label: "Env. & Ecology", icon: "🌱", color: "text-green-600", bg: "bg-green-50" },
  "science-technology": { label: "Science & Technology", icon: "🚀", color: "text-green-600", bg: "bg-green-50" },

  "number-system": { label: "Number System", icon: "#", color: "text-blue-600", bg: "bg-blue-50" },
  arithmetic: { label: "Arithmetic", icon: "🧮", color: "text-blue-600", bg: "bg-blue-50" },
  algebra: { label: "Algebra", icon: "🧮", color: "text-blue-600", bg: "bg-blue-50" },
  geometry: { label: "Geometry", icon: "📐", color: "text-blue-600", bg: "bg-blue-50" },
  trigonometry: { label: "Trigonometry", icon: "sinθ", color: "text-blue-600", bg: "bg-blue-50" },
  mensuration: { label: "Mensuration", icon: "🧊", color: "text-blue-600", bg: "bg-blue-50" },
  "data-interpretation": { label: "Data Interpretation", icon: "📊", color: "text-blue-600", bg: "bg-blue-50" },
  "advanced-maths": { label: "Advanced Maths", icon: "√x", color: "text-blue-600", bg: "bg-blue-50" },

  "logical-reasoning": { label: "Logical Reasoning", icon: "🔍", color: "text-purple-600", bg: "bg-purple-50" },
  "verbal-reasoning": { label: "Verbal Reasoning", icon: "🗣️", color: "text-purple-600", bg: "bg-purple-50" },
  "non-verbal-reasoning": { label: "Non-Verbal Reasoning", icon: "▲ ■ ●", color: "text-purple-600", bg: "bg-purple-50" },
  "analytical-reasoning": { label: "Analytical Reasoning", icon: "🧩", color: "text-purple-600", bg: "bg-purple-50" },
};

const CATEGORY_TO_SUBCATEGORIES = {
  "miscellaneous": ["static-gk", "computer-awareness", "general-awareness"],
  "indian-gk": [
    "indian-history",
    "indian-geography",
    "indian-polity",
    "indian-economy",
    "indian-art-culture",
  ],
  "rajasthan-gk": [
    "rajasthan-history",
    "rajasthan-geography",
    "rajasthan-polity",
    "rajasthan-economy",
    "rajasthan-art-culture",
  ],
  science: [
    "general-science",
    "physics",
    "chemistry",
    "biology",
    "environment-ecology",
    "science-technology",
  ],
  maths: [
    "number-system",
    "arithmetic",
    "algebra",
    "geometry",
    "trigonometry",
    "mensuration",
    "data-interpretation",
    "advanced-maths",
  ],
  reasoning: [
    "logical-reasoning",
    "verbal-reasoning",
    "non-verbal-reasoning",
    "analytical-reasoning",
  ],
};

export default function NotesClient({ initialNotes }) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");
  const notes = initialNotes || [];
  const activeSection = "subject";

  const [activeCategory, setActiveCategory] = useState(() => {
    if (
      urlCategory &&
      CATEGORY_DEFINITIONS.some((c) => c.id === urlCategory)
    ) {
      return urlCategory;
    }

    const first = CATEGORY_DEFINITIONS.find((cat) =>
      notes.some((n) => n.categoryId === cat.id)
    );

    return first?.id || "";
  });

  const availableCategories = CATEGORY_DEFINITIONS.filter((cat) =>
    notes.some((note) => note.categoryId === cat.id)
  );

  const filteredNotes = notes
    .filter(
      (note) =>
        note.categoryId === activeCategory &&
        note.status === "published"
    )
    .sort((a, b) => b.date - a.date);

  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const subId = note.subCategoryId;
    if (!acc[subId]) acc[subId] = [];
    acc[subId].push(note);
    return acc;
  }, {});

  const visibleSubcategories =
    CATEGORY_TO_SUBCATEGORIES[activeCategory] || [];

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-indigo-100 shadow-sm mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_45%)]" />
          <div className="relative px-6 py-6 md:px-10 md:py-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Notes Hub
              </div>
              <h1 className="mt-4 text-2xl md:text-3xl font-extrabold">
                Master concepts with concise, exam-ready notes.
              </h1>
              <p className="mt-3 text-gray-600 text-sm md:text-base max-w-xl">
                Clear explanations, one-liners, and quick revision packs built
                for competitive exams.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/notes"
                  className="rounded-full bg-indigo-600 text-white font-semibold px-5 py-2 text-sm shadow hover:bg-indigo-700"
                >
                  Browse Notes
                </Link>
                <Link
                  href="/quiz"
                  className="rounded-full border border-gray-300 text-gray-700 font-semibold px-5 py-2 text-sm hover:border-gray-400"
                >
                  Practice Quizzes
                </Link>
              </div>
            </div>
            <div className="bg-white/90 border border-indigo-100 rounded-2xl p-5 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-500">
                Quick Highlights
              </div>
              <div className="mt-3 grid gap-3 text-sm text-gray-600">
                {["One-liner notes", "Topic-wise revision", "PDF-ready study packs"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <>
            {/* Category Grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-8">
              {CATEGORY_DEFINITIONS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const params = new URLSearchParams(window.location.search);
                    params.set("category", cat.id);
                    window.history.pushState({}, "", `/notes?${params.toString()}`);
                  }}
                  className={`p-2 md:p-3 rounded-xl border flex flex-col items-center gap-1 md:gap-2 transition-all ${
                    activeCategory === cat.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                      : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                >
                  <span className="text-lg md:text-2xl">{cat.icon}</span>
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tight text-center">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Subcategory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleSubcategories.map((subId) => {
                const meta = SUBCATEGORY_CONFIG[subId];
                if (!meta) return null;

                return (
                  <div
                    key={subId}
                    className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/notes/category/${subId}?category=${activeCategory}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${meta.bg} ${meta.color}`}>
                          {meta.icon}
                        </div>

                        <div>
                          <h3 className="text-base font-extrabold leading-tight">
                            {meta.label}
                          </h3>
                          {filteredNotes
                            .filter((note) => note.subCategoryId === subId)
                            .slice(0, 2)
                            .map((note) => (
                              <Link
                                key={note.id}
                                href={`/notes/${note.slug}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block text-[12px] text-blue-700 truncate transition-all duration-200 hover:text-indigo-600 hover:translate-x-0.5"
                              >
                                • {note.title}
                              </Link>
                            ))}
                        </div>
                      </div>

                      <span className="text-gray-300 text-xl">›</span>
                    </div>
                  </div>
                );
              })}
            </div>
        </>
      </div>
    </div>
  );
}
