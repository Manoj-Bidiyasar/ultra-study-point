import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import QuizClient from "./QuizClient";
import { verifyPreviewToken } from "@/lib/preview/verifyPreviewToken";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { quizId } = resolvedParams || {};
  const adminDb = getAdminDb();
  if (!adminDb || !quizId) notFound();

  const isPreview = resolvedSearchParams?.preview === "true";
  if (isPreview) {
    const token = resolvedSearchParams?.token;
    const valid = await verifyPreviewToken({
      token,
      expectedType: "quiz",
      expectedDocId: quizId,
    });
    if (!valid.ok) notFound();
  }

  const docRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("Quizzes")
    .doc(quizId);

  const snap = await docRef.get();
  if (!snap.exists) notFound();

  const data = serializeFirestoreData({
    id: snap.id,
    ...snap.data(),
  });

  if (!isPreview && data.status !== "published") {
    notFound();
  }

  return <QuizClient quiz={data} />;
}
