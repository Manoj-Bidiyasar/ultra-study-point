import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import PyqDetailClient from "./PyqDetailClient";

export const dynamic = "force-dynamic";

export default async function PyqDetailPage({ params }) {
  const { pyqId } = params || {};
  const adminDb = getAdminDb();

  if (!adminDb || !pyqId) notFound();

  const docRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("PYQs")
    .doc(pyqId);

  const snap = await docRef.get();
  if (!snap.exists) notFound();

  const data = serializeFirestoreData({ id: snap.id, ...snap.data() });
  if (data.status !== "published") notFound();

  return <PyqDetailClient data={data} />;
}
