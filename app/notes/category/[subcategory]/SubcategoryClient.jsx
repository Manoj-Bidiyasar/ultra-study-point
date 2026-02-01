"use client";

import Link from "next/link";

/* ================= LABEL ================= */
const formatLabel = (value = "") =>
  value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function SubcategoryClient({
  notes,
  categoryId,
  subcategory,
}) {
  const subLabel = formatLabel(subcategory);
  const catLabel = categoryId ? formatLabel(categoryId) : null;

  /* ================= SCHEMA ================= */
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Notes",
        item: "https://yourdomain.com/notes",
      },
      catLabel && {
        "@type": "ListItem",
        position: 2,
        name: catLabel,
        item: `https://yourdomain.com/notes/${categoryId}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: subLabel,
        item: `https://yourdomain.com/notes/category/${subcategory}`,
      },
    ].filter(Boolean),
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: notes.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: n.title,
      url: `https://yourdomain.com/notes/${n.slug}`,
    })),
  };

  return (
    <>
      {/* ================= SCHEMA ================= */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* ================= BREADCRUMB ================= */}
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/notes" className="hover:text-blue-600">
              Notes
            </Link>
            {categoryId && (
              <>
                {" / "}
                <Link
                  href={`/notes?category=${categoryId}`}
                  className="hover:text-blue-600"
                >
                  {catLabel}
                </Link>
              </>
            )}
            {" / "}
            <span className="font-medium text-gray-700">
              {subLabel}
            </span>
          </nav>

          {/* ================= HEADER ================= */}
          <header className="mb-6">
            <h1 className="text-3xl font-black tracking-tight">
              {subLabel} Notes
            </h1>
            <p className="text-gray-600 mt-1 max-w-2xl">
              Curated notes and explanations to help you master {subLabel}.
            </p>
          </header>

          {/* ================= NOTES ================= */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {notes.length === 0 ? (
              <p className="text-center text-gray-400 py-10">
                No notes available.
              </p>
            ) : (
              <ul className="divide-y">
                {notes.map((note) => (
                  <li key={note.id}>
                    <Link
                      href={`/notes/${note.slug}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition"
                    >
                      <h2 className="font-semibold text-gray-900">
                        {note.title}
                      </h2>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </main>
    </>
  );
}
