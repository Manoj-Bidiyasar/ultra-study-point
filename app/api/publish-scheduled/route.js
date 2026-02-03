import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return Response.json(
      { success: false, error: "Firebase admin not configured" },
      { status: 500 }
    );
  }
  const now = new Date();

  const snap = await adminDb
    .collectionGroup("currentAffairs")
    .where("status", "==", "scheduled")
    .where("publishAt", "<=", now)
    .get();

  const batch = adminDb.batch();

  snap.forEach((doc) => {
    batch.update(doc.ref, {
      status: "published",
      publishedAt: new Date(),
      isLocked: true,
    });
  });

  await batch.commit();
  return Response.json({ success: true });
}
