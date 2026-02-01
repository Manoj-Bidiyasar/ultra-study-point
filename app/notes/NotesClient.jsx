"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* ================= CATEGORY DEFINITIONS ================= */
const CATEGORY_DEFINITIONS = [
  { id: "miscellaneous", name: "Miscellaneous", icon: "📁" },
  { id: "indian-gk", name: "Indian GK", icon: "🏛️" },
  { id: "rajasthan-gk", name: "Rajasthan GK", icon: "🏰" },
  { id: "science", name: "Science", icon: "🧪" },
  { id: "maths", name: "Maths", icon: "📐" },
  { id: "reasoning", name: "Reasoning", icon: "🧠" },
];

/* ================= SUBCATEGORY CONFIG ================= */
const SUBCATEGORY_CONFIG = {
  "static-gk": { label: "Static GK", icon: "📘", bg: "bg-blue-50", color: "text-blue-600" },
  "computer-awareness": { label: "Computer Awareness", icon: "💻", bg: "bg-gray-50", color: "text-gray-700" },
  "general-awareness": { label: "General Awareness", icon: "🌐", bg: "bg-indigo-50", color: "text-indigo-600" },

  "indian-history": { label: "Indian History", icon: "📜", bg: "bg-orange-50", color: "text-orange-600" },
  "indian-geography": { label: "Indian Geography", icon: "🌍", bg: "bg-orange-50", color: "text-orange-600" },
  "indian-polity": { label: "Indian Polity", icon: "⚖️", bg: "bg-orange-50", color: "text-orange-600" },
  "indian-economy": { label: "Indian Economy", icon: "₹", bg: "bg-orange-50", color: "text-orange-600" },
  "indian-art-culture": { label: "Art & Culture", icon: "🎨", bg: "bg-orange-50", color: "text-orange-600" },

  "rajasthan-history": { label: "History of Rajasthan", icon: "🛕", bg: "bg-red-50", color: "text-red-600" },
  "rajasthan-geography": { label: "Geography of Rajasthan", icon: "📍", bg: "bg-red-50", color: "text-red-600" },
  "rajasthan-polity": { label: "Admin & Polity", icon: "⚖️", bg: "bg-red-50", color: "text-red-600" },
  "rajasthan-economy": { label: "Economy", icon: "💰", bg: "bg-red-50", color: "text-red-600" },
  "rajasthan-art-culture": { label: "Art & Culture", icon: "🖌️", bg: "bg-red-50", color: "text-red-600" },

  "general-science": { label: "General Science", icon: "🔬", bg: "bg-green-50", color: "text-green-600" },
  physics: { label: "Physics", icon: "⚛️", bg: "bg-green-50", color: "text-green-600" },
  chemistry: { label: "Chemistry", icon: "🧪", bg: "bg-green-50", color: "text-green-600" },
  biology: { label: "Biology", icon: "🧬", bg: "bg-green-50", color: "text-green-600" },
  "environment-ecology": { label: "Env. & Ecology", icon: "🌱", bg: "bg-green-50", color: "text-green-600" },
  "science-technology": { label: "Science & Technology", icon: "🚀", bg: "bg-green-50", color: "text-green-600" },

  "number-system": { label: "Number System", icon: "#", bg: "bg-blue-50", color: "text-blue-600" },
  arithmetic: { label: "Arithmetic", icon: "🧮", bg: "bg-blue-50", color: "text-blue-600" },
  algebra: { label: "Algebra", icon: "🧮", bg: "bg-blue-50", color: "text-blue-600" },
  geometry: { label: "Geometry", icon: "📐", bg: "bg-blue-50", color: "text-blue-600" },
  trigonometry: { label: "Trigonometry", icon: "sinθ", bg: "bg-blue-50", color: "text-blue-600" },
  mensuration: { label: "Mensuration", icon: "🧊", bg: "bg-blue-50", color: "text-blue-600" },
  "data-interpretation": { label: "Data Interpretation", icon: "📊", bg: "bg-blue-50", color: "text-blue-600" },
  "advanced-maths": { label: "Advanced Maths", icon: "√x", bg: "bg-blue-50", color: "text-blue-600" },

  "logical-reasoning": { label: "Logical Reasoning", icon: "🔍", bg: "bg-purple-50", color: "text-purple-600" },
  "verbal-reasoning": { label: "Verbal Reasoning", icon: "🗣️", bg: "bg-purple-50", color: "text-purple-600" },
  "non-verbal-reasoning": { label: "Non-Verbal Reasoning", icon: "▲ ■ ●", bg: "bg-purple-50", color: "text-purple-600" },
  "analytical-reasoning": { label: "Analytical Reasoning", icon: "🧩", bg: "bg-purple-50", color: "text-purple-600" },
};

