import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function createPreviewToken({
  docId,
  slug,
  type,
}) {
  const token = crypto.randomUUID();

  const ref = doc(
    db,
    "artifacts",
    "ultra-study-point",
    "private",
    "preview_tokens",
    "items",
    token
  );

  await setDoc(ref, {
    docId,
    slug,
    type,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(
      new Date(Date.now() + 15 * 60 * 1000)
    ),
  });

  return `/preview/${type}/${slug}?token=${token}`;
}

