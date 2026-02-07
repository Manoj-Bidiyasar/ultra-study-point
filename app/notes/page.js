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
  return <NotesClient initialNotes={notes} />;
}


