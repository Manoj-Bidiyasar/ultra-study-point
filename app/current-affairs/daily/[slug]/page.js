import ArticleClient from "./ArticleClient";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import { breadcrumbConfig } from "@/lib/breadcrumbs";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbSchema";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";
import { formatIndianDate } from "@/lib/dateFormatters";

/* ================= ISR ================= */
export const revalidate = 60; // 60 seconds ISR

/* ================= DATE ================= */
function serializeFirestoreData(value) {
  if (value === null || value === undefined) return value;

  // Firestore Timestamp
  if (typeof value === "object" && value.toDate) {
    return value.toDate().toISOString();
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(serializeFirestoreData);
  }

  // Object
  if (typeof value === "object") {
    const result = {};
    for (const key in value) {
      result[key] = serializeFirestoreData(value[key]);
    }
    return result;
  }

  return value;
}

/* ================= SEO ================= */
export async function generateMetadata(props) {
  const params = await props.params;
  const slug = params?.slug;
  
  if (!slug) return {};

  const colRef = db
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  const snap = await colRef.where("slug", "==", slug).limit(1).get();
  if (snap.empty) return {};

  const data = snap.docs[0].data();

  const publishedAt = data.publishedAt?.toDate?.().toISOString();
  const updatedAt = data.updatedAt?.toDate?.().toISOString();


  const formattedDate = formatIndianDate(data.caDate?.toDate?.());
  return {
    title: data.seoTitle || `${formattedDate} Current Affairs`,
    description: data.seoDescription || data.summary,
    keywords: data.tags || [],
    alternates: {
      canonical: data.canonicalUrl,
    },
    robots: "index,follow",

    openGraph: {
      type: "article",
      title: data.seoTitle,
      description: data.seoDescription,
      url: data.canonicalUrl,
      siteName: "Ultra Study Point",
      publishedTime: publishedAt,
      modifiedTime: updatedAt,
      images: [
        {
          url: data.featuredImage || "https://ultrastudypoint.in/og-default.png",
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

  const slug = params?.slug;

  if (!slug || typeof slug !== "string") {
    notFound();
  }

  const isPreview = searchParams?.preview === "true";
  const colRef = db
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  const snap = await colRef
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) notFound();

  const data = snap.docs[0].data();
  const publishedAt = data.publishedAt?.toDate?.() ?? null;
  const now = new Date();

  /* ===== RELATED CONTENT ===== */
  const related = await resolveRelatedContent({
    pageType: "daily",
    pageCaDate: data.caDate?.toDate?.(),
    subject: data.subject,
    tags: data.tags
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

  if (data.caDate) {
    const caDate = data.caDate.toDate();

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
    `${formatIndianDate(data.caDate?.toDate?.())} Current Affairs`,
  description:
    data.seoDescription || data.summary,
  articleSection: data.subject || "Current Affairs",
  image: data.featuredImage || "https://ultrastudypoint.in/og-default.png",

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
  dateModified: data.updatedAt?.toDate?.().toISOString(),
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": data.canonicalUrl,
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
      url: "https://ultrastudypoint.in/logo.png",
    },
    
  },
};

const breadcrumbItems = [
  ...breadcrumbConfig.daily.baseNoHome,
  {
    label: formatIndianDate(data.caDate?.toDate?.()),
    href: data.canonicalUrl,
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