import { getAdminDb } from "@/lib/firebase/admin";

export async function verifyPreviewToken({
  token,
  expectedType,
  expectedSlug,
  expectedDocId,
}) {
  if (!token) return { ok: false, reason: "missing-token" };

  const adminDb = getAdminDb();
  if (!adminDb) return { ok: false, reason: "admin-db-missing" };

  const tokenRef = adminDb
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("private")
    .doc("preview_tokens")
    .collection("items")
    .doc(token);

  const snap = await tokenRef.get();
  if (!snap.exists) return { ok: false, reason: "token-not-found" };

  const data = snap.data() || {};
  const expiresAt = data?.expiresAt?.toDate?.() || null;
  if (!expiresAt || expiresAt < new Date()) {
    try {
      await tokenRef.delete();
    } catch {
      // Best effort cleanup.
    }
    return { ok: false, reason: "token-expired" };
  }

  if (expectedType && data.type !== expectedType) {
    return { ok: false, reason: "type-mismatch" };
  }
  if (expectedSlug && data.slug !== expectedSlug) {
    return { ok: false, reason: "slug-mismatch" };
  }
  if (expectedDocId && data.docId !== expectedDocId) {
    return { ok: false, reason: "docid-mismatch" };
  }

  return { ok: true, data };
}

