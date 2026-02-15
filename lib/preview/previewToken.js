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

  if (type === "daily") {
    return `/current-affairs/daily/${slug}?preview=true&token=${token}`;
  }
  if (type === "monthly") {
    return `/current-affairs/monthly/${slug}?preview=true&token=${token}`;
  }
  if (type === "notes") {
    return `/notes/${slug}?preview=true&token=${token}`;
  }
  if (type === "quiz") {
    return `/quiz/${docId}?preview=true&token=${token}`;
  }
  if (type === "pyq") {
    return `/pyqs/${docId}?preview=true&token=${token}`;
  }

  return `/preview/${type}/${slug}?token=${token}`;
}

