"use client";

import Link from "next/link";
import Head from "next/head";
import { useEffect, useState } from "react";
import UniversalRenderer from "@/components/content/renderer/UniversalRenderer";
import CurrentAffairsBlock from "@/components/related/CurrentAffairsBlock";
import ImportantNotesBlock from "@/components/related/ImportantNotesBlock";
import LatestQuizBlock from "@/components/related/LatestQuizBlock";
import PyqBlock from "@/components/related/PyqBlock";


export default function NotesClient({
  mode,
  note,
  notes,
  breadcrumbSchema,
  relatedCA,
}) {
  const formatUpdatedAt = (value) => {
    if (!value) return "";
    const d = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
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

  const showSidebar =
    (note.relatedContent?.length || 0) > 0 ||
    (relatedCA?.currentAffairs?.length || 0) > 0 ||
    (relatedCA?.importantNotes?.length || 0) > 0 ||
    (relatedCA?.latestQuizzes?.length || 0) > 0 ||
    (relatedCA?.pyqs?.length || 0) > 0;
  const [isRelatedOpen, setIsRelatedOpen] = useState(false);


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
          {/* Header */}
          <header className="mb-6">
            <nav className="text-sm text-gray-500 mb-2">
              <Link href="/notes" className="hover:underline">
                Notes
              </Link>
              {note.category && <> {"›"} {note.category}</>}
              {note.subCategory && <> {"›"} {note.subCategory}</>}
            </nav>

            {(note.subCategory || note.topic || note.category) && (
              <div className="text-xs font-semibold uppercase tracking-widest text-sky-600 mb-2">
                {note.subCategory || note.topic || note.category}
              </div>
            )}

            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
              {note.title}
            </h1>

            {Array.isArray(note.tags) && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {note.updatedAt && (
              <div className="mt-3 text-xs text-gray-500">
                Last updated {formatUpdatedAt(note.updatedAt)}
              </div>
            )}
          </header>

          {/* Summary */}
          {note.summary && (
            <div className="bg-white/90 border-l-4 border-sky-500 rounded-2xl p-5 mb-6">
              <h3 className="font-semibold mb-1">Summary</h3>
              <p className="text-gray-700">{note.summary}</p>
            </div>
          )}

          {/* Layout */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            {/* Main Content */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg min-h-[360px]">
              <UniversalRenderer
                blocks={Array.isArray(note.blocks) ? note.blocks : []}
              />
            </div>

            {/* Related Content */}
            {showSidebar && (
              <aside className="bg-white rounded-2xl shadow-lg p-0 md:p-6 h-fit md:sticky md:top-6">
                <button
                  type="button"
                  className="md:hidden w-full rounded-xl bg-sky-500 text-white font-semibold py-3 px-4 text-center"
                  onClick={() => setIsRelatedOpen((s) => !s)}
                >
                  Related Content
                </button>

                <div
                  className={`px-4 pb-4 pt-4 md:p-0 ${
                    isRelatedOpen ? "block" : "hidden md:block"
                  }`}
                >
                  <div className="space-y-6">
                    {note.relatedContent?.length > 0 && (
                      <section>
                        <h3 className="font-bold mb-4">Related Notes</h3>
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
                      </section>
                    )}

                    {relatedCA?.currentAffairs?.length > 0 && (
                      <CurrentAffairsBlock
                        items={relatedCA.currentAffairs}
                        pageType="notes"
                      />
                    )}

                    {relatedCA?.latestQuizzes?.length > 0 && (
                      <LatestQuizBlock items={relatedCA.latestQuizzes} />
                    )}

                    {relatedCA?.pyqs?.length > 0 && (
                      <PyqBlock items={relatedCA.pyqs} />
                    )}

                    {relatedCA?.importantNotes?.length > 0 && (
                      <ImportantNotesBlock items={relatedCA.importantNotes} />
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
