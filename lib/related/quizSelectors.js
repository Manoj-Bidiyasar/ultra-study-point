import { getAdminDb } from "@/lib/firebase/admin";

const formatDateKey = (value) => {
  if (!value) return "";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayKey = () => formatDateKey(new Date());

const mapQuiz = (doc, matchType = "") => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || "Untitled Quiz",
    description: data.description || data.summary || "",
    durationMinutes: data.durationMinutes ?? null,
    category: data.quizMeta?.category || data.category || "",
    quizDate: data.quizMeta?.quizDate || "",
    matchType,
  };
};

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export async function getDailyRelatedQuizzes({
  pageCaDate,
}) {
  const adminDb = getAdminDb();
  if (!adminDb) return [];

  const pageKey = formatDateKey(pageCaDate);
  const today = todayKey();
  const quizzesRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("Quizzes");

  const baseQuery = quizzesRef
    .where("status", "==", "published")
    .where("quizMeta.category", "==", "Daily CA");

  const results = [];

  if (today) {
    const todaySnap = await baseQuery
      .where("quizMeta.quizDate", "==", today)
      .limit(1)
      .get();
    if (!todaySnap.empty) {
      results.push(mapQuiz(todaySnap.docs[0], "today"));
    }
  }

  if (pageKey && pageKey !== today) {
    const sameDaySnap = await baseQuery
      .where("quizMeta.quizDate", "==", pageKey)
      .limit(1)
      .get();
    if (!sameDaySnap.empty) {
      results.push(mapQuiz(sameDaySnap.docs[0], "same-day"));
    }
  }

  if (results.length === 0) {
    const latestSnap = await baseQuery
      .orderBy("quizMeta.quizDate", "desc")
      .limit(1)
      .get();
    if (!latestSnap.empty) {
      results.push(mapQuiz(latestSnap.docs[0], "latest"));
    }
  }

  return dedupeById(results);
}

export async function getMonthlyRelatedQuizzes() {
  const adminDb = getAdminDb();
  if (!adminDb) return [];

  const quizzesRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("Quizzes");

  const snap = await quizzesRef
    .where("status", "==", "published")
    .where("quizMeta.category", "==", "Monthly CA")
    .orderBy("quizMeta.quizDate", "desc")
    .limit(1)
    .get();

  if (snap.empty) return [];
  return [mapQuiz(snap.docs[0], "latest")];
}
