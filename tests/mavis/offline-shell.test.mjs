import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../public/mavis-offline/", import.meta.url);
const [html, app, worker, dock] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("sw.js", root), "utf8"),
  readFile(new URL("../../src/components/mavis/MavisAvatarDock.jsx", import.meta.url), "utf8"),
]);

test("offline service worker precaches every runtime dependency", () => {
  for (const asset of ["index.html", "app.js", "search.mjs", "answer.mjs", "knowledge.json", "published-articles.json", "intake.html", "intake.js", "intake-core.mjs"]) {
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
  assert.match(html, /\.panel:has\(\+ #offline-answer:not\(\[hidden\]\)\)/);
  assert.match(html, /\.panel\[aria-labelledby="search-title"\]\{margin-bottom:0;[^}]*border-bottom:0/);
  assert.match(html, /#offline-answer\{margin:0;[^}]*border-top:0;border-bottom:0/);
  assert.match(html, /\.panel\[aria-labelledby="source-registry-title"\]\{margin-top:0!important;border-top:0/);
  assert.match(html, /\.answer-source-status/);
  assert.match(html, /\.answer-caution/);
  assert.match(html, /\.user-message\{/);
  assert.match(app, /function renderAnswer\(answer,query,records\)/);
  assert.match(app, /render\(records,resultRoot\)/);
  assert.match(html, /id="conversation-history"/);
  assert.doesNotMatch(html, /id="results"/);
  assert.ok(html.indexOf('id="intake-section"') > html.indexOf('id="offline-answer"'));
  assert.match(html, /این ابزار مدل زبانی مولد یا جایگزین مشاوره حقوقی نیست/);
  assert.match(html, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /#intake-section \.grid\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB/);
  assert.match(app, /root\.append\(turn\)/);
});

test("offline page clearly limits the guarantee to the cached route and downloaded data", () => {
  assert.match(html, /یک‌بار با اینترنت باز کنید/);
  assert.match(html, /ارسال درخواست به دفتر بدون اتصال انجام نمی‌شود/);
  assert.match(html, /noindex,follow/);
});

test("MAVIS opens one local conversation with an embedded conditional intake", async () => {
  const intake = await readFile(new URL("intake.html", root), "utf8");
  assert.match(dock, /href="\/mavis-offline\/index\.html"/);
  assert.match(html, /id="intake-section"[^>]*hidden/);
  assert.match(html, /id="intake-open"/);
  assert.match(html, /id="footer-intake-open"/);
  assert.match(app, /const openIntake=\(\)=>/);
  assert.match(app, /if\(answer\)answer\.hidden=false/);
  assert.match(app, /#intake-open, #footer-intake-open/);
  assert.match(html, /id="intake-form"/);
  assert.match(html, /id="intake-guidance"/);
  assert.doesNotMatch(html, /href="\.\/intake\.html"/);
  assert.doesNotMatch(html, /data-step-panel|data-next-step|data-prev-step|class="stepper"/);
  assert.match(app, /import "\.\/intake\.js"/);
  assert.match(app, /detectIntakeTopic\(raw\)/);
  assert.match(app, /mavis:topic-detected/);
  assert.match(app, /PUBLISHED_ARTICLES_URL/);
  assert.match(app, /corpus\.records\.push\(\.\.\.articleRecords\)/);
  assert.match(intake, /name="caseConsent"/);
  assert.match(intake, /name="thirdPartyNotice"/);
  assert.match(intake, /name="marketingConsent"/);
  assert.match(intake, /id="copy-open"/);
  assert.match(intake, /هیچ پیامی بدون اقدام نهایی شما ارسال نمی‌شود/);
  assert.match(intake, /data-step-panel="1"/);
  assert.match(intake, /data-step-panel="4"/);
  assert.match(intake, /name="contactWindow"/);
  assert.match(intake, /name="urgentSignal"/);
  assert.match(intake, /data-next-step="2"/);
  assert.match(intake, /data-prev-step="3"/);
});
