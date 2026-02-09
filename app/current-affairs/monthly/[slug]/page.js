import ArticleClient from "./ArticleClient";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { breadcrumbConfig } from "@/lib/breadcrumbs/config";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbs/buildBreadcrumbSchema";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { unstable_cache } from "next/cache";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/siteConfig";

/* ================= RENDER MODE ================= */
export const dynamic = "force-dynamic";

/* ================= UTILS ================= */

/* ===== DATE FORMATTER ===== */
function formatMonthYearFromDate(caDate) {
  if (!caDate) return "";

  const date =
    typeof caDate === "string"
      ? new Date(caDate)
      : caDate?.toDate?.() || new Date(caDate);

  const month = date.toLocaleString("en-IN", {
    month: "long",
  });

  const year = date.getFullYear();

  return `${month} ${year}`;
}

/* ================= SEO ================= */
const getMonthlyBySlug = unstable_cache(
  async (slug) => {
    const adminDb = getAdminDb();
    if (!adminDb) return null;

    const colRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("currentAffairs");

    const snap = await colRef.where("slug", "==", slug).limit(1).get();
    if (snap.empty) return null;

    return {
      id: snap.docs[0].id,
      data: snap.docs[0].data(),
    };
  },
  (slug) => ["monthly-ca", slug],
  { revalidate: 600 }
);

export async function generateMetadata(props) {
  const params = await props.params;
  const slug = params?.slug;
  const adminDb = getAdminDb();

  if (!slug || !adminDb) return {};

  const cached = await getMonthlyBySlug(slug);
  if (!cached) return {};
  const data = cached.data;

  const monthYear = formatMonthYearFromDate(data.caDate);
  const canonicalUrl =
    data.canonicalUrl || `${SITE_URL}/current-affairs/monthly/${slug}`;

  const title =
    data.seoTitle ||
    `${monthYear} Monthly Compilation`;

  return {
    title,
    description: data.seoDescription || data.summary,
    keywords: data.tags || [],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: "index,follow",

    openGraph: {
      type: "article",
      title,
      description: data.seoDescription || data.summary,
      url: canonicalUrl,
      siteName: "Ultra Study Point",
      images: [
        {
          url: data.featuredImage || DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description: data.seoDescription || data.summary,
    },
  };
}

/* ================= PAGE ================= */
export default async function MonthlyArticlePage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const adminDb = getAdminDb();

  const slug = params?.slug;
  const isPreview = searchParams?.preview === "true";

  if (!slug) notFound();
  if (!adminDb) notFound();

  const colRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  const cached = isPreview ? null : await getMonthlyBySlug(slug);
  let data = cached?.data || null;

  if (!data) {
    const snap = await colRef.where("slug", "==", slug).limit(1).get();
    if (snap.empty) notFound();
    data = snap.docs[0].data();
  }
  const publishedAt = data.publishedAt?.toDate?.();
  const now = new Date();

  if (!isPreview) {
    if (data.status === "draft" || data.status === "hidden") notFound();
    if (data.status === "scheduled" && publishedAt > now) notFound();
  }

  const manualList = Array.isArray(data.relatedContent)
    ? data.relatedContent
    : [];

  const manualCA = manualList
    .filter(
      (i) =>
        (i?.type === "daily" || i?.type === "monthly") &&
        i?.slug
    )
    .map((i) => ({
      ...i,
      canonicalUrl:
        i.canonicalUrl ||
        `/current-affairs/${i.type}/${i.slug}`,
    }));

  const manualNotes = manualList
    .filter((i) => i?.type === "notes" && i?.slug)
    .map((i) => ({
      slug: i.slug,
      title: i.title || i.slug,
    }));

  const related = await resolveRelatedContent({
    pageType: "monthly",
    pageCaDate: data.caDate?.toDate?.(),
    subject: data.subject,
    tags: data.tags,
    manualCA,
    manualNotes,
  });

  const monthYear = formatMonthYearFromDate(data.caDate);

  /* ===== SCHEMA ===== */
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      data.seoTitle ||
      `${monthYear} Monthly Compilation`,
    description: data.seoDescription || data.summary,
    articleSection: [
      "Current Affairs",
      "Monthly Compilation",
      monthYear,
    ],
    image:
      data.featuredImage ||
      DEFAULT_OG_IMAGE,

    datePublished:
      publishedAt?.toISOString() ||
      data.updatedAt?.toDate?.()?.toISOString(),

    dateModified: data.updatedAt?.toDate?.().toISOString(),

    associatedMedia: data.pdfUrl
      ? {
          "@type": "MediaObject",
          contentUrl: data.pdfUrl,
          encodingFormat: "application/pdf",
          name: `${monthYear} Monthly Current Affairs PDF`,
        }
      : undefined,

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": data.canonicalUrl || `${SITE_URL}/current-affairs/monthly/${slug}`,
    },

    author: {
      "@type": "Organization",
      name: "Ultra Study Point",
    },

    publisher: {
      "@type": "Organization",
      name: "Ultra Study Point",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  const breadcrumbItems = [
    ...breadcrumbConfig.monthly.baseNoHome,
    {
      label: monthYear,
      href: data.canonicalUrl,
    },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);

  return (
    <ArticleClient
      data={serializeFirestoreData(data)}
      related={serializeFirestoreData(related)}
      schema={[articleSchema, breadcrumbSchema]}
      breadcrumbs={breadcrumbItems}
    />
  );
}


