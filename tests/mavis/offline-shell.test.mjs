import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../public/mavis-offline/", import.meta.url);
const [html, app, worker] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("sw.js", root), "utf8"),
]);

test("offline service worker precaches every runtime dependency", () => {
  for (const asset of ["index.html", "app.js", "search.mjs", "answer.mjs", "knowledge.json"]) {
    assert.ok(worker.includes("/mavis-offline/" + asset), "missing precache asset: " + asset);
  }
  assert.match(worker, /cache\.addAll\(ASSETS\)/);
  assert.match(worker, /self\.skipWaiting\(\)/);
});

test("offline cache reads stay inside the versioned MAVIS cache", () => {
  assert.match(worker, /const CACHE_NAME = "mavis-offline-v1\.0\.6-/);
  assert.match(worker, /caches\.open\(CACHE_NAME\)[\s\S]*?cache\.match\(request\)/);
  assert.doesNotMatch(worker, /caches\.match\(/);
});

test("network cache writes extend the service-worker event lifetime", () => {
  assert.match(worker, /event\.waitUntil\([\s\S]*?responsePromise/);
  assert.match(worker, /cache\.put\(request, response\.clone\(\)\)/);
  assert.match(worker, /cache\.put\(OFFLINE_INDEX, response\.clone\(\)\)/);
});

test("offline readiness is not announced before service-worker activation", () => {
  assert.match(app, /updateCacheStatus\("pending"\)/);
  assert.match(app, /worker\.state==="activated"\)updateCacheStatus\("ready"\)/);
  assert.match(app, /worker\.state==="redundant"\)updateCacheStatus\("failed"\)/);
  assert.match(app, /updateCacheStatus\("unsupported"\)/);
});

test("offline answer panel has visible provenance and accessible live-region markup", () => {
  assert.match(html, /id="offline-answer"[^>]*aria-live="polite"/);
  assert.match(html, /\.answer-card\{/);
  assert.match(html, /\.answer-source-status/);
  assert.match(html, /\.answer-caution/);
});

test("offline page clearly limits the guarantee to the cached route and downloaded data", () => {
  assert.match(html, /یک‌بار با اینترنت باز کنید/);
  assert.match(html, /ثبت درخواست و ارسال مدارک بدون اتصال انجام نمی‌شود/);
  assert.match(html, /noindex,follow/);
});
