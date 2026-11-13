import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../../public/mavis-offline/", import.meta.url);
const [html, app, worker, dock] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("sw.js", root), "utf8"),
  readFile(new URL("../../src/components/mavis/MavisAvatarDock.jsx", import.meta.url), "utf8"),
]);

test("offline service worker precaches every runtime dependency", () => {
  for (const asset of ["index.html", "app.js", "search.mjs", "answer.mjs", "knowledge.json", "published-articles.json", "intake.html", "intake.js", "intake-core.mjs", "mavis-welcome-hero.webp"]) {
    assert.ok(worker.includes("/mavis-offline/" + asset), "missing precache asset: " + asset);
  }
  assert.match(worker, /mavis-offline-v1\.3\.5-20261114/);
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
  assert.match(html, /ماویس دستیار هوشمند راهنمایی اولیه است؛ این ابزار مدل زبانی مولد یا جایگزین مشاوره حقوقی و بررسی تخصصی وکیل نیست/);
  assert.match(html, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /#intake-section \.grid,#intake-section \.document-checklist\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB/);
  assert.match(app, /root\.append\(turn\)/);
});


test("offline startup tolerates optional status elements omitted from the page", () => {
  assert.doesNotMatch(html, /id="(?:network-status|network-dot|bundle-status)"/);
  assert.match(app, /const status=\$\("network-status"\);const dot=\$\("network-dot"\);if\(status\)/);
  assert.match(app, /const status=\$\("bundle-status"\);if\(status\)/);
});

test("search controls are bound before asynchronous startup", () => {
  assert.match(app, /function bindSearchControls\(\)/);
  assert.ok(app.indexOf("bindSearchControls();") >= 0);
  assert.ok(app.indexOf("bindSearchControls();") < app.indexOf("boot();"));
});

test("offline page clearly limits the guarantee to the cached route and downloaded data", () => {
  assert.match(html, /یک‌بار با اینترنت باز کنید/);
  assert.match(html, /ارسال درخواست به دفتر بدون اتصال انجام نمی‌شود/);
  assert.match(html, /noindex,follow/);
});

test("MAVIS opens one local conversation with an embedded conditional intake", async () => {
  const intake = await readFile(new URL("intake.html", root), "utf8");
  assert.match(dock, /href="\/mavis-offline\/index\.html"/);
  assert.match(html, /id="intake-section" class="panel"/);
  assert.doesNotMatch(html, /id="intake-section"[^>]*hidden/);
  assert.match(html, /class="welcome-hero"/);
  assert.match(html, /src="\/mavis-offline\/mavis-welcome-hero\.png"/);
  assert.match(html, /width="780" height="1170"/);
  assert.match(html, /loading="eager" fetchpriority="high"/);
  assert.match(html, /width:100%;max-width:390px;height:auto;object-fit:contain/);
  assert.doesNotMatch(html, /\.welcome-portrait img\{[^}]*transform:/);
  assert.match(html, /سلام، من ماویس هستم/);
  assert.match(html, /دستیار هوشمند موسوی/);
  assert.match(html, /پرسش حقوقی‌تان را همین‌جا مطرح کنید/);
  assert.match(html, /ارتباط مستقیم با دفتر وکیل موسوی/);
  assert.match(html, /برای پیگیری، هماهنگی یا ارتباط با دفتر، از طریق واتساپ پیام بفرستید/);
  assert.match(html, /پیام به واتساپ دفتر/);
  assert.match(html, /href="https:\/\/wa\.me\/989169165902"/);
  assert.ok(html.indexOf('class="welcome-portrait"') < html.indexOf('class="welcome-copy"'));
  assert.doesNotMatch(html, /class="statusbar"|id="bundle-status"/);
  assert.match(app, /const section=\$\("intake-section"\)/);
  assert.match(app, /if\(section\)\{section\.hidden=false/);
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

test("offline search becomes available after the core library, without waiting for published articles", () => {
  const articleFetch = app.indexOf('const articlesPromise=fetch(PUBLISHED_ARTICLES_URL');
  const coreFetch = app.indexOf('await fetch(DATA_URL');
  const enableSearch = app.indexOf('$("submit").disabled=false');
  const waitForArticles = app.indexOf('await articlesPromise');
  assert.ok(articleFetch >= 0 && articleFetch < coreFetch, "published articles should start loading in parallel");
  assert.ok(coreFetch < enableSearch && enableSearch < waitForArticles, "core search should unlock before optional article data finishes");
  assert.match(app, /if\(articleResponse\?\.ok\)/);
});

test("MAVIS welcome image uses a compact WebP asset and remains precached offline", async () => {
  const hero = await stat(new URL("mavis-welcome-hero.webp", root));
  assert.ok(hero.size < 400_000, "MAVIS hero should remain below 400 KB");
  assert.match(html, /src="\\/mavis-offline\\/mavis-welcome-hero\\.webp"/);
  assert.doesNotMatch(worker, /mavis-welcome-hero\\.png/);
});

test("floating MAVIS and attorney docks shift inward only at desktop widths", async () => {
  const mavisCss = await readFile(new URL("../../src/components/mavis/MavisAvatarDock.module.css", import.meta.url), "utf8");
  const attorney = await readFile(new URL("../../src/components/AttorneyProfileDock.jsx", import.meta.url), "utf8");
  assert.match(mavisCss, /@media \\(min-width: 701px\\)[\\s\\S]*?left: clamp\\(20px, 2vw, 28px\\)/);
  assert.match(attorney, /className="attorney-profile-dock-root"/);
  assert.match(attorney, /@media \\(min-width: 701px\\)[\\s\\S]*?left: clamp\\(20px, 2vw, 28px\\) !important/);
});
