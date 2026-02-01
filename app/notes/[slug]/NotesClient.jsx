"use client";

import Link from "next/link";
import Head from "next/head";
import { useEffect } from "react";
import UniversalRenderer from "@/components/content/renderer/UniversalRenderer";


export default function NotesClient({
  mode,
  note,
  notes,
  breadcrumbSchema,
}) {
  /* ================= KaTeX AUTO RENDER ================= */
  useEffect(() => {
    if (typeof window !== "undefined" && window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
      });
    }
  }, []);

  /* ================= SUBCATEGORY LIST ================= */
  if (mode === "list") {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.slug}`}
              className="bg-white p-4 rounded-xl border hover:shadow-md transition"
            >
              <h3 className="font-bold">{n.title}</h3>
              {n.topic && (
                <span className="inline-block mt-1 text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {n.topic}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ================= NOTE PAGE ================= */
  const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: note.title,
  description: note.seoDescription || note.summary,
  articleSection: note.category || "Notes",

  articleBody: note.blocks
    ?.map((block) => {
      if (block.type === "heading") return block.text;
      if (block.type === "markdown") return block.content;
      if (block.type === "points") return block.items?.join(" ");
      return "";
    })
    .join(" ")
    .slice(0, 5000),
};

  return (
    <>
      {/* ================= SEO / SCHEMA ================= */}
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
        />
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
        />
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleSchema),
          }}
        />

        {breadcrumbSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(breadcrumbSchema),
            }}
          />
        )}
      </Head>

      {/* ================= PAGE UI ================= */}
      <article className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-100 pb-20">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/notes" className="hover:underline">
              Notes
            </Link>
            {note.category && <> › {note.category}</>}
            {note.subCategory && <> › {note.subCategory}</>}
          </nav>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
            {note.title}
          </h1>

          {/* Summary */}
          {note.summary && (
            <div className="bg-white/90 border-l-4 border-blue-500 rounded-xl p-5 mb-8">
              <h3 className="font-semibold mb-1">Summary</h3>
              <p className="text-gray-700">{note.summary}</p>
            </div>
          )}

          {/* Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Main Content */}
            <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-lg">
              <UniversalRenderer
  blocks={Array.isArray(note.blocks) ? note.blocks : []}
/>

            </div>

            {/* Related Content */}
            {note.relatedContent?.length > 0 && (
              <aside className="bg-white rounded-2xl shadow-lg p-4 md:p-6 md:sticky md:top-6 h-fit">
                <h3 className="font-bold mb-4">Related Content</h3>
                <ul className="space-y-2">
                  {note.relatedContent.map((item, i) => (
                    <li key={i}>
                      <Link
                        href={`/notes/${item.slug}`}
                        className="hover:underline"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
