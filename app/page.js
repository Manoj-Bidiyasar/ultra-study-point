import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import HomeClient from "./HomeClient";

/* ================= ISR ================= */
export const revalidate = 300;

/* ================= DEEP SERIALIZER ================= */
const deepSerialize = (value) => {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (Array.isArray(value)) {
    return value.map(deepSerialize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, deepSerialize(v)])
    );
  }

  return value;
};

const serializeDoc = (doc) => ({
  id: doc.id,
  ...deepSerialize(doc.data()),
});

/* ================= SEO METADATA ================= */
export async function generateMetadata() {
  return {
    title: "Ultra Study Point – Daily Current Affairs & Study Notes",
    description:
      "Ultra Study Point provides daily current affairs, monthly compilations, and exam-oriented study notes for competitive exams in India.",
    alternates: {
      canonical: "https://www.ultrastudypoint.in",
    },
    openGraph: {
      title: "Ultra Study Point – Daily Current Affairs & Notes",
      description:
        "Daily and monthly current affairs with concise study notes for competitive exams.",
      url: "https://www.ultrastudypoint.in",
      siteName: "Ultra Study Point",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Ultra Study Point",
      description:
        "Daily Current Affairs & Study Notes for Competitive Exams",
    },
  };
}

/* ================= PAGE ================= */
export default async function Page() {
  const caRef = collection(
    db,
    "artifacts",
    "ultra-study-point",
    "public",
    "data",
    "currentAffairs"
  );

  const notesRef = collection(
    db,
    "artifacts",
    "ultra-study-point",
    "public",
    "data",
    "master_notes"
  );

  const [dailySnap, monthlySnap, notesSnap] = await Promise.all([
    getDocs(
      query(
        caRef,
        where("type", "==", "daily"),
        where("status", "==", "published"),
        orderBy("caDate", "desc"),
        limit(3)
      )
    ),
    getDocs(
      query(
        caRef,
        where("type", "==", "monthly"),
        where("status", "==", "published"),
        orderBy("caDate", "desc"),
        limit(3)
      )
    ),
    getDocs(
      query(
        notesRef,
        where("status", "==", "published"),        
        orderBy("updatedAt", "desc"),
        limit(6)
      )
    ),
  ]);

  return (
    <>
      {/* ===== STRUCTURED DATA ===== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: "Ultra Study Point",
            url: "https://www.ultrastudypoint.in",
            description:
              "Daily current affairs, monthly compilations and exam-oriented study notes for competitive exams in India.",
          }),
        }}
      />

      <HomeClient
        dailyCA={dailySnap.docs.map(serializeDoc)}
        monthlyCA={monthlySnap.docs.map(serializeDoc)}
        latestNotes={notesSnap.docs.map(serializeDoc)}
      />
    </>
  );
}
