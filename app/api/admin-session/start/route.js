import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function normalizeAllowedDeviceIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x || "").trim()).filter(Boolean);
}

function getMaxConcurrentSessions(userData) {
  const raw = Number(
    userData?.maxConcurrentSessions ??
      userData?.sessionPolicy?.maxConcurrentSessions ??
      1
  );
  if (!Number.isFinite(raw)) return 1;
  if (raw <= 1) return 1;
  return raw >= 2 ? 2 : 1;
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing-token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const deviceId = String(body?.deviceId || "").trim();
    const userAgent = String(body?.userAgent || "unknown");
    if (!deviceId) {
      return NextResponse.json({ ok: false, error: "missing-device-id" }, { status: 400 });
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
      return NextResponse.json({ ok: false, error: "invalid-token" }, { status: 401 });
    }

    const userRef = adminDb
      .collection("artifacts")
      .doc("ultra-study-point")
      .collection("public")
      .doc("data")
      .collection("users")
      .doc(uid);

    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "user-profile-missing" },
        { status: 404 }
      );
    }
    const userData = userSnap.data() || {};

    const allowed = normalizeAllowedDeviceIds(userData.allowedDeviceIds);
    if (allowed.length > 0 && !allowed.includes(deviceId)) {
      return NextResponse.json(
        { ok: false, error: "session/device-not-allowed" },
        { status: 403 }
      );
    }

    const maxSessions = getMaxConcurrentSessions(userData);
    const sessionsRef = userRef.collection("sessions");
    const activeSnap = await sessionsRef.where("revoked", "==", false).get();
    const activeSessions = activeSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));

    const toRevokeCount = Math.max(0, activeSessions.length - (maxSessions - 1));
    const batch = adminDb.batch();
    for (let i = 0; i < toRevokeCount; i += 1) {
      const old = activeSessions[i];
      batch.update(sessionsRef.doc(old.id), {
        revoked: true,
        revokedReason: "replaced_by_new_login",
        revokedAt: new Date(),
      });
    }

    const sessionId = randomUUID();

    batch.set(sessionsRef.doc(sessionId), {
      uid,
      deviceId,
      userAgent,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      revoked: false,
    });
    await batch.commit();

    return NextResponse.json({ ok: true, sessionId, deviceId });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "admin-session-start-failed",
        message: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}
