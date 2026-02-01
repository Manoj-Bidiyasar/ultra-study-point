import { formatIndianDate } from "@/lib/dateFormatters";

export function buildDailyMetadata(data) {
  const titleDate = formatIndianDate(data.caDate);

  return {
    title:
      data.seoTitle ||
      `${titleDate} Current Affairs`,
    description: data.seoDescription || data.summary,
    alternates: {
      canonical: data.canonicalUrl,
    },
    openGraph: {
      type: "article",
      title: data.seoTitle,
      description: data.seoDescription,
      images: [
        {
          url:
            data.featuredImage ||
            "https://ultrastudypoint.in/og-default.png",
        },
      ],
    },
  };
}
