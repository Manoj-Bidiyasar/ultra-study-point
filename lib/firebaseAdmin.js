import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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
