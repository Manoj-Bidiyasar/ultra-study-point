"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import BaseEditor from "@/app/admin/editors/BaseEditor";

/* ================= COLLECTION ================= */

const NOTES_COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "master_notes",
];

const USERS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "users",
];

export default function EditNote() {
  const { docId } = useParams();
  const searchParams = useSearchParams();

  const isNew = searchParams.get("new") === "true";
  const slugFromCreate = searchParams.get("slug") || "";

  const [data, setData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      /* ========== USER ROLE ========== */
      const userRef = doc(db, ...USERS_PATH, user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setLoading(false);
        return;
      }

      setRole(userSnap.data().role);

      /* ========== NOTE DOCUMENT ========== */
      const ref = doc(db, ...NOTES_COLLECTION_PATH, docId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setData({
          id: docId,
          ...snap.data(),
        });
        setLoading(false);
        return;
      }

      /* ========== NEW NOTE ========== */
      if (isNew) {
        setData({
          id: docId,
          slug: slugFromCreate,
          title: "",
          summary: "",
          tags: [],
          status: "draft",
          isLocked: false,

          content: {
            mode: "blocks",
            data: [],
          },

          seo: {
            seoTitle: "",
            seoDescription: "",
          },

          __isNew: true,
        });

        setLoading(false);
        return;
      }

      setLoading(false);
    }

    load();
  }, [docId, isNew, slugFromCreate]);

  if (loading) return <p>Loading…</p>;
  if (!data || !role) return <p>Document not found</p>;

  return (
    <BaseEditor
      rawData={data}
      role={role}
      type="notes"   // ✅ IMPORTANT
    />
  );
}
