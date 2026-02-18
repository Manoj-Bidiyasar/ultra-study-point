const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = process.cwd();
const lockPath = path.join(root, ".next-dev.lock");

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLock() {
  if (!fs.existsSync(lockPath)) return null;
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLock(pid) {
  fs.writeFileSync(
    lockPath,
    JSON.stringify({ pid, createdAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

function removeLock() {
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch {
    // ignore
  }
}

const existing = readLock();
if (existing?.pid && isPidAlive(existing.pid)) {
  console.error(
    `Another dev server is already running (pid ${existing.pid}). Stop it first.`
  );
  process.exit(1);
}

removeLock();

const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev"],
  {
    stdio: "inherit",
    env: process.env,
    cwd: root,
  }
);

writeLock(child.pid);

function shutdown(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  removeLock();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
