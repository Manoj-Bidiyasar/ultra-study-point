import SubcategoryClient from "./SubcategoryClient";
import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";

export const revalidate = 3600; // 1 hour ISR

/* ================= LABEL FORMATTER ================= */
const formatLabel = (value = "") =>
  value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ================= SEO ================= */
export async function generateMetadata({ params }) {
  // ✅ params is async in Next.js 15+
  const { subcategory } = await params;

  if (!subcategory) {
    return {
      title: "Notes | Ultra Study Point",
      robots: "noindex",
    };
  }

  const label = formatLabel(subcategory);

  return {
    title: `${label} Notes | Ultra Study Point`,
    description: `Detailed study notes on ${label}. Designed for quick revision and deep understanding.`,
    alternates: {
      canonical: `https://yourdomain.com/notes/category/${subcategory}`,
    },
  };
}

/* ================= PAGE ================= */
export default async function Page({ params }) {
  // ✅ MUST await params
  const { subcategory } = await params;

  // 🔒 SAFETY GUARD
  if (!subcategory) {
    notFound();
  }

  const snap = await adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("master_notes")
    .where("subCategoryId", "==", subcategory)
    .where("status", "==", "published")
    .get();

  const notes = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      slug: doc.id,
      title: data.title,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      updatedAt: data.updatedAt?.toDate?.() || null,
      publishedAt: data.publishedAt?.toDate?.() || null,
    };
  });

  // 🕒 Sort latest first
  notes.sort(
    (a, b) =>
      (b.updatedAt || b.publishedAt || 0) -
      (a.updatedAt || a.publishedAt || 0)
  );

  const categoryId = notes[0]?.categoryId || null;

  return (
    <SubcategoryClient
      notes={notes}
      categoryId={categoryId}
      subcategory={subcategory}
    />
  );
}
