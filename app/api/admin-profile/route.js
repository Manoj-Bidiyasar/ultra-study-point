import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing-token" },
        { status: 401 }
      );
    }

    const adminDb = getAdminDb({ force: true });
    if (!adminDb) {
      return NextResponse.json(
        { ok: false, error: "admin-db-not-initialized" },
        { status: 503 }
      );
    }

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded?.uid;
    if (!uid) {
      return NextResponse.json(
        { ok: false, error: "invalid-token" },
        { status: 401 }
      );
    }

    const userRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("users")
      .doc(uid);

    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { ok: false, error: "user-profile-missing", uid },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      uid,
      profile: snap.data(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "admin-profile-read-failed",
        message: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}

