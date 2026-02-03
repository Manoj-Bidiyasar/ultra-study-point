import ArticleClient from "./ArticleClient";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { breadcrumbConfig } from "@/lib/breadcrumbs";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbSchema";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";

/* ================= RENDER MODE ================= */
export const dynamic = "force-dynamic";

/* ================= UTILS ================= */
function serializeFirestoreData(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === "object" && value.toDate) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreData);
  }

  if (typeof value === "object") {
    const out = {};
    for (const k in value) {
      out[k] = serializeFirestoreData(value[k]);
    }
    return out;
  }

  return value;
}

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
export async function generateMetadata(props) {
  const params = await props.params;
  const slug = params?.slug;
  const adminDb = getAdminDb();

  if (!slug || !adminDb) return {};

  const colRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  const snap = await colRef.where("slug", "==", slug).limit(1).get();

  if (snap.empty) return {};

  const data = snap.docs[0].data();

  const monthYear = formatMonthYearFromDate(data.caDate);

  const title =
    data.seoTitle ||
    `${monthYear} Monthly Compilation`;

  return {
    title,
    description: data.seoDescription || data.summary,
    keywords: data.tags || [],
    alternates: {
      canonical: data.canonicalUrl,
    },
    robots: "index,follow",

    openGraph: {
      type: "article",
      title,
      description: data.seoDescription || data.summary,
      url: data.canonicalUrl,
      siteName: "Ultra Study Point",
      images: [
        {
          url:
            data.featuredImage ||
            "https://ultrastudypoint.in/og-default.png",
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

  const snap = await colRef.where("slug", "==", slug).limit(1).get();

  if (snap.empty) notFound();

  const data = snap.docs[0].data();
  const publishedAt = data.publishedAt?.toDate?.();
  const now = new Date();

  if (!isPreview) {
    if (data.status === "draft" || data.status === "hidden") notFound();
    if (data.status === "scheduled" && publishedAt > now) notFound();
  }

  const related = await resolveRelatedContent({
    pageType: "monthly",
    subject: data.subject,
    tags: data.tags,
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
      "https://ultrastudypoint.in/og-default.png",

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
      "@id": data.canonicalUrl,
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
        url: "https://ultrastudypoint.in/logo.png",
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
