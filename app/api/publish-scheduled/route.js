import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
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
