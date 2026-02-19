import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const USER_PATH = ["artifacts", "ultra-study-point", "public", "data", "users"];

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

export function getOrCreateAdminDeviceId() {
  const key = "admin_device_id";
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, next);
  }
  return next;
}

export function normalizeAllowedDeviceIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

export function getMaxConcurrentSessions(userData) {
  const raw = Number(
    userData?.maxConcurrentSessions ??
      userData?.sessionPolicy?.maxConcurrentSessions ??
      1
  );
  if (!Number.isFinite(raw)) return 1;
  if (raw <= 1) return 1;
  return raw >= 2 ? 2 : 1;
}

export async function startAdminSession({ uid, userData }) {
  const deviceId = getOrCreateAdminDeviceId();
  const allowed = normalizeAllowedDeviceIds(userData?.allowedDeviceIds);
  if (allowed.length > 0 && !allowed.includes(deviceId)) {
    const err = new Error("This device is not allowed for this account.");
    err.code = "session/device-not-allowed";
    throw err;
  }

  const maxSessions = getMaxConcurrentSessions(userData);
  const sessionsRef = collection(db, ...USER_PATH, uid, "sessions");
  try {
    const activeSnap = await getDocs(query(sessionsRef, where("revoked", "==", false)));
    const activeSessions = activeSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));

    const toRevokeCount = Math.max(0, activeSessions.length - (maxSessions - 1));
    for (let i = 0; i < toRevokeCount; i += 1) {
      const old = activeSessions[i];
      await updateDoc(doc(db, ...USER_PATH, uid, "sessions", old.id), {
        revoked: true,
        revokedReason: "replaced_by_new_login",
        revokedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    // Some production rule setups can deny list queries even when create is allowed.
    // Continue with single-session creation so login is not blocked.
    if (String(err?.code || "") !== "permission-denied") {
      throw err;
    }
  }

  const sessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await setDoc(doc(db, ...USER_PATH, uid, "sessions", sessionId), {
    uid,
    deviceId,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent || "unknown" : "unknown",
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    revoked: false,
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem("admin_session_id", sessionId);
  }

  return { sessionId, deviceId };
}
