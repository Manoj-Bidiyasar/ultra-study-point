import NotesClient from "./NotesClient";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import { migrateContentBlocks } from "@/components/content/utils/migrateContentBlocks";


/* ================= ISR ================= */
export const revalidate = 120;

/* ================= HELPERS ================= */
const normalizeDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d) ? null : d;
};

const capitalize = (str = "") =>
  str.charAt(0).toUpperCase() + str.slice(1);

/* 🔑 SERIALIZER */
function serializeFirestoreData(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === "object" && value?.toDate) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreData);
  }

  if (typeof value === "object") {
    const result = {};
    for (const key in value) {
      result[key] = serializeFirestoreData(value[key]);
    }
    return result;
  }

  return value;
}

/* ================= RELATED NOTES ================= */
async function getRelatedNotes({ category, excludeSlug }) {
  if (!category) return [];

  const ref = db
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("master_notes");

  const snap = await ref
    .where("status", "==", "published")
    .where("category", "==", category)
    .limit(6)
    .get();

  return snap.docs
    .map((d) => ({
      slug: d.id,
      title: d.data().title,
    }))
    .filter((n) => n.slug !== excludeSlug);
}

/* ================= SEO ================= */
export async function generateMetadata(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug;

  if (!slug) return {};

  const isPreview = searchParams?.preview === "true";

  const docRef = db
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("master_notes")
    .doc(slug);

  const snap = await docRef.get();
  if (!snap.exists) return {};

  const data = snap.data();
  const publishDate = normalizeDate(data.publishDate);
  const now = new Date();

  if (!isPreview) {
    if (
      data.status === "draft" ||
      data.status === "hidden" ||
      (data.status === "scheduled" && publishDate > now)
    ) {
      return {};
    }
  }

  return {
    title: capitalize(data.title),
    description: data.seoDescription || data.summary || "",
  };
}


/* ================= PAGE ================= */
export default async function NotesPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug;

  if (!slug) notFound();

  const isPreview = searchParams?.preview === "true";

  const colRef = db
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("master_notes");

  /* ================= SINGLE NOTE ================= */
  const docSnap = await colRef.doc(slug).get();

  if (docSnap.exists) {
    const data = docSnap.data();
    const publishDate = normalizeDate(data.publishDate);
    const now = new Date();

    if (!isPreview) {
      if (
        data.status === "draft" ||
        data.status === "hidden" ||
        (data.status === "scheduled" && publishDate > now)
      ) {
        notFound();
      }
    }

    const relatedContent = await getRelatedNotes({
      category: data.category,
      excludeSlug: slug,
    });

    const blocks =
  Array.isArray(data.blocks) && data.blocks.length > 0
    ? data.blocks
    : migrateContentBlocks(data.contentBlocks || []);

const safeNote = serializeFirestoreData({
  id: docSnap.id,
  ...data,
  blocks,
  relatedContent,
});


    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Notes",
          item: "https://yourdomain.com/notes",
        },
        data.category && {
          "@type": "ListItem",
          position: 2,
          name: data.category,
          item: `https://yourdomain.com/notes/${data.categorySlug || ""}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: data.title,
          item: `https://yourdomain.com/notes/${slug}`,
        },
      ].filter(Boolean),
    };

    return (
      <NotesClient
        mode="note"
        note={safeNote}
        breadcrumbSchema={breadcrumbSchema}
      />
    );
  }

  /* ================= SUBCATEGORY LIST ================= */
  const snap = await colRef
    .where("subCategoryId", "==", slug)
    .where("status", "==", "published")
    .orderBy("publishDate", "desc")
    .get();

  if (!snap.empty) {
    const notes = snap.docs.map((doc) =>
      serializeFirestoreData({
        id: doc.id,
        ...doc.data(),
      })
    );

    return <NotesClient mode="list" notes={notes} />;
  }

  notFound();
}
