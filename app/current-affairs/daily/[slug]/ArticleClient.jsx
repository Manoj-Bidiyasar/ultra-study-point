"use client";

import dynamic from "next/dynamic";
import UniversalRenderer from "@/components/content/renderer/UniversalRenderer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatIndianDate } from "@/lib/dates/formatters";

const RelatedContent = dynamic(
  () => import("@/components/related/RelatedContent"),
  { loading: () => <div className="text-sm text-gray-500">Loading…</div> }
);

export default function ArticleClient({ data, schema, breadcrumbs, related }) {
  const dateLabel = formatIndianDate(data.caDate);
  const headingTitle = dateLabel
    ? `${dateLabel} Current Affairs`
    : data.title || "Daily Current Affairs";

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
      <header className="py-4 md:py-10 mb-5 md:mb-12 bg-gray-200 border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/*LEFT TITLE*/}
          {/*MAIN HEADING*/}
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <h1 className="text-xl md:text-4xl font-extrabold leading-[1.1] m-0 text-center md:text-left">
                {headingTitle}
              </h1>
              <span className="inline-flex items-center align-middle rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] md:text-xs font-semibold leading-none text-blue-700">
                Daily Update
              </span>
            </div>
              {/* SUMMARY */}
              {data.summary && (
                <p className="mt-2 md:mt-4 text-sm md:text-base text-gray-700">
                  {data.summary}
                </p>
              )}
              
              {/* TAGS */}
              {data.tags?.length > 0 && (
                <div className="mt-2 md:mt-4 flex flex-wrap gap-1.5 md:gap-2">
                  {data.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 md:px-3 py-0.5 md:py-1 text-[11px] md:text-xs font-semibold bg-blue-100 text-blue-700 rounded-full"
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
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-7">
      {/* MAIN ARTICLE COLUMN */}
      <div className="space-y-10" itemProp="articleBody">
        
        {/* ================= MAIN CONTENT ================= */}
<article className="bg-white rounded-xl shadow p-6">

  <UniversalRenderer
    blocks={data.content?.blocks || []}
    pageType="daily"
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

