import { NextResponse } from "next/server";
import {
  getAdminDb,
  getFirebaseAdminInitState,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Trigger best-effort init on request.
  getAdminDb();
  const state = getFirebaseAdminInitState();

  const ok = Boolean(state.configured && (state.initialized || !state.lastError));

  return NextResponse.json(
    {
      ok,
      httpStatus: ok ? 200 : 503,
      configured: state.configured,
      initialized: state.initialized,
      lastAttemptAt: state.lastAttemptAt,
      lastError: state.lastError || null,
      hint: state.configured
        ? "If initialized is false, verify service account key format and project permissions."
        : "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY_BASE64 in hosting env.",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
