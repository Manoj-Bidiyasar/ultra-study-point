import ArticleClient from "./ArticleClient";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbs/buildBreadcrumbSchema";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { unstable_cache } from "next/cache";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/siteConfig";
import { verifyPreviewToken } from "@/lib/preview/verifyPreviewToken";

export const dynamic = "force-dynamic";

function toJsDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d?.getTime?.()) ? null : d;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatMonthYearFromDate(caDate) {
  const date = toJsDate(caDate);
  if (!date) return "";
  const month = date.toLocaleString("en-IN", { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

const getMonthlyBySlug = unstable_cache(
  async (slugOrId) => {
    const adminDb = getAdminDb();
    if (!adminDb) return null;

    const colRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("currentAffairs");

    const snap = await colRef.where("slug", "==", slugOrId).limit(1).get();
    if (!snap.empty) {
      return { id: snap.docs[0].id, data: snap.docs[0].data() };
    }

    const direct = await colRef.doc(slugOrId).get();
    if (!direct.exists) return null;
    return { id: direct.id, data: direct.data() };
  },
  (slugOrId) => ["monthly-ca", slugOrId],
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
    data.canonicalUrl || `${SITE_URL}/current-affairs/monthly/${data.slug || slug}`;
  const title = data.seoTitle || `${monthYear} Monthly Compilation`;

  return {
    title,
    description: data.seoDescription || data.summary,
    keywords: data.tags || [],
    alternates: { canonical: canonicalUrl },
    robots: "index,follow",
    openGraph: {
      type: "article",
      title,
      description: data.seoDescription || data.summary,
      url: canonicalUrl,
      siteName: "Ultra Study Point",
      images: [{ url: data.featuredImage || DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: data.seoDescription || data.summary,
    },
  };
}

export default async function MonthlyArticlePage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const adminDb = getAdminDb();

  const slug = params?.slug;
  const isPreview = searchParams?.preview === "true";

  if (isPreview) {
    const token = searchParams?.token;
    const valid = await verifyPreviewToken({
      token,
      expectedType: "monthly",
      expectedSlug: slug,
    });
    if (!valid.ok) notFound();
  }

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
    if (!snap.empty) {
      data = snap.docs[0].data();
    } else {
      const direct = await colRef.doc(slug).get();
      if (!direct.exists) notFound();
      data = direct.data();
    }
  }

  const publishedAt = toJsDate(data.publishedAt);
  const updatedAt = toJsDate(data.updatedAt);
  const caDate = toJsDate(data.caDate);
  const now = new Date();

  if (!isPreview) {
    if (data.status === "draft" || data.status === "hidden") notFound();
    if (data.status === "scheduled" && publishedAt && publishedAt > now) notFound();
  }

  const manualList = Array.isArray(data.relatedContent) ? data.relatedContent : [];
  const manualCA = manualList
    .filter((i) => (i?.type === "daily" || i?.type === "monthly") && i?.slug)
    .map((i) => ({
      ...i,
      canonicalUrl: i.canonicalUrl || `/current-affairs/${i.type}/${i.slug}`,
    }));

  const manualNotes = manualList
    .filter((i) => i?.type === "notes" && i?.slug)
    .map((i) => ({ slug: i.slug, title: i.title || i.slug }));

  const related = await resolveRelatedContent({
    pageType: "monthly",
    pageCaDate: caDate,
    subject: data.subject,
    tags: data.tags,
    manualCA,
    manualNotes,
  });

  const monthYear = formatMonthYearFromDate(caDate);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.seoTitle || `${monthYear} Monthly Compilation`,
    description: data.seoDescription || data.summary,
    articleSection: ["Current Affairs", "Monthly Compilation", monthYear],
    image: data.featuredImage || DEFAULT_OG_IMAGE,
    datePublished: publishedAt?.toISOString() || updatedAt?.toISOString(),
    dateModified: updatedAt?.toISOString(),
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
      "@id": data.canonicalUrl || `${SITE_URL}/current-affairs/monthly/${data.slug || slug}`,
    },
    author: { "@type": "Organization", name: "Ultra Study Point" },
    publisher: {
      "@type": "Organization",
      name: "Ultra Study Point",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
  };

  const breadcrumbItems = [
    { label: "Current Affairs", href: "/current-affairs" },
    { label: "Monthly", href: "/current-affairs?tab=monthly" },
    { label: `${monthYear || "Monthly"} Compilation`, href: null },
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
