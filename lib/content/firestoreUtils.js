import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* ======================================================
   FIRESTORE LOW LEVEL HELPERS
====================================================== */

export async function docExists(pathArray) {
  const ref = doc(db, ...pathArray);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function slugExists({
  collectionPath,
  slug,
  type,
  currentId,
}) {
  const colRef = collection(db, ...collectionPath);

  let q = query(
    colRef,
    where("slug", "==", slug)
  );

  // ✅ optional type filter
  if (type) {
    q = query(
      colRef,
      where("slug", "==", slug),
      where("type", "==", type)
    );
  }

  const snap = await getDocs(q);

  if (snap.empty) return false;

  // ✅ allow same document during edit
  if (currentId) {
    return snap.docs.some(
      (doc) => doc.id !== currentId
    );
  }

  return true;
}
