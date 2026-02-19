import NotesClient from "./NotesClient";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { serializeDoc } from "@/lib/serialization/serializeDoc";

/* ================= SEO ================= */
export const metadata = {
  title: "Study Notes Hub | Ultra Study Point",
  description:
    "Study notes for Indian GK, Rajasthan GK, Science, Maths, Reasoning and more.",
};

/* ================= FORCE SSR ================= */
export const dynamic = "force-dynamic";

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

async function getNotesIndex() {
  const colRef = collection(
    db,
    "artifacts",
    "ultra-study-point",
    "public",
    "data",
    "master_notes"
  );

  const snap = await getDocs(
    query(colRef, where("status", "==", "published"), limit(300))
  );

  return snap.docs.map(serializeDoc).sort(byBestTimestampDesc);
}

export default async function NotesPage() {
  const notes = await getNotesIndex();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: (notes || []).slice(0, 20).map((note, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: note.title || note.slug || "Study Note",
      url: `https://www.ultrastudypoint.in/notes/${note.slug || note.id}`,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Study Notes Hub",
            description:
              "Subject-wise study notes and revision packs for competitive exams.",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": "https://www.ultrastudypoint.in/notes",
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
                url: "https://www.ultrastudypoint.in/logo.png",
              },
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemList),
        }}
      />
      <NotesClient initialNotes={notes} />
    </>
  );
}


