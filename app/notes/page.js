import NotesClient from "./NotesClient";
import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeDoc } from "@/lib/serialization/serializeDoc";

/* ================= SEO ================= */
export const metadata = {
  title: "Study Notes Hub | Ultra Study Point",
  description:
    "Study notes for Indian GK, Rajasthan GK, Science, Maths, Reasoning and more.",
};

/* ================= FORCE SSR ================= */
export const dynamic = "force-dynamic";

const getNotesIndex = unstable_cache(
  async () => {
    const adminDb = getAdminDb();
    if (!adminDb) return [];

    const colRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("master_notes");

    const snap = await colRef.orderBy("date", "desc").get();
    return snap.docs.map(serializeDoc);
  },
  ["notes-index"],
  { revalidate: 300 }
);

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