export default function NotesClient({ initialNotes }) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");
  const notes = initialNotes || [];

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

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">

        {/* ================= TOP BANNER (RESTORED – EXACT SAME) ================= */}
        <div className="bg-[#f0f4ff] rounded-[1.5rem] md:rounded-[2rem] px-6 py-6 md:px-12 md:py-10 mb-6 flex items-center justify-between border border-blue-50 relative overflow-hidden">
          <div className="flex-1 text-left z-10">
            <h1 className="text-xl md:text-3xl font-black text-[#2d368e] mb-1">
              Study Notes Hub
            </h1>
            <p className="text-[#4a55b5] text-[10px] md:text-base font-semibold mb-4">
              Master key concepts with our detailed and concise notes.
            </p>

            <div className="flex flex-col gap-2">
              {["One-liner notes", "Notes with explanation"].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <div className="bg-[#6366f1] rounded-full p-0.5 md:p-1 shadow-sm">
                    <svg
                      className="w-2 md:w-2.5 h-2 md:h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-[#2d368e] font-semibold text-[10px] md:text-sm">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:flex relative w-32 h-32 md:w-44 md:h-44 items-center justify-center opacity-90">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
              <rect x="40" y="30" width="120" height="140" rx="10" fill="white" stroke="#2d368e" strokeWidth="2" />
              <path d="M40 50 h120 M40 70 h120 M40 90 h120 M40 110 h120" stroke="#e2e8f0" strokeWidth="2" />
              <rect x="30" y="40" width="15" height="120" rx="4" fill="#6366f1" />
              <rect x="45" y="80" width="40" height="6" fill="#fef08a" opacity="0.8" />
              <path d="M155 60 l-25 100" stroke="#6366f1" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* ================= CATEGORY GRID ================= */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-8">
          {availableCategories.map((cat) => (
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
                  ? "bg-[#2d368e] text-white border-[#2d368e] shadow-md scale-105"
                  : "bg-white border-gray-100 text-gray-600 hover:border-blue-300"
              }`}
            >
              <span className="text-lg md:text-2xl">{cat.icon}</span>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tight text-center">
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* ================= SUBCATEGORY CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(groupedNotes).map(([subId, subNotes]) => {
            const meta = SUBCATEGORY_CONFIG[subId];
            if (!meta) return null;

            return (
              <div
                key={subId}
                className="bg-white rounded-[1.2rem] px-4 py-2 border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() =>
                  (window.location.href = `/notes/category/${subId}?category=${activeCategory}`)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold ${meta.bg} ${meta.color}`}>
                      {meta.icon}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold leading-tight">
                        {meta.label}
                      </h3>
                      {subNotes.slice(0, 2).map((note) => (
                        <Link
                          key={note.id}
                          href={`/notes/${note.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="
                            block
                            text-[12px]
                            text-blue-700
                            truncate
                            transition-all
                            duration-200
                            hover:text-indigo-600
                            hover:translate-x-0.5
                          "                        
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

      </div>
    </div>
  );
}
