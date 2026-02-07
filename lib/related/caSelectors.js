import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

/* Utility */
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const normalizeDate = (value) => {
  if (!value) return null;

  // Firestore Timestamp
  if (value?.toDate) value = value.toDate();

  const d = new Date(value);
  if (isNaN(d)) return null;

  d.setHours(0, 0, 0, 0);
  return d;
};

const minusDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
};

/* ================= DAILY SELECTOR ================= */
export async function getDailyCA({ pageType, pageCaDate, device }) {
  const adminDb = getAdminDb();
  if (!adminDb) return [];
  const T = today();
  const T1 = minusDays(T, 1);
  const T2 = minusDays(T, 2);

  let targetDates = [];

  if (pageType === "daily") {
    const P = normalizeDate(pageCaDate);
    if (!P) return [];

    if (P.getTime() >= T.getTime()) {
      targetDates = [T1, T2];
    } else if (P.getTime() === T1.getTime()) {
      targetDates = [T];
    } else {
      targetDates = [T, T1];
    }
  }

  if (pageType === "monthly" || pageType === "notes") {
    targetDates = pageType === "notes" ? [T, T1] : [T];
  }

  const results = [];

  for (const d of targetDates) {
    const ts = Timestamp.fromDate(d);

    const snap = await adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("currentAffairs")
      .where("caDate", "==", ts)
      .where("status", "==", "published")
      .limit(1)
      .get();

    if (!snap.empty) {
      results.push({
        type: "daily",
        ...snap.docs[0].data(),
      });
    }
  }

  return results;
}

/* ================= MONTHLY SELECTOR ================= */
export async function getMonthlyCA({ pageType, pageCaDate, device }) {
  const adminDb = getAdminDb();
  if (!adminDb) return [];
  let limit = 1;

  if (pageType === "monthly") {
    limit = 2;
  }

  const snap = await adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs")
    .where("caDate", "<=", today())
    .where("status", "==", "published")
    .orderBy("caDate", "desc")
    .limit(Math.max(limit + 3, 6))
    .get();

  const months = [];
  const pageDate = normalizeDate(pageCaDate);
  const isSameMonth = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth();

  snap.forEach((doc) => {
    const data = doc.data();
    const caDate = data?.caDate?.toDate?.() || null;

    if (pageType === "monthly" && isSameMonth(caDate, pageDate)) {
      return;
    }

    months.push({
      type: "monthly",
      ...data,
    });
  });

  return months.slice(0, limit);
}


