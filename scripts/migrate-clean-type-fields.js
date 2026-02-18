const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const DRY_RUN = !process.argv.includes("--apply");
const ONLY_COLLECTION = getArgValue("--collection");
const LIMIT = Number(getArgValue("--limit") || 0);

const BASE_PATH = [
  "artifacts",
  "ultra-study-point",
  "public",
  "data",
];

const COLLECTIONS = [
  { name: "currentAffairs", fixedType: null },
  { name: "master_notes", fixedType: "notes" },
  { name: "Quizzes", fixedType: "quiz" },
  { name: "PYQs", fixedType: "pyq" },
];

const TYPE_KEEP_FIELDS = {
  daily: new Set(["dailyMeta", "caDate"]),
  monthly: new Set(["monthlyMeta", "caDate", "pdfUrl"]),
  notes: new Set(["notesMeta"]),
  quiz: new Set([
    "quizMeta",
    "description",
    "durationMinutes",
    "rules",
    "scoring",
    "sections",
    "questions",
  ]),
  pyq: new Set([
    "quizMeta",
    "pyqMeta",
    "description",
    "durationMinutes",
    "rules",
    "scoring",
    "sections",
    "questions",
    "exam",
    "year",
    "subject",
    "course",
    "pyqCategoryId",
    "hideAnswersDefault",
  ]),
};

const CLEANABLE_FIELDS = [
  "dailyMeta",
  "monthlyMeta",
  "notesMeta",
  "quizMeta",
  "pyqMeta",
  "caDate",
  "pdfUrl",
  "description",
  "durationMinutes",
  "rules",
  "scoring",
  "sections",
  "questions",
  "exam",
  "year",
  "subject",
  "course",
  "pyqCategoryId",
  "hideAnswersDefault",
];

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return "";
  return process.argv[idx + 1] || "";
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function loadServiceAccount() {
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.IREBASE_SERVICE_ACCOUNT_PATH,
  ].filter(Boolean);

  for (const p of candidatePaths) {
    try {
      const raw = fs.readFileSync(p, "utf8");
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`Failed reading service account at "${p}": ${err.message}`);
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON: ${err.message}`);
    }
  }

  requireEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  throw new Error("Unable to load Firebase service account credentials");
}

function ensureBackupDir() {
  const dir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveDocType(collectionName, data, fixedType) {
  if (fixedType) return fixedType;
  const t = String(data?.type || "").trim().toLowerCase();
  if (t === "daily" || t === "monthly") return t;
  return "";
}

function buildUpdateForType(docType, data, fixedType) {
  const keep = TYPE_KEEP_FIELDS[docType];
  if (!keep) return null;

  const update = {};
  let changed = false;

  for (const field of CLEANABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
    if (!keep.has(field)) {
      update[field] = FieldValue.delete();
      changed = true;
    }
  }

  if (fixedType && data.type !== fixedType) {
    update.type = fixedType;
    changed = true;
  }

  return changed ? update : null;
}

function writeBackup(collectionName, docs) {
  if (!docs.length) return null;
  const dir = ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(dir, `${collectionName}-cleanup-backup-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2), "utf8");
  return backupPath;
}

async function processCollection(db, config) {
  const colRef = db.collection(BASE_PATH[0]).doc(BASE_PATH[1]).collection(BASE_PATH[2]).doc(BASE_PATH[3]).collection(config.name);
  const snap = await colRef.get();
  const docs = LIMIT > 0 ? snap.docs.slice(0, LIMIT) : snap.docs;

  let inspected = 0;
  let changed = 0;
  let skippedUnknownType = 0;
  let batch = db.batch();
  let batchCount = 0;
  const backupDocs = [];

  for (const docSnap of docs) {
    inspected += 1;
    const data = docSnap.data() || {};
    const docType = resolveDocType(config.name, data, config.fixedType);

    if (!docType) {
      skippedUnknownType += 1;
      continue;
    }

    const update = buildUpdateForType(docType, data, config.fixedType);
    if (!update) continue;

    changed += 1;
    backupDocs.push({ id: docSnap.id, ...data });

    if (!DRY_RUN) {
      batch.update(docSnap.ref, update);
      batchCount += 1;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
  }

  const backupPath = writeBackup(config.name, backupDocs);
  return {
    collection: config.name,
    inspected,
    changed,
    skippedUnknownType,
    backupPath,
  };
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const app =
    getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];
  const db = getFirestore(app);

  const targets = ONLY_COLLECTION
    ? COLLECTIONS.filter((c) => c.name === ONLY_COLLECTION)
    : COLLECTIONS;

  if (targets.length === 0) {
    throw new Error(`Unknown collection "${ONLY_COLLECTION}". Use one of: ${COLLECTIONS.map((c) => c.name).join(", ")}`);
  }

  console.log(DRY_RUN ? "Mode: DRY RUN" : "Mode: APPLY");
  console.log(`Collections: ${targets.map((t) => t.name).join(", ")}`);
  if (LIMIT > 0) console.log(`Per-collection limit: ${LIMIT}`);

  for (const target of targets) {
    const result = await processCollection(db, target);
    console.log(
      `[${result.collection}] inspected=${result.inspected}, changed=${result.changed}, skippedUnknownType=${result.skippedUnknownType}`
    );
    if (result.backupPath) {
      console.log(`[${result.collection}] backup=${result.backupPath}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
