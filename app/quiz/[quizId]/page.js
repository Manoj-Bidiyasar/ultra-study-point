import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import QuizClient from "./QuizClient";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }) {
  const { quizId } = params;
  const adminDb = getAdminDb();
  if (!adminDb || !quizId) notFound();

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

  if (data.status !== "published") {
    notFound();
  }

  return <QuizClient quiz={data} />;
}
