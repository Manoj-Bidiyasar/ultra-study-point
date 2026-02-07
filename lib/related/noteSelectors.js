import { getAdminDb } from "@/lib/firebase/admin";

export async function getImportantNotes({
  pageType,
  subject,
  tags = [],
  device
}) {
  const adminDb = getAdminDb();
  if (!adminDb) return [];
  const limit = device === "desktop" ? 6 : 4;

  let query = adminDb
    .collection("master_notes")
    .where("status", "==", "published");

  if (subject) {
    query = query.where("subject", "==", subject);
  }

  const snap = await query.limit(limit).get();

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
}


