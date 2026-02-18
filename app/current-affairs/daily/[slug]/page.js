import ArticleClient from "./ArticleClient";
import { notFound } from "next/navigation";
import { requireAdminDb } from "@/lib/firebase/admin";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbs/buildBreadcrumbSchema";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { unstable_cache } from "next/cache";
import { formatIndianDate } from "@/lib/dates/formatters";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo/siteConfig";
import { verifyPreviewToken } from "@/lib/preview/verifyPreviewToken";

/* ================= RENDER MODE ================= */
export const dynamic = "force-dynamic";

function getSafeAdminDb() {
  try {
    return requireAdminDb();
  } catch (err) {
    console.error("Daily slug: Firebase Admin init failed:", err?.message);
    return null;
  }
}

function toJsDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return Number.isNaN(d?.getTime?.()) ? null : d;
  }

  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    const ms =
      value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Firestore Timestamp may be de-prototyped by cache layers
  if (typeof value === "object" && typeof value._seconds === "number") {
    const ms =
      value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Firestore export-like shape
  if (
    typeof value === "object" &&
    value.type === "firestore/timestamp/1.0" &&
    typeof value.seconds === "number"
  ) {
    const ms =
      value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function resolveDailyCaDate(data) {
  return toJsDate(data?.caDate) || toJsDate(data?.dailyMeta?.caDate);
}

function extractDateFromSlug(slug) {
  if (!slug || typeof slug !== "string") return null;
  const m = slug
    .toLowerCase()
    .match(/^(\d{1,2})-(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{4})/);
  if (!m) return null;

  const day = Number(m[1]);
  const year = Number(m[3]);
  const monthMap = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const month = monthMap[m[2]];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(year, month, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ================= DATE ================= */

const getDailyBySlug = unstable_cache(
  async (slugOrId) => {
    const adminDb = getSafeAdminDb();
    if (!adminDb) return null;

    const colRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("currentAffairs");

    const snap = await colRef.where("slug", "==", slugOrId).limit(1).get();
    if (!snap.empty) {
      return {
        id: snap.docs[0].id,
        data: snap.docs[0].data(),
      };
    }

    const direct = await colRef.doc(slugOrId).get();
    if (!direct.exists) return null;
    return { id: direct.id, data: direct.data() };
  },
  (slugOrId) => ["daily-ca", slugOrId],
  { revalidate: 300 }
);

/* ================= SEO ================= */
export async function generateMetadata(props) {
  const params = await props.params;
  const slug = params?.slug;
  const adminDb = getSafeAdminDb();
  
  if (!slug || !adminDb) return {};

  let cached = await getDailyBySlug(slug);
  if (cached?.data?.status !== "published") {
    cached = null;
  }
  if (!cached) return {};

  const data = cached.data;
  const publishedAt = toJsDate(data.publishedAt)?.toISOString();
  const updatedAt = toJsDate(data.updatedAt)?.toISOString();
  const caDate = resolveDailyCaDate(data) || extractDateFromSlug(data?.slug || slug);
  const formattedDate = formatIndianDate(caDate);
  const canonicalUrl =
    data.canonicalUrl || `${SITE_URL}/current-affairs/daily/${slug}`;
  return {
    title: data.seoTitle || `${formattedDate} Current Affairs`,
    description: data.seoDescription || data.summary,
    keywords: data.tags || [],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: "index,follow",

    openGraph: {
      type: "article",
      title: data.seoTitle,
      description: data.seoDescription,
      url: canonicalUrl,
      siteName: "Ultra Study Point",
      publishedTime: publishedAt,
      modifiedTime: updatedAt,
      images: [
        {
          url: data.featuredImage || DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: data.seoTitle,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: data.seoTitle,
      description: data.seoDescription,
    },
  };
}


/* ================= PAGE ================= */
export default async function ArticlePage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const adminDb = getSafeAdminDb();

  const slug = params?.slug;

  if (!slug || typeof slug !== "string") {
    notFound();
  }
  if (!adminDb) {
    notFound();
  }

  const isPreview = searchParams?.preview === "true";
  if (isPreview) {
    const token = searchParams?.token;
    const valid = await verifyPreviewToken({
      token,
      expectedType: "daily",
      expectedSlug: slug,
    });
    if (!valid.ok) notFound();
  }
  const cached = isPreview ? null : await getDailyBySlug(slug);

  const colRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  let data = cached?.data || null;
  if (!isPreview && data?.status !== "published") {
    data = null;
  }
  if (!data) {
    const snap = await colRef
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (!snap.empty) {
      data = snap.docs[0].data();
    } else {
      const direct = await colRef.doc(slug).get();
      if (!direct.exists) notFound();
      data = direct.data();
    }
  }
  const publishedAt = toJsDate(data.publishedAt);
  const caDate = resolveDailyCaDate(data) || extractDateFromSlug(data?.slug || slug);
  const now = new Date();

  /* ===== RELATED CONTENT ===== */
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
    pageType: "daily",
    pageCaDate: caDate,
    subject: data.subject,
    tags: data.tags,
    manualCA,
    manualNotes,
  });

  /* ===== STATUS HANDLING ===== */
  if (!isPreview) {
    if (data.status === "draft" || data.status === "hidden") {
      notFound();
    }

    if (
      data.status === "scheduled" &&
      publishedAt &&
      publishedAt > now
    ) {
      notFound();
    }
  }

  /* ===== PREV / NEXT ===== */
  let prev = null;
  let next = null;

  if (caDate) {
    const prevSnap = await colRef
      .where("status", "==", "published")
      .where("caDate", "<", caDate)
      .orderBy("caDate", "desc")
      .limit(1)
      .get();

    const nextSnap = await colRef
      .where("status", "==", "published")
      .where("caDate", ">", caDate)
      .orderBy("caDate", "asc")
      .limit(1)
      .get();

    prev = prevSnap.docs[0]?.data() || null;
    next = nextSnap.docs[0]?.data() || null;
  }

  const safeData = serializeFirestoreData({
  ...data,
  prev,
  next,
});

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: 
  data.seoTitle ||
    `${formatIndianDate(caDate)} Current Affairs`,
  description:
    data.seoDescription || data.summary,
  articleSection: data.subject || "Current Affairs",
  image: data.featuredImage || DEFAULT_OG_IMAGE,

  articleBody: data.content?.blocks
  ?.map(block => {
    if (block.type === "heading") return block.text;
    if (block.type === "markdown") return block.content;
    if (block.type === "points") return block.items?.join(" ");
    return "";
  })
  .join(" ")
  .slice(0, 5000),

  datePublished: publishedAt?.toISOString(),
  dateModified: toJsDate(data.updatedAt)?.toISOString(),
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": data.canonicalUrl || `${SITE_URL}/current-affairs/daily/${slug}`,
  },
  author: {
    "@type": "Person",
    name: data.author || "Ultra Study Point Editorial Team",
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
  {
    label: "Current Affairs",
    href: "/current-affairs",
  },
  {
    label: "Daily",
    href: "/current-affairs?tab=daily",
  },
  {
    label: `${formatIndianDate(caDate) || "Daily"}`,
    href: null,
  },
];


const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);

const safeRelated = serializeFirestoreData(related);
return (
  <ArticleClient
    data={safeData}
    related={safeRelated}
    schema={[articleSchema, breadcrumbSchema]}
    breadcrumbs={breadcrumbItems}
  />
);
}


