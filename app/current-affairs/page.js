import CurrentAffairsClient from "./CurrentAffairsClient";
import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { SITE_URL } from "@/lib/seo/siteConfig";

/* ===================== ISR (HYBRID) ===================== */
/* Revalidate every 5 minutes */
// dynamic rendering; no ISR
export const dynamic = "force-dynamic";

/* ===================== SEO (SERVER) ===================== */
export async function generateMetadata(props) {
  const searchParams = await props.searchParams;

  const activeTab =
    searchParams?.tab === "monthly" ? "monthly" : "daily";

  return {
    title:
      "Daily & Monthly Current Affairs for Competitive Exams | Ultra Study Point",
    description:
      "Daily and monthly current affairs notes for UPSC, SSC, Banking, Railways and Rajasthan exams. Exam-focused one-liners and monthly PDF compilations.",
    robots: "index, follow",
    alternates: {
      canonical: `${SITE_URL}/current-affairs?tab=${activeTab}`,
    },
    openGraph: {
      title: "Daily & Monthly Current Affairs | Ultra Study Point",
      description:
        "Exam-focused daily and monthly current affairs with PDFs.",
      url: `${SITE_URL}/current-affairs?tab=${activeTab}`,
      type: "website",
    },
  };
}


/* ===================== SERVER DATA FETCH ===================== */
const getInitialCurrentAffairs = unstable_cache(
  async () => {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return { daily: [], monthly: [] };
  }

  const baseRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  const [dailySnap, monthlySnap] = await Promise.all([
    baseRef
      .where("type", "==", "daily")
      .where("status", "==", "published")
      .orderBy("caDate", "desc")
      .limit(10)
      .get(),
    baseRef
      .where("type", "==", "monthly")
      .where("status", "==", "published")
      .orderBy("caDate", "desc")
      .limit(5)
      .get(),
  ]);

  const hasValidCaDate = (value) => {
    if (!value) return false;
    if (typeof value?.toDate === "function") {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime());
    }
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
  };

  return {
    daily: dailySnap.docs
      .filter((d) => hasValidCaDate(d.data()?.caDate))
      .map((d) => ({
        id: d.id,
        ...serializeFirestoreData(d.data()),
      })),
    monthly: monthlySnap.docs
      .filter((d) => hasValidCaDate(d.data()?.caDate))
      .map((d) => ({
        id: d.id,
        ...serializeFirestoreData(d.data()),
      })),
  };
  },
  ["current-affairs-index"],
  { revalidate: 300, tags: ["current-affairs-index"] }
);

/* ===================== PAGE ===================== */
export default async function CurrentAffairsPage(props) {
  const searchParams = await props.searchParams;

  const activeTab =
    searchParams?.tab === "monthly" ? "monthly" : "daily";

  const initialData = await getInitialCurrentAffairs();
  const listItems =
    activeTab === "monthly"
      ? initialData.monthly || []
      : initialData.daily || [];

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listItems.slice(0, 20).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title || `${item.type || activeTab} current affairs`,
      url:
        item.canonicalUrl ||
        `${SITE_URL}/current-affairs/${item.type || activeTab}/${item.slug || item.id}`,
    })),
  };

  return (
    <>
      {/* ===== BREADCRUMB SCHEMA ===== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Current Affairs",
                item: `${SITE_URL}/current-affairs`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name:
                  activeTab === "monthly"
                    ? "Monthly Current Affairs"
                    : "Daily Current Affairs",
                item: `${SITE_URL}/current-affairs?tab=${activeTab}`,
              },
            ],
          }),
        }}
      />

      {/* ===== COLLECTION PAGE SCHEMA ===== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Daily and Monthly Current Affairs",
            description:
              "Exam-oriented daily and monthly current affairs for competitive exams.",
            url: `${SITE_URL}/current-affairs?tab=${activeTab}`,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Daily & Monthly Current Affairs",
            description:
              "Daily and monthly current affairs updates with summaries and PDFs.",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/current-affairs?tab=${activeTab}`,
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
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />

      <CurrentAffairsClient
        initialDaily={initialData.daily}
        initialMonthly={initialData.monthly}
        initialTab={activeTab}
      />
    </>
  );
}


