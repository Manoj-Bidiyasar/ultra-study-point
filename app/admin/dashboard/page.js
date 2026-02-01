"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

  useEffect(() => {
    async function loadStats() {
      try {
        console.log("📊 Loading dashboard stats...");

        const caRef = collection(db, ...basePath, "currentAffairs");
        const notesRef = collection(db, ...basePath, "master_notes");
        const usersRef = collection(db, ...basePath, "users");

        const [caSnap, notesSnap, usersSnap] = await Promise.all([
          getDocs(caRef),
          getDocs(notesRef),
          getDocs(usersRef),
        ]);

        console.log("CA docs:", caSnap.size);
        console.log("Notes docs:", notesSnap.size);
        console.log("Users docs:", usersSnap.size);

        const ca = caSnap.docs.map((d) => d.data());
        const notes = notesSnap.docs.map((d) => d.data());
        const users = usersSnap.docs.map((d) => d.data());

        setStats({
          caTotal: ca.length,
          caDraft: ca.filter((x) => x.status === "draft").length,
          caReview: ca.filter((x) => x.status === "review").length,
          caPublished: ca.filter((x) => x.status === "published").length,

          notesTotal: notes.length,
          notesDraft: notes.filter((x) => x.status === "draft").length,
          notesPublished: notes.filter((x) => x.status === "published").length,

          usersTotal: users.length,
          usersActive: users.filter((u) => u.status === "active").length,
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

        <StatCard title="Users" value={stats.usersTotal} />
        <StatCard title="Active Users" value={stats.usersActive} />
      </div>

      <Charts data={stats} />
    </div>
  );
}
