const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 🔴 PASTE YOUR REAL UID HERE (FROM FIREBASE CONSOLE)
const UID = "5pC2v2Cy0DSzSpEYbBYWRFGPXTj2";

// 🔴 ROLE: "admin" or "editor"
const ROLE = "admin";

/*
  ADD USERS HERE
  -------------------------
  admin  → full access
  editor → limited access

const USERS = [
  { uid: "ADMIN_UID_1", role: "admin" },
  { uid: "ADMIN_UID_2", role: "admin" },

  { uid: "EDITOR_UID_1", role: "editor" },
  { uid: "EDITOR_UID_2", role: "editor" },
];
*/
async function run() {
  await admin.auth().setCustomUserClaims(UID, { role: ROLE });
  console.log(`✅ Role '${ROLE}' successfully set for UID: ${UID}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Failed to set role:", err);
  process.exit(1);
});
