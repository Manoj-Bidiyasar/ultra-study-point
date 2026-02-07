import { getAdminDb } from "@/lib/firebase/admin";

const basePath = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
];

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getLastModified(data) {
  return (
    toDate(data.updatedAt) ||
    toDate(data.publishedAt) ||
    toDate(data.caDate) ||
    toDate(data.createdAt) ||
    null
  );
}

export async function getAllPublishedPages() {
  const adminDb = getAdminDb();
  if (!adminDb) return [];

  const caRef = adminDb
    .collection(basePath[0])
    .doc(basePath[1])
    .collection(basePath[2])
    .doc(basePath[3])
    .collection("currentAffairs");

  const notesRef = adminDb
    .collection(basePath[0])
    .doc(basePath[1])
    .collection(basePath[2])
    .doc(basePath[3])
    .collection("master_notes");

  const [caSnap, notesSnap] = await Promise.all([
    caRef.where("status", "==", "published").get(),
    notesRef.where("status", "==", "published").get(),
  ]);

  const pages = [];

  caSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.isDeleted === true) return;
    const type = data.type;
    if (type !== "daily" && type !== "monthly") return;
    const slug = data.slug || doc.id;
    pages.push({
      path: `/current-affairs/${type}/${slug}`,
      lastModified: getLastModified(data),
      blocks: data.content?.blocks || [],
    });
  });

  notesSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.isDeleted === true) return;
    const slug = data.slug || doc.id;
    pages.push({
      path: `/notes/${slug}`,
      lastModified: getLastModified(data),
      blocks: data.content?.blocks || [],
    });
  });

  return pages;
}
