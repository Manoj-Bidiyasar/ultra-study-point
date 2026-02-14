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
import { unstable_cache } from "next/cache";

/* ================= ISR ================= */
export const revalidate = 300;

const serializeDoc = (doc) => ({
  id: doc.id,
  ...serializeFirestoreData(doc.data()),
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

const getHomeData = unstable_cache(
  async () => {
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
        orderBy("updatedAt", "desc"),
        limit(6)
      )
    ),
    getDocs(
      query(
        quizRef,
        where("status", "==", "published"),
        orderBy("updatedAt", "desc"),
        limit(6)
      )
    ),
    getDocs(
      query(
        pyqRef,
        where("status", "==", "published"),
        orderBy("updatedAt", "desc"),
        limit(6)
      )
    ),
  ]);

  return {
    dailyCA: dailySnap.docs.map(serializeDoc),
    monthlyCA: monthlySnap.docs.map(serializeDoc),
    latestNotes: notesSnap.docs.map(serializeDoc),
    latestQuizzes: quizSnap.docs.map(serializeDoc),
    latestPyqs: pyqSnap.docs.map(serializeDoc),
  };
  },
  ["home-data"],
  { revalidate: 300 }
);

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

