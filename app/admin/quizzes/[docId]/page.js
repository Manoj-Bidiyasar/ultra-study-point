"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import BaseQuizEditor from "@/app/admin/editors/BaseQuizEditor";

const QUIZ_COLLECTION_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "Quizzes",
];

const USERS_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
  "users",
];

export default function EditQuiz() {
  const { docId } = useParams();
  const searchParams = useSearchParams();

  const isNew = searchParams.get("new") === "true";
  const slugFromCreate = searchParams.get("slug") || "";

  const [data, setData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const userRef = doc(db, ...USERS_PATH, user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setLoading(false);
          return;
        }

        setRole(userSnap.data().role);

        const ref = doc(db, ...QUIZ_COLLECTION_PATH, docId);
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
            title: "",
            summary: "",
            tags: [],
            status: "draft",
            isLocked: false,

            quizMeta: {
              durationMinutes: 60,
              rules: { minAttemptPercent: 90 },
              scoring: {
                defaultPoints: 1,
                negativeMarking: { type: "fraction", value: 1 / 3 },
              },
              sections: [],
              questions: [],
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
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [docId, isNew, slugFromCreate]);

  if (loading) return <p>Loading…</p>;
  if (!data || !role) return <p>Document not found</p>;

  return <BaseQuizEditor rawData={data} role={role} />;
}
