import NotesClient from "./NotesClient";
import { getAdminDb } from "@/lib/firebaseAdmin";

/* ================= SEO ================= */
export const metadata = {
  title: "Study Notes Hub | Ultra Study Point",
  description:
    "Study notes for Indian GK, Rajasthan GK, Science, Maths, Reasoning and more.",
};

/* ================= FORCE SSR ================= */
export const dynamic = "force-dynamic";

/* ================= SERIALIZER ================= */
function serializeDoc(doc) {
  const data = doc.data();

  const serialize = (value) => {
    if (value?.toDate instanceof Function) {
      return value.toMillis();
    }
    if (Array.isArray(value)) {
      return value.map(serialize);
    }
    if (value && typeof value === "object") {
      const obj = {};
      for (const k in value) obj[k] = serialize(value[k]);
      return obj;
    }
    return value;
  };

  return {
    id: doc.id,
    slug: doc.id,
    ...serialize(data),
  };
}

export default async function NotesPage() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return <NotesClient initialNotes={[]} />;
  }

  const colRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("master_notes");

  const snap = await colRef.orderBy("date", "desc").get();

  const notes = snap.docs.map(serializeDoc);

  return <NotesClient initialNotes={notes} />;
}
