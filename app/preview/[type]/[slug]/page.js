export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import UniversalRenderer from "@/components/content/renderer/UniversalRenderer";
import ExitPreviewButton from "@/components/preview/ExitPreviewButton";

/* ================= SEO META (NO INDEX) ================= */

export async function generateMetadata({
  params,
  searchParams,
}) {
  const { token } = await searchParams;

  return {
    title: "PREVIEW — Draft Content",
    description:
      "This is a preview version. Not visible to public.",

    alternates: {
      canonical: undefined,
    },

    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

/* ================= PAGE ================= */

export default async function PreviewPage({
  params,
  searchParams,
}) {
  const adminDb = getAdminDb();
  const { type } = await params;
  const { token } = await searchParams;

  if (!token) notFound();
  if (!adminDb) notFound();

  /* ================= TOKEN ================= */

  const tokenRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("private")
    .doc("preview_tokens")
    .collection("items")
    .doc(token);

  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) notFound();

  const tokenData = tokenSnap.data();

  /* ================= EXPIRY ================= */

  if (tokenData.expiresAt.toDate() < new Date()) {
    await tokenRef.delete();
    notFound();
  }

  /* ================= CONTENT ================= */

  const collection =
    type === "notes"
      ? "master_notes"
      : "currentAffairs";

  const docSnap = await adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection(collection)
    .doc(tokenData.docId)
    .get();

  if (!docSnap.exists) notFound();

  const data = docSnap.data();

  /* ================= UI ================= */

  return (
    <article className="max-w-4xl mx-auto p-6">
      {/* PREVIEW BANNER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
          padding: 12,
          border: "1px solid #fca5a5",
          background: "#fee2e2",
          borderRadius: 6,
        }}
      >
        <b>🔴 Preview Mode</b>

        {/* CLIENT COMPONENT */}
        <ExitPreviewButton />
      </div>

      <h1>{data.title}</h1>

      <UniversalRenderer
        blocks={data.content?.blocks}
      />
    </article>
  );
}


