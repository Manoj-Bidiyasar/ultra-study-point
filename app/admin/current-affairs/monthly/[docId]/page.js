"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import BaseCAEditor from "@/app/admin/editors/BaseCAEditor";

const COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "currentAffairs",
];

const USERS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "users",
];

export default function EditDailyCA() {
  const { docId } = useParams();
  const searchParams = useSearchParams();
  const slugFromCreate = searchParams.get("slug") || "";
const titleFromCreate = searchParams.get("title") || "";
const caDateFromCreate = searchParams.get("caDate") || "";

  const isNew = searchParams.get("new") === "true";


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

      /* ================= USER ROLE ================= */
      const userRef = doc(db, ...USERS_PATH, user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      setRole(userData.role); // ✅ real role from Firestore

      /* ================= CA DOCUMENT ================= */
      const ref = doc(db, ...COLLECTION_PATH, docId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setData({
          id: docId,
          ...snap.data(),
        });
        setLoading(false);
        return;
      }

      if (isNew) {
  setData({
    id: docId,
    slug: slugFromCreate,
    title: titleFromCreate,
    summary: "",
    tags: [],
    status: "draft",
    isLocked: false,

    content: {
      mode: "points",
      data: [],
    },

    seo: {},
    caDate: caDateFromCreate,
    pdfUrl: "",

    __isNew: true,
  });

  setLoading(false);
  return;
}
if (isNew) {
  const inferredDate = /^\d{4}-\d{2}-\d{2}$/.test(docId)
    ? docId
    : "";

  setData({
    id: docId,
    slug: slugFromCreate,
    title: "",
    summary: "",
    tags: [],
    status: "draft",
    isLocked: false,
    content: { mode: "points", data: [] },

    /* ✅ caDate inferred from docId */
    caDate: caDateFromCreate,

    seo: {
      seoTitle: "",
      seoDescription: "",
      canonicalUrl: "",
      keywords: "",
      newsKeywords: "",
    },
    pdfUrl: "",
    __isNew: true,
  });
        setLoading(false);
        return;
      }

      setData(null);
      setLoading(false);
    }

    load();
  }, [docId, isNew, slugFromCreate]);

  if (loading) return <p>Loading…</p>;
  if (!data || !role) return <p>Document not found</p>;

  return (
    <BaseCAEditor
      rawData={data}
      role={role}   // ✅ REAL ROLE
      type="monthly"
    />
  );
}
