import { docExists, slugExists } from "./firestoreUtils";

/* ======================================================
   GENERIC VALIDATION (USED EVERYWHERE)
====================================================== */

export async function validateDocId({
  path,
  docId,
}) {
  if (!docId) return "Document ID is required";

  if (!/^[a-zA-Z0-9_-]+$/.test(docId)) {
    return "Only letters, numbers, hyphen and underscore allowed";
  }

  const exists = await docExists([...path, docId]);

  if (exists) {
    return "Document ID already exists";
  }

  return null;
}

export async function validateSlug({
  collectionPath,
  slug,
  type,
  currentId = null,
}) {
  if (!slug) return "Slug is required";

  const exists = await slugExists({
    collectionPath,
    slug,
    type,
    currentId,
  });

  if (exists) {
    return "Slug already exists";
  }

  return null;
}
