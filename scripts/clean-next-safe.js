const fs = require("fs");
const path = require("path");

const root = process.cwd();
const nextDir = path.join(root, ".next");
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
    return JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch {
    return null;
  }
}

const lock = readLock();
if (lock?.pid && isPidAlive(lock.pid)) {
  console.error(
    `Refusing to delete .next because dev server is running (pid ${lock.pid}). Stop dev server first.`
  );
  process.exit(1);
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  process.exit(0);
} catch (err) {
  console.error(`Failed to clean .next: ${err.message}`);
  process.exit(1);
}
