import { formatIndianDate } from "@/lib/dates/formatters";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/siteConfig";

export function buildDailyMetadata(data) {
  const titleDate = formatIndianDate(data.caDate);
  const canonicalUrl =
    data.canonicalUrl || `${SITE_URL}/current-affairs/daily/${data.slug || ""}`;

  return {
    title:
      data.seoTitle ||
      `${titleDate} Current Affairs`,
    description: data.seoDescription || data.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      title: data.seoTitle,
      description: data.seoDescription,
      url: canonicalUrl,
      images: [
        {
          url: data.featuredImage || DEFAULT_OG_IMAGE,
        },
      ],
    },
  };
}

