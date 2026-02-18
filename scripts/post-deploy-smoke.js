#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_TIMEOUT_MS = 15000;

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return "";
  return String(process.argv[idx + 1] || "").trim();
}

function trimSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const res = await withTimeout(fetch(url), timeoutMs, url);
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, url };
}

async function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const res = await withTimeout(fetch(url), timeoutMs, url);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep null
  }
  return { ok: res.ok, status: res.status, json, text, url };
}

function extractSlug(html, type) {
  const re = new RegExp(`/current-affairs/${type}/([^"?#/\\s<]+)`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
}

async function main() {
  const base = trimSlash(
    getArg("--base") || process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL
  );
  const timeoutMs = Number(getArg("--timeout") || process.env.SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  let dailySlug = getArg("--daily-slug") || "";
  let monthlySlug = getArg("--monthly-slug") || "";

  if (!base) {
    throw new Error(
      "Missing base URL. Use --base https://your-domain or set SMOKE_BASE_URL."
    );
  }

  console.log(`Base URL: ${base}`);
  console.log(`Timeout: ${timeoutMs}ms`);

  let failures = 0;
  const mark = (condition, okMsg, failMsg) => {
    if (condition) pass(okMsg);
    else {
      fail(failMsg);
      failures += 1;
    }
  };

  const home = await fetchText(`${base}/`, timeoutMs);
  mark(home.ok, `GET / -> ${home.status}`, `GET / failed -> ${home.status}`);

  const caIndex = await fetchText(`${base}/current-affairs`, timeoutMs);
  mark(
    caIndex.ok,
    `GET /current-affairs -> ${caIndex.status}`,
    `GET /current-affairs failed -> ${caIndex.status}`
  );

  const health = await fetchJson(`${base}/api/admin-health`, timeoutMs);
  mark(
    health.ok && health.json && health.json.ok === true,
    `/api/admin-health ok`,
    `/api/admin-health not ok (status=${health.status})`
  );

  if (!dailySlug && caIndex.ok) {
    dailySlug = extractSlug(caIndex.text, "daily");
  }
  if (!monthlySlug && caIndex.ok) {
    monthlySlug = extractSlug(caIndex.text, "monthly");
  }

  if (dailySlug) {
    const dailyPage = await fetchText(
      `${base}/current-affairs/daily/${dailySlug}`,
      timeoutMs
    );
    mark(
      dailyPage.ok,
      `GET /current-affairs/daily/${dailySlug} -> ${dailyPage.status}`,
      `Daily slug page failed (${dailySlug}) -> ${dailyPage.status}`
    );

    const dailyDebug = await fetchJson(
      `${base}/api/ca-debug?slug=${encodeURIComponent(dailySlug)}`,
      timeoutMs
    );
    const okDebug =
      dailyDebug.ok &&
      dailyDebug.json &&
      dailyDebug.json.ok === true &&
      dailyDebug.json.would404Reason == null;
    mark(
      okDebug,
      `/api/ca-debug daily (${dailySlug}) ok`,
      `/api/ca-debug daily (${dailySlug}) indicates problem`
    );
  } else {
    fail("Could not discover a daily slug from /current-affairs. Pass --daily-slug.");
    failures += 1;
  }

  if (monthlySlug) {
    const monthlyPage = await fetchText(
      `${base}/current-affairs/monthly/${monthlySlug}`,
      timeoutMs
    );
    mark(
      monthlyPage.ok,
      `GET /current-affairs/monthly/${monthlySlug} -> ${monthlyPage.status}`,
      `Monthly slug page failed (${monthlySlug}) -> ${monthlyPage.status}`
    );
  } else {
    fail("Could not discover a monthly slug from /current-affairs. Pass --monthly-slug.");
    failures += 1;
  }

  if (failures > 0) {
    console.error(`\nSmoke check failed with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log("\nSmoke check passed.");
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});

