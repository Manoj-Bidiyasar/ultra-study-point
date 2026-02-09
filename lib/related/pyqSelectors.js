import { getAdminDb } from "@/lib/firebase/admin";

const mapPyq = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || "Untitled PYQ",
    exam: data.exam || "",
    year: data.year || "",
    questionCount: data.questionCount || 0,
    subject: data.subject || "",
  };
};

export async function getLatestPyqs({ limitCount = 2 } = {}) {
  const adminDb = getAdminDb();
  if (!adminDb) return [];

  const pyqRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("PYQs");

  const snap = await pyqRef
    .where("status", "==", "published")
    .orderBy("updatedAt", "desc")
    .limit(limitCount)
    .get();

  if (snap.empty) return [];
  return snap.docs.map(mapPyq);
}
