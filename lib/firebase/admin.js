import { readFileSync } from "fs";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
const privateKeyPlain = process.env.FIREBASE_PRIVATE_KEY;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

const decodedPrivateKey = privateKeyBase64
  ? Buffer.from(privateKeyBase64, "base64").toString("utf8")
  : null;

let serviceAccountFromFile = null;
if (serviceAccountPath) {
  try {
    const raw = readFileSync(serviceAccountPath, "utf8");
    serviceAccountFromFile = JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to read Firebase service account file:", err?.message);
  }
}

const serviceAccount = {
  project_id:
    serviceAccountFromFile?.project_id || process.env.FIREBASE_PROJECT_ID,
  client_email:
    serviceAccountFromFile?.client_email || process.env.FIREBASE_CLIENT_EMAIL,
  private_key: (
    serviceAccountFromFile?.private_key ||
    decodedPrivateKey ||
    privateKeyPlain ||
    ""
  ).replace(/\\n/g, "\n"),
};

const hasServiceAccount =
  !!serviceAccount.project_id &&
  !!serviceAccount.client_email &&
  !!serviceAccount.private_key;

let adminApp = null;
if (hasServiceAccount) {
  adminApp =
    getApps().length === 0
      ? initializeApp({
          credential: cert(serviceAccount),
        })
      : getApps()[0];
} else {
  // Avoid crashing during build; runtime should provide env vars.
  console.warn("Missing Firebase Admin environment variables");
}

export const adminDb = adminApp ? getFirestore(adminApp) : null;
export const firebaseAdminConfigured = hasServiceAccount;

export function getAdminDb() {
  return adminDb;
}

export function requireAdminDb() {
  if (!adminDb) {
    throw new Error("Missing Firebase Admin environment variables");
  }
  return adminDb;
}
