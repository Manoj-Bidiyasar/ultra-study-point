import ArticleClient from "./ArticleClient";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { breadcrumbConfig } from "@/lib/breadcrumbs/config";
import { buildBreadcrumbSchema } from "@/lib/breadcrumbs/buildBreadcrumbSchema";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { unstable_cache } from "next/cache";
import { formatIndianDate } from "@/lib/dates/formatters";

/* ================= RENDER MODE ================= */
export const dynamic = "force-dynamic";

/* ================= DATE ================= */

const getDailyBySlug = unstable_cache(
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
  (slug) => ["daily-ca", slug],
  { revalidate: 300 }
);

/* ================= SEO ================= */
export async function generateMetadata(props) {
  const params = await props.params;
  const slug = params?.slug;
  const adminDb = getAdminDb();
  
  if (!slug || !adminDb) return {};

  const cached = await getDailyBySlug(slug);
  if (!cached) return {};

  const data = cached.data;

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
  const adminDb = getAdminDb();

  const slug = params?.slug;

  if (!slug || typeof slug !== "string") {
    notFound();
  }
  if (!adminDb) {
    notFound();
  }

  const isPreview = searchParams?.preview === "true";
  const cached = isPreview ? null : await getDailyBySlug(slug);

  const colRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  let data = cached?.data || null;
  if (!data) {
    const snap = await colRef
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snap.empty) notFound();
    data = snap.docs[0].data();
  }
  const publishedAt = data.publishedAt?.toDate?.() ?? null;
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
    pageCaDate: data.caDate?.toDate?.(),
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


