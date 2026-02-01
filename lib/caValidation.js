import {
  validateDocId,
  validateSlug,
} from "@/lib/content/validation";

/* ======================================================
   COLLECTION PATH BUILDER
====================================================== */

function getCollectionPath(type) {
  // NOTES
  if (type === "notes") {
    return [
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "master_notes",
    ];
  }

  // QUIZ
  if (type === "quiz") {
    return [
      "artifacts",
      "ultra-study-point",
      "public",
      "data",
      "master_quiz",
    ];
  }

  // ✅ CURRENT AFFAIRS (NO SUBCOLLECTION)
  return [
    "artifacts",
    "ultra-study-point",
    "public",
    "data",
    "currentAffairs",
  ];
}

/* ======================================================
   VALIDATION WRAPPERS
====================================================== */

export function validateEditorDocId({
  docId,
  type,
}) {
  return validateDocId({
    path: getCollectionPath(type),
    docId,
  });
}

export function validateEditorSlug({
  slug,
  type,
  currentId,
}) {
  return validateSlug({
    collectionPath: getCollectionPath(type),
    slug,
    type,          // used only as field filter
    currentId,
  });
}
