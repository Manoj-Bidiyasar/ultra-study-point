import NotesClient from "./NotesClient";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { migrateContentBlocks } from "@/components/content/utils/migrateContentBlocks";
import { serializeFirestoreData } from "@/lib/serialization/serializeFirestore";
import { unstable_cache } from "next/cache";
import { resolveRelatedContent } from "@/lib/related/relatedEngine";
import { SITE_URL } from "@/lib/seo/siteConfig";
import { verifyPreviewToken } from "@/lib/preview/verifyPreviewToken";


/* ================= ISR ================= */

export const dynamic = "force-dynamic";

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
// serializer imported from lib/utils/serializeFirestore

/* ================= RELATED NOTES ================= */
const getRelatedNotesCached = unstable_cache(
  async (category) => {
    if (!category) return [];
    const adminDb = getAdminDb();
    if (!adminDb) return [];

    const ref = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("master_notes");

    const snap = await ref
      .where("status", "==", "published")
      .where("category", "==", category)
      .limit(10)
      .get();

    return snap.docs.map((d) => ({
      slug: d.id,
      title: d.data().title,
    }));
  },
  (category) => ["related-notes", category],
  { revalidate: 600 }
);

async function getRelatedNotes({ category, excludeSlug }) {
  const list = await getRelatedNotesCached(category);
  return list.filter((n) => n.slug !== excludeSlug).slice(0, 6);
}

/* ================= SEO ================= */
export async function generateMetadata(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const adminDb = getAdminDb();
  if (!adminDb) return {};

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug;

  if (!slug) return {};

  const isPreview = searchParams?.preview === "true";

  const docRef = adminDb
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
    alternates: {
      canonical: `${SITE_URL}/notes/${slug}`,
    },
  };
}


/* ================= PAGE ================= */
export default async function NotesPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const adminDb = getAdminDb();
  if (!adminDb) notFound();

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug;

  if (!slug) notFound();

  const isPreview = searchParams?.preview === "true";
  if (isPreview) {
    const token = searchParams?.token;
    const valid = await verifyPreviewToken({
      token,
      expectedType: "notes",
      expectedSlug: slug,
    });
    if (!valid.ok) notFound();
  }

  const colRef = adminDb
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

    const manualList = Array.isArray(data.relatedContent)
      ? data.relatedContent
      : [];

    const manualNotes = manualList
      .filter((i) => i?.type === "notes" && i?.slug)
      .map((i) => ({
        slug: i.slug,
        title: i.title || i.slug,
      }));

    const manualCA = manualList
      .filter(
        (i) =>
          (i?.type === "daily" || i?.type === "monthly") &&
          i?.slug
      )
      .map((i) => ({
        ...i,
        canonicalUrl:
          i.canonicalUrl ||
          `/current-affairs/${i.type}/${i.slug}`,
      }));

    const relatedCA = await resolveRelatedContent({
      pageType: "notes",
      subject: data.subject,
      tags: data.tags,
      manualCA,
      manualNotes,
    });

    const mergedRelatedNotes = [
      ...manualNotes,
      ...relatedContent.filter(
        (n) => !manualNotes.some((m) => m.slug === n.slug)
      ),
    ];

    const blocks =
  Array.isArray(data.blocks) && data.blocks.length > 0
    ? data.blocks
    : migrateContentBlocks(data.contentBlocks || []);

const safeNote = serializeFirestoreData({
  id: docSnap.id,
  ...data,
  blocks,
  relatedContent: mergedRelatedNotes,
});


      const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Notes",
          item: `${SITE_URL}/notes`,
        },
        data.category && {
          "@type": "ListItem",
          position: 2,
          name: data.category,
          item: `${SITE_URL}/notes/${data.categorySlug || ""}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: data.title,
          item: `${SITE_URL}/notes/${slug}`,
        },
      ].filter(Boolean),
    };

    return (
      <NotesClient
        mode="note"
        note={safeNote}
        breadcrumbSchema={breadcrumbSchema}
        relatedCA={serializeFirestoreData(relatedCA)}
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


