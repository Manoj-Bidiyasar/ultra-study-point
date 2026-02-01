import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebaseAdmin";

export const getDailyArticleBySlug = unstable_cache(
  async (slug) => {
    const colRef = db
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("currentAffairs");

    // 🔎 Find doc by slug field
    const snap = await colRef
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];

    return {
      id: doc.id, // ← THIS IS 2026-01-07
      ...doc.data(),
    };
  },
  (slug) => [`daily-article-${slug}`], // ✅ correct cache key
  { revalidate: 60 }
);
