import CurrentAffairsClient from "./CurrentAffairsClient";
import { adminDb } from "@/lib/firebaseAdmin";

/* ===================== ISR (HYBRID) ===================== */
/* Revalidate every 5 minutes */
export const revalidate = 300;

/* ===================== SAFE SERIALIZER ===================== */
/* Converts Firestore Timestamp → ISO string */
function serializeValue(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === "object") {
    const obj = {};
    for (const key in value) {
      obj[key] = serializeValue(value[key]);
    }
    return obj;
  }

  return value;
}

function serializeDoc(doc) {
  return {
    id: doc.id,
    ...serializeValue(doc.data()),
  };
}

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
      canonical: `https://ultrastudypoint.in/current-affairs?tab=${activeTab}`,
    },
    openGraph: {
      title: "Daily & Monthly Current Affairs | Ultra Study Point",
      description:
        "Exam-focused daily and monthly current affairs with PDFs.",
      url: `https://ultrastudypoint.in/current-affairs?tab=${activeTab}`,
      type: "website",
    },
  };
}


/* ===================== SERVER DATA FETCH ===================== */
async function getInitialCurrentAffairs() {
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

  return {
    daily: dailySnap.docs.map(serializeDoc),
    monthly: monthlySnap.docs.map(serializeDoc),
  };
}

/* ===================== PAGE ===================== */
export default async function CurrentAffairsPage(props) {
  const searchParams = await props.searchParams;

  const activeTab =
    searchParams?.tab === "monthly" ? "monthly" : "daily";

  const initialData = await getInitialCurrentAffairs();

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
                item: "https://ultrastudypoint.in",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Current Affairs",
                item: "https://ultrastudypoint.in/current-affairs",
              },
              {
                "@type": "ListItem",
                position: 3,
                name:
                  activeTab === "monthly"
                    ? "Monthly Current Affairs"
                    : "Daily Current Affairs",
                item: `https://ultrastudypoint.in/current-affairs?tab=${activeTab}`,
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
            url: `https://ultrastudypoint.in/current-affairs?tab=${activeTab}`,
          }),
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
