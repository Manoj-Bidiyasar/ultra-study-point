const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const DRY_RUN = !process.argv.includes("--apply");
const FIELDS_TO_REMOVE = [
  "caDate",
  "pdfUrl",
  "dailyMeta",
  "monthlyMeta",
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function loadServiceAccount() {
  const p = requireEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function ensureBackupDir() {
  const dir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return dir;
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const app =
    getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];
  const db = getFirestore(app);

  const col = db
    .collection("artifacts")
    .doc("ultra-study-point")
    .collection("public")
    .doc("data")
    .collection("master_notes");

  const snap = await col.get();
  console.log(`Found ${snap.size} notes docs.`);

  const backup = [];
  let updateCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    backup.push({ id: doc.id, ...data });

    const updates = {};
    let hasUpdate = false;
    for (const field of FIELDS_TO_REMOVE) {
      if (field in data) {
        updates[field] = FieldValue.delete();
        hasUpdate = true;
      }
    }

    if (hasUpdate) {
      updateCount += 1;
      if (!DRY_RUN) {
        await doc.ref.update(updates);
      }
    }
  }

  const backupDir = ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDir,
    `notes-backup-${stamp}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`Backup saved: ${backupPath}`);
  console.log(
    DRY_RUN
      ? `DRY RUN: would update ${updateCount} docs.`
      : `Updated ${updateCount} docs.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
