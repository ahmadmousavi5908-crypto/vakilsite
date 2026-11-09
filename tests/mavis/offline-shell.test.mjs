import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../public/mavis-offline/", import.meta.url);
const connectivityRoute = await readFile(new URL("../../src/app/api/mavis/connectivity/route.js", import.meta.url), "utf8");
const knowledge = JSON.parse(await readFile(new URL("../../public/mavis-offline/knowledge.json", import.meta.url), "utf8"));
const publishedArticles = JSON.parse(await readFile(new URL("../../public/mavis-offline/published-articles.json", import.meta.url), "utf8"));

const [html, app, worker] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("sw.js", root), "utf8"),
]);

test("offline connectivity status probes the uncached same-origin server independently of navigator.onLine", () => {
  assert.match(app, /if\(!navigator\.onLine\)/);
  assert.match(app, /fetch\("\/api\/mavis\/connectivity"/);
  assert.match(app, /cache:"no-store"/);
  assert.match(app, /credentials:"omit"/);
  assert.match(app, /setTimeout\(\(\)=>controller\.abort\(\),1800\)/);
  assert.match(app, /جست‌وجوی آفلاین همچنان فعال است/);
  assert.match(app, /میزبان وب ماویس پاسخ می‌دهد/);
  assert.doesNotMatch(app, /سرویس ماویس در دسترس است/);
  assert.doesNotMatch(connectivityRoute, /createServiceClient|supabase/i);
  assert.match(connectivityRoute, /force-dynamic/);
  assert.match(connectivityRoute, /Cache-Control/);
  assert.match(connectivityRoute, /no-store, no-cache, must-revalidate/);
});

test("network status changes are announced to assistive technology", () => {
  assert.match(html, /id="network-status" role="status" aria-live="polite"/);
  assert.match(html, /id="network-dot" aria-hidden="true"/);
});

test("offline service worker precaches every runtime dependency", () => {
  for (const asset of ["index.html", "app.js", "search.mjs", "answer.mjs", "knowledge.json", "published-articles.json"]) {
    assert.ok(worker.includes("/mavis-offline/" + asset), "missing precache asset: " + asset);
  }
  assert.match(worker, /cache\.addAll\(ASSETS\)/);
  assert.match(worker, /self\.skipWaiting\(\)/);
});

test("offline cache reads stay inside the versioned MAVIS cache", () => {
  assert.match(worker, /const CACHE_NAME = "mavis-offline-v1\\.2\\.0-/);
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
  assert.match(app, /worker\.state==="activated"&&registration\.active===worker\)updateCacheStatus\("ready"\)/);
  assert.match(app, /worker\.state==="redundant"\)updateCacheStatus\("failed"\)/);
  assert.match(app, /updateCacheStatus\("unsupported"\)/);
});

test("offline answer panel has visible provenance and accessible live-region markup", () => {
  assert.match(html, /id="offline-answer"[^>]*aria-live="polite"/);
  assert.match(html, /\.answer-card\{/);
  assert.match(html, /\.answer-source-status/);
  assert.match(html, /\.answer-caution/);
});

test("offline public bundle contains no client credentials or intake identity fields", () => {
  const forbiddenKeys = new Set(["fullName", "phone", "email", "password", "otp", "accessToken", "refreshToken", "trackingCode", "idempotencyKey", "caseFile", "clientId"]);
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbiddenKeys.has(key), "private client field leaked into offline bundle: " + key);
      visit(child);
    }
  };
  visit(knowledge);
  visit(publishedArticles);
});

test("offline service worker is scoped to the public knowledge route and does not cache private APIs", () => {
  assert.match(worker, /const OFFLINE_INDEX = "\/mavis-offline\/index\.html"/);
  assert.match(worker, /url\.pathname\.startsWith\(scopePath\)/);
  assert.doesNotMatch(worker, /\/api\/|\/admin\/|\/client-portal\//);
});

test("offline page clearly limits the guarantee to the cached route and downloaded data", () => {
  assert.match(html, /یک‌بار با اینترنت باز کنید/);
  assert.match(html, /ثبت درخواست و ارسال مدارک بدون اتصال انجام نمی‌شود/);
  assert.match(html, /noindex,follow/);
});


test("offline public assistant merges generated published articles into the local corpus", () => {
  assert.match(app, /PUBLISHED_ARTICLES_URL/);
  assert.match(app, /publishedBundle\.records/);
  assert.match(app, /record\.review_status!=="secondary_source_only"/);
  assert.match(app, /published_article:"مقاله آموزشی سایت/);
  assert.equal(publishedArticles.records.length, publishedArticles.counts.published_articles);
  assert.ok(publishedArticles.records.every((record) => record.review_status === "secondary_source_only"));
});


test("offline published article results expose the full educational text accessibly", () => {
  assert.match(app, /article-fulltext/);
  assert.match(app, /مطالعه متن کامل آموزشی/);
  assert.match(app, /item\.record_type==="published_article"&&item\.definition/);
  assert.match(app, /if\(item\.warning\)/);
});
