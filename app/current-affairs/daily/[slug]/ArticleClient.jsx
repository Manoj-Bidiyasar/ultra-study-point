"use client";

import dynamic from "next/dynamic";
import UniversalRenderer from "@/components/content/renderer/UniversalRenderer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatIndianDate } from "@/lib/dateFormatters";

const RelatedContent = dynamic(
  () => import("@/components/related/RelatedContent"),
  { loading: () => <div className="text-sm text-gray-500">Loading…</div> }
);

export default function ArticleClient({ data, schema, breadcrumbs, related }) {
  return (
    <main>
      {/* SEO: JSON-LD Schema */}
      {schema &&
        (Array.isArray(schema) ? schema : [schema]).map((item, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(item),
            }}
          />
        ))}

      <article className="min-h-screen bg-gray-100 pb-16">
        {/* ✅ ONLY RENDER — DO NOT BUILD */}
        <Breadcrumbs items={breadcrumbs} />
      {/* HEADER */}
      <header className="py-10 mb-12 bg-gray-200 border-b">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/*LEFT TITLE*/}
          {/*MAIN HEADING*/}
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold">
              {formatIndianDate(data.caDate)} Current Affairs
            </h1>
            {/* SUB HEADING */}
              <p className="mt-2 text-lg font-semibold text-gray-700">
                Daily Update
              </p>
              {/* SUMMARY */}
              {data.summary && (
                <p className="mt-4 text-gray-700 max-w-3xl">
                  {data.summary}
                </p>
              )}
              
              {/* TAGS */}
              {data.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
              </div>
              )}
            </div>
        </div>
      </header>
        

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* MAIN ARTICLE COLUMN */}
      <div className="space-y-10" itemProp="articleBody">
        
        {/* ================= MAIN CONTENT ================= */}
<article className="bg-white rounded-xl shadow p-6">

  <UniversalRenderer
    blocks={data.content?.blocks || []}
  />

</article>


        {/* 📱 MOBILE: Related Content (ABOVE Prev/Next) */}
        {related && (
          <div className="block lg:hidden mt-12">
            <RelatedContent data={related} pageType="daily" />
          </div>
        )}
            
        {/* PREV / NEXT */}
        <nav
          className="flex justify-between pt-10 text-sm font-semibold"
          aria-label="Pagination"
        >
          {data.prev ? (
            <a
              rel="prev"
              href={`/current-affairs/daily/${data.prev.slug}`}
              className="text-blue-600 hover:underline"
            >
              ← Previous Day Current Affairs
            </a>
          ) : (
            <span />
          )}

          {data.next && (
            <a
              rel="next"
              href={`/current-affairs/daily/${data.next.slug}`}
              className="text-blue-600 hover:underline"
            >
              Next Day Current Affairs →
            </a>
          )}
        </nav>
      </div>
      {/* ================= DESKTOP SIDEBAR COLUMN ================= */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          {related && (
            <RelatedContent data={related} pageType="daily" />
          )}
        </div>
      </aside>
    </div>

    </article>
  </main>
);
}
