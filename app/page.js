import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import HomeClient from "./HomeClient";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";

/* ================= RENDER MODE ================= */
export const dynamic = "force-dynamic";

const serializeDoc = (doc) => ({
  id: doc.id,
  ...serializeFirestoreData(doc.data()),
});

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const byBestTimestampDesc = (a, b) => {
  const aTs =
    toMillis(a.updatedAt) ||
    toMillis(a.publishDate) ||
    toMillis(a.date) ||
    toMillis(a.createdAt);
  const bTs =
    toMillis(b.updatedAt) ||
    toMillis(b.publishDate) ||
    toMillis(b.date) ||
    toMillis(b.createdAt);
  return bTs - aTs;
};

const hasValidCaDate = (value) => {
  if (!value) return false;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime());
  }
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

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

async function getHomeData() {
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

  const quizRef = collection(
    db,
    "artifacts",
    "ultra-study-point",
    "public",
    "data",
    "Quizzes"
  );
  const pyqRef = collection(
    db,
    "artifacts",
    "ultra-study-point",
    "public",
    "data",
    "PYQs"
  );

  const [dailySnap, monthlySnap, notesSnap, quizSnap, pyqSnap] = await Promise.all([
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
        limit(120)
      )
    ),
    getDocs(
      query(
        quizRef,
        where("status", "==", "published"),
        where("isDeleted", "==", false),
        limit(120)
      )
    ),
    getDocs(
      query(
        pyqRef,
        where("status", "==", "published"),
        limit(120)
      )
    ),
  ]);

  const latestNotes = notesSnap.docs.map(serializeDoc).sort(byBestTimestampDesc).slice(0, 6);
  const latestQuizzes = quizSnap.docs.map(serializeDoc).sort(byBestTimestampDesc).slice(0, 6);
  const latestPyqs = pyqSnap.docs.map(serializeDoc).sort(byBestTimestampDesc).slice(0, 6);

  return {
    dailyCA: dailySnap.docs
      .filter((d) => hasValidCaDate(d.data()?.caDate))
      .map(serializeDoc),
    monthlyCA: monthlySnap.docs
      .filter((d) => hasValidCaDate(d.data()?.caDate))
      .map(serializeDoc),
    latestNotes,
    latestQuizzes,
    latestPyqs,
  };
}

/* ================= PAGE ================= */
export default async function Page() {
  const data = await getHomeData();
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is Ultra Study Point?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Ultra Study Point provides daily current affairs, monthly compilations, and exam-focused study notes for competitive exam preparation.",
                },
              },
              {
                "@type": "Question",
                name: "Are the notes and current affairs free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Yes, most notes and current affairs content are available for free, and you can practice quizzes without login.",
                },
              },
              {
                "@type": "Question",
                name: "Which exams does Ultra Study Point cover?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "We cover SSC, Railways, Banking, RPSC, and other competitive exams with CA, notes, PYQs, and quizzes.",
                },
              },
            ],
          }),
        }}
      />

      <HomeClient
        dailyCA={data.dailyCA}
        monthlyCA={data.monthlyCA}
        latestNotes={data.latestNotes}
        latestQuizzes={data.latestQuizzes}
        latestPyqs={data.latestPyqs}
      />
    </>
  );
}

