import { notFound } from "next/navigation";
import { requireAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import PyqDetailClient from "./PyqDetailClient";
import { verifyPreviewToken } from "@/lib/preview/verifyPreviewToken";

export const dynamic = "force-dynamic";

export default async function PyqDetailPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { pyqId } = resolvedParams || {};
  const adminDb = requireAdminDb();

  if (!pyqId) notFound();

  const isPreview = resolvedSearchParams?.preview === "true";
  if (isPreview) {
    const token = resolvedSearchParams?.token;
    const valid = await verifyPreviewToken({
      token,
      expectedType: "pyq",
      expectedDocId: pyqId,
    });
    if (!valid.ok) notFound();
  }

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
  if (!isPreview && data.status !== "published") notFound();

  return <PyqDetailClient data={data} />;
}
