import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toJsDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("slug");
  const slug = (raw || "").trim();

  if (!slug) {
    return NextResponse.json({ ok: false, error: "missing slug query param" });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: "adminDb not initialized" });
  }

  const colRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("currentAffairs");

  const bySlugSnap = await colRef.where("slug", "==", slug).limit(5).get();
  const bySlug = bySlugSnap.docs.map((d) => {
    const data = d.data() || {};
    const publishedAt = toJsDate(data.publishedAt);
    return {
      id: d.id,
      slug: data.slug || "",
      type: data.type || "",
      status: data.status || "",
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
    };
  });

  const byIdSnap = await colRef.doc(slug).get();
  const byId = byIdSnap.exists
    ? (() => {
        const data = byIdSnap.data() || {};
        const publishedAt = toJsDate(data.publishedAt);
        return {
          id: byIdSnap.id,
          slug: data.slug || "",
          type: data.type || "",
          status: data.status || "",
          publishedAt: publishedAt ? publishedAt.toISOString() : null,
        };
      })()
    : null;

  const now = new Date();
  const candidate = bySlug[0] || byId;
  let would404Reason = null;
  if (!candidate) {
    would404Reason = "not-found";
  } else if (candidate.status === "draft" || candidate.status === "hidden") {
    would404Reason = "blocked-status";
  } else if (
    candidate.status === "scheduled" &&
    candidate.publishedAt &&
    new Date(candidate.publishedAt) > now
  ) {
    would404Reason = "scheduled-in-future";
  } else if (candidate.type && candidate.type !== "daily") {
    would404Reason = "not-daily-type";
  }

  return NextResponse.json({
    ok: true,
    slug,
    bySlugCount: bySlug.length,
    bySlug,
    byId,
    candidate,
    would404Reason,
    now: now.toISOString(),
  });
}

