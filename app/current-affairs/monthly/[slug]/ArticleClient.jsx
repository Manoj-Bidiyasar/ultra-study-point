"use client";

import dynamic from "next/dynamic";
import UniversalRenderer from "@/components/content/renderer/UniversalRenderer";
import Breadcrumbs from "@/components/Breadcrumbs";

const RelatedContent = dynamic(
  () => import("@/components/related/RelatedContent"),
  { ssr: false }
);
const getMonthYearFromDate = (dateValue) => {
  if (!dateValue) return { month: "", year: "" };

  const date = new Date(dateValue);

  const month = date.toLocaleString("en-IN", {
    month: "long",
  });

  const year = date.getFullYear();

  return { month, year };
};

const capitalize = (str = "") =>
  str.charAt(0).toUpperCase() + str.slice(1);

export default function ArticleClient({
  data,
  schema,
  breadcrumbs,
  related,
}) {
  const { month, year } = getMonthYearFromDate(data.caDate);

const title = `${month} ${year} Monthly Compilation`;


  return (
    <main>
      {/* JSON-LD */}
      {schema.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}

      <article className="min-h-screen bg-gray-100 pb-16">
        <Breadcrumbs items={breadcrumbs} />

        {/* HEADER */}

        <header className="py-10 mb-12 bg-gray-200 border-b">
          <div className="max-w-7xl mx-auto px-6">
            <h1 className="text-3xl md:text-4xl font-extrabold">
              {title}
            </h1>
              <p className="mt-2 text-lg font-semibold text-gray-700">
                Monthly Update
              </p>
              {data.summary && (
                <p className="mt-4 text-gray-700 max-w-4xl">
                  {data.summary}
                </p>
              )}
              
              {/* TAGS */}
              {data.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full"
                    >
                      #{tag}
                    </span>
                   ))}
                </div>
              )}
          </div>
        </header>

        {/* CONTENT */}
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-10">
            {/* ================= MAIN CONTENT ================= */}
<article className="bg-white rounded-xl shadow p-6">

  <UniversalRenderer
    blocks={data.content?.blocks || []}
  />

</article>


            {/* FORCE DOWNLOAD PDF */}
            {/* 📄 PDF DOWNLOAD — MONTHLY (FORCE DOWNLOAD) */}
            {data.type === "monthly" &&
  typeof data.pdfUrl === "string" &&
  data.pdfUrl.trim() !== "" && (

                <div className="mt-16 flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-red-200 rounded-3xl text-center">
                    {/* ICON */}
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4">
                        📄
                    </div>

                    {/* TITLE */}
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {month} {year} Monthly Compilation PDF

                    </h3>

                    {/* DESCRIPTION */}
                    <p className="text-gray-500 text-sm mb-6">
                         Download the complete {month} {year} current affairs magazine for offline study.
  magazine for offline study.
                    </p>

                    {/* DOWNLOAD BUTTON */}
                    <a
                      href={data.pdfUrl}
                      download
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg transition"
                    >
                        Download PDF
                    </a>

                    {/* CTA */}
                    <p className="mt-3 text-red-600 text-xs font-bold uppercase tracking-widest animate-pulse">
                        Click here to download
                    </p>
                </div>
            )}


            {/* PREV / NEXT */}
            <nav className="flex justify-between text-sm font-semibold pt-10">
              {data.prev ? (
                <a
                  href={`/current-affairs/monthly/${data.prev.slug}`}
                  className="text-red-600"
                >
                  ← Previous Month
                </a>
              ) : (
                <span />
              )}
              {data.next && (
                <a
                  href={`/current-affairs/monthly/${data.next.slug}`}
                  className="text-red-600"
                >
                  Next Month →
                </a>
              )}
            </nav>
          </div>

          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              {related && (
                <RelatedContent
                  data={related}
                  pageType="monthly"
                />
              )}
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
