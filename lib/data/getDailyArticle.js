import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";

export const getDailyArticleBySlug = unstable_cache(
  async (slug) => {
    const adminDb = getAdminDb();
    if (!adminDb) return null;

    const colRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("currentAffairs");

    const docSnap = await colRef.doc(slug).get();

    if (!docSnap.exists) return null;

    return {
      id: docSnap.id,
      data: docSnap.data(),
    };
  },
  ["daily-article-by-slug"],
  { revalidate: 60 }
);


