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
  for (const asset of ["index.html", "app.js", "search.mjs", "answer.mjs", "knowledge.json", "intake.html", "intake.js", "intake-core.mjs"]) {
    assert.ok(worker.includes("/mavis-offline/" + asset), "missing precache asset: " + asset);
  }
  assert.match(worker, /cache\.addAll\(ASSETS\)/);
  assert.match(worker, /self\.skipWaiting\(\)/);
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

test("offline library links to a privacy-preserving conditional intake form", async () => {
  const intake = await readFile(new URL("intake.html", root), "utf8");
  assert.match(html, /href="\.\/intake\.html"/);
  assert.match(intake, /id="intake-form"/);
  assert.match(intake, /name="caseConsent"/);
  assert.match(intake, /name="thirdPartyNotice"/);
  assert.match(intake, /name="marketingConsent"/);
  assert.match(intake, /id="copy-open"/);
  assert.match(intake, /هیچ پیامی بدون اقدام نهایی شما ارسال نمی‌شود/);
});
