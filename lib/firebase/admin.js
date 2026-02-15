import { readFileSync } from "fs";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const RETRY_INTERVAL_MS = 15_000;

let adminApp = null;
export let adminDb = null;
export let firebaseAdminConfigured = false;

let lastInitAttemptAt = 0;
let lastInitError = null;

function readServiceAccountFromFile(path) {
  if (!path) return null;
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to read Firebase service account file:", err?.message);
    return null;
  }
}

function readChunkedPrivateKey() {
  const partKeys = Object.keys(process.env)
    .filter((k) => /^FIREBASE_PRIVATE_KEY_PART_\d+$/.test(k))
    .sort((a, b) => {
      const ai = Number(a.split("_").pop());
      const bi = Number(b.split("_").pop());
      return ai - bi;
    });

  if (partKeys.length === 0) return null;
  return partKeys.map((k) => process.env[k] || "").join("");
}

function normalizePrivateKey(raw) {
  if (!raw) return "";

  let key = String(raw).trim();

  // Some hosts store the value wrapped in quotes.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Support both real newlines and escaped newlines from env.
  key = key.replace(/\\r\\n/g, "\n");
  key = key.replace(/\\n/g, "\n");
  key = key.replace(/\r\n/g, "\n");

  return key;
}

function buildServiceAccount() {
  const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  const privateKeyChunked = readChunkedPrivateKey();
  const privateKeyPlain = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  const decodedPrivateKey = privateKeyBase64
    ? Buffer.from(privateKeyBase64, "base64").toString("utf8")
    : null;

  const serviceAccountFromFile = readServiceAccountFromFile(serviceAccountPath);

  return {
    project_id:
      serviceAccountFromFile?.project_id || process.env.FIREBASE_PROJECT_ID,
    client_email:
      serviceAccountFromFile?.client_email || process.env.FIREBASE_CLIENT_EMAIL,
    private_key: normalizePrivateKey(
      serviceAccountFromFile?.private_key ||
        decodedPrivateKey ||
        privateKeyChunked ||
        privateKeyPlain ||
        ""
    ),
  };
}

function hasServiceAccountCredentials(serviceAccount) {
  return (
    !!serviceAccount.project_id &&
    !!serviceAccount.client_email &&
    !!serviceAccount.private_key
  );
}

function initAdmin({ force = false } = {}) {
  if (adminDb) return adminDb;

  const now = Date.now();
  if (!force && now - lastInitAttemptAt < RETRY_INTERVAL_MS) {
    return null;
  }
  lastInitAttemptAt = now;

  const serviceAccount = buildServiceAccount();
  firebaseAdminConfigured = hasServiceAccountCredentials(serviceAccount);
  if (!firebaseAdminConfigured) {
    lastInitError = new Error("Missing Firebase Admin environment variables");
    console.warn("Missing Firebase Admin environment variables");
    return null;
  }

  try {
    adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount),
          })
        : getApps()[0];

    adminDb = getFirestore(adminApp);
    lastInitError = null;
    return adminDb;
  } catch (err) {
    adminApp = null;
    adminDb = null;
    lastInitError = err;
    console.warn("Failed to initialize Firebase Admin SDK:", err?.message);
    return null;
  }
}

export function getAdminDb(options) {
  return initAdmin(options);
}

export function requireAdminDb() {
  const db = initAdmin({ force: true });
  if (!db) {
    throw new Error(lastInitError?.message || "Missing Firebase Admin environment variables");
  }
  return db;
}

export function getFirebaseAdminInitState() {
  return {
    configured: firebaseAdminConfigured,
    initialized: !!adminDb,
    lastAttemptAt: lastInitAttemptAt || null,
    lastError: lastInitError?.message || null,
  };
}

// Best-effort eager init, with retry available via getAdminDb().
initAdmin();
