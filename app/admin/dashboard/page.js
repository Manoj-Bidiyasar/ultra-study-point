"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import StatCard from "./components/StatCard";
import Charts from "./components/Charts";

const basePath = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);
  const [role, setRole] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        console.log("📊 Loading dashboard stats...");

        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, ...basePath, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userRole = userSnap.exists() ? userSnap.data().role : null;
        setRole(userRole);

        const caRef = collection(db, ...basePath, "currentAffairs");
        const notesRef = collection(db, ...basePath, "master_notes");
        const usersRef = collection(db, ...basePath, "users");
        const reviewRef = collection(db, ...basePath, "review_queue");

        const safeGet = async (ref, label) => {
          try {
            return await getDocs(ref);
          } catch (e) {
            setErrors((prev) => [
              ...prev,
              `${label}: ${e?.message || "Permission error"}`,
            ]);
            return null;
          }
        };

        const canAdminRead =
          userRole === "admin" || userRole === "super_admin";

        const safeCount = async (ref, label) => {
          try {
            const snap = await getCountFromServer(ref);
            return snap.data().count || 0;
          } catch (e) {
            setErrors((prev) => [
              ...prev,
              `${label}: ${e?.message || "Permission error"}`,
            ]);
            return 0;
          }
        };

        const [
          caTotal,
          caDraft,
          caReview,
          caPublished,
          notesTotal,
          notesDraft,
          notesPublished,
          usersTotal,
          usersActive,
          reviewSnap,
        ] =
          await Promise.all([
            safeCount(caRef, "Current Affairs"),
            safeCount(query(caRef, where("status", "==", "draft")), "CA Draft"),
            safeCount(
              query(caRef, where("status", "==", "review")),
              "CA Review"
            ),
            safeCount(
              query(caRef, where("status", "==", "published")),
              "CA Published"
            ),
            safeCount(notesRef, "Notes"),
            safeCount(
              query(notesRef, where("status", "==", "draft")),
              "Notes Draft"
            ),
            safeCount(
              query(notesRef, where("status", "==", "published")),
              "Notes Published"
            ),
            canAdminRead ? safeCount(usersRef, "Users") : 0,
            canAdminRead
              ? safeCount(
                  query(usersRef, where("status", "==", "active")),
                  "Active Users"
                )
              : 0,
            canAdminRead
              ? safeGet(
                  query(reviewRef, where("status", "==", "pending")),
                  "Review Queue"
                )
              : null,
          ]);

        const review = reviewSnap
          ? reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          : [];

        setStats({
          caTotal,
          caDraft,
          caReview,
          caPublished,

          notesTotal,
          notesDraft,
          notesPublished,

          usersTotal,
          usersActive,

          reviewPending: review.length,
          reviewItems: review,
        });
      } catch (err) {
        console.error("❌ Dashboard stats error:", err);
      }
    }

    loadStats();
  }, []);

  /* ⏳ IMPORTANT: visible loading */
  if (!stats) {
    return <p style={{ padding: 20 }}>Loading dashboard data…</p>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {errors.length > 0 && role !== "editor" && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <b>Permissions</b>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <StatCard title="Total CA" value={stats.caTotal} />
        <StatCard title="Draft CA" value={stats.caDraft} />
        <StatCard title="Published CA" value={stats.caPublished} />

        <StatCard title="Total Notes" value={stats.notesTotal} />
        <StatCard title="Draft Notes" value={stats.notesDraft} />

        {(role === "admin" || role === "super_admin") && (
          <>
            <StatCard title="Users" value={stats.usersTotal} />
            <StatCard title="Active Users" value={stats.usersActive} />
            <StatCard title="Pending Reviews" value={stats.reviewPending} />
          </>
        )}
      </div>

      <Charts data={stats} />

      {(role === "admin" || role === "super_admin") &&
        stats.reviewItems?.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Review Queue</h3>
          <div style={{ marginTop: 10 }}>
            {stats.reviewItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  marginBottom: 8,
                  background: "#fff",
                }}
              >
                <b>{item.title || item.docId}</b>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {item.type} • {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
