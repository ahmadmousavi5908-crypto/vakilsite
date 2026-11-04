import { readFile } from "node:fs/promises";

const baseUrl = (process.env.SITE_TEST_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function readCanonical(html) {
  const tags = html.match(/<link\\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = tag.match(/\\brel\\s*=\\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (rel !== "canonical") continue;
    return tag.match(/\\bhref\\s*=\\s*["']([^"']+)["']/i)?.[1] || null;
  }
  return null;
}

function readMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== key.toLowerCase()) continue;
    return tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase() || "";
  }
  return null;
}

async function fetchText(path) {
  const response = await fetch(baseUrl + path, { signal: AbortSignal.timeout(15000) });
  return { response, body: await response.text() };
}

const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
const routes = Object.keys(manifest.routes || {})
  .filter((path) => path.startsWith("/legal-library"))
  .sort();

const termsData = JSON.parse(await readFile("src/data/legal-library/terms/terms.json", "utf8"));
const lawsData = JSON.parse(await readFile("src/data/legal-library/laws/laws.json", "utf8"));
const articlesData = JSON.parse(await readFile("src/data/legal-library/articles/articles.json", "utf8"));
function createSlug(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .toLocaleLowerCase("fa-IR")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const lawById = new Map(lawsData.records.map((record) => [record.id, record]));
const allRecords = [
  ...termsData.records.map((record) => ({
    ...record,
    path: "/legal-library/terms/" + createSlug(record.canonical),
  })),
  ...lawsData.records.map((record) => ({
    ...record,
    path: "/legal-library/laws/" + createSlug(record.title),
  })),
  ...articlesData.records.map((record) => {
    const law = lawById.get(record.law_id);
    const slug = createSlug((law?.title || "قانون") + " ماده " + record.article_number + " " + record.title);
    return { ...record, path: "/legal-library/articles/" + slug };
  }),
];
const indexable = new Set(
  allRecords
    .filter((record) => record.review_status === "verified_primary_source" &&
      record.source_verified === true &&
      Array.isArray(record.sources) &&
      record.sources.some((source) => source?.source_type === "primary" &&
        typeof source.url === "string" && /^https:\/\//i.test(source.url)))
    .map((record) => record.path)
    .filter(Boolean)
);
const detailRoutes = new Set(allRecords.map((record) => record.path).filter(Boolean));

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < routes.length) {
    const path = routes[cursor++];
    try {
      const { response, body } = await fetchText(path);
      const robots = response.ok ? readMeta(body, "robots") : null;
      const expectedNoindex = detailRoutes.has(path) && !indexable.has(path);
      const hasNoindex = Boolean(robots && /(^|[,\s])noindex([,\s]|$)/.test(robots));
      results.push({
        path,
        status: response.status,
        expectedNoindex,
        hasNoindex,
        notFoundMarkup: /This page could not be found|404: Not Found/i.test(body),
      });
    } catch (error) {
      results.push({ path, status: "ERROR", error: error.message });
    }
  }
}

console.log("BASE URL:", baseUrl);
console.log("LEGAL LIBRARY ROUTES IN BUILD:", routes.length);
await Promise.all(Array.from({ length: 6 }, worker));

const failed = results.filter((item) => item.status !== 200 || item.notFoundMarkup);
const noindexExpected = results.filter((item) => item.expectedNoindex && item.status === 200);
const noindexMissing = noindexExpected.filter((item) => !item.hasNoindex);

console.log("\n===== HTTP ROUTE RESULTS =====");
console.log("HTTP 200:", results.filter((item) => item.status === 200).length);
console.log("FAILED:", failed.length);
console.log("NOINDEX EXPECTED:", noindexExpected.length);
console.log("NOINDEX PRESENT:", noindexExpected.length - noindexMissing.length);
if (failed.length) {
  console.log("\nFAILED ROUTES:");
  for (const item of failed) console.log(item.status, item.path, item.error || "");
}
if (noindexMissing.length) {
  console.log("\nMISSING NOINDEX:");
  for (const item of noindexMissing) console.log(item.path);
}

const canonicalRoutes = ["/ai-assistant", "/lawyer-cooperation", "/privacy"];
const canonicalFailures = [];
for (const path of canonicalRoutes) {
  const { response, body } = await fetchText(path);
  const canonical = readCanonical(body);
  const expected = canonicalOrigin ? new URL(path, canonicalOrigin).href : null;
  if (!response.ok || !canonical || canonical !== expected) {
    canonicalFailures.push({ path, status: response.status, canonical, expected });
  }
}
const adminLogin = await fetchText("/admin/login");
const adminLoginRobots = adminLogin.response.ok ? readMeta(adminLogin.body, "robots") : null;
const adminLoginNoindex = Boolean(adminLoginRobots && /(^|[,\\s])noindex([,\\s]|$)/.test(adminLoginRobots));

const sitemapResult = await fetchText("/sitemap.xml");
const sitemapUrls = [...sitemapResult.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedPublicPaths = ["/", "/articles", "/services", "/about", "/legal-library", "/ai-assistant"];
const sitemapOrigins = new Set();
const sitemapPaths = new Set();
const invalidSitemapUrls = [];
for (const value of sitemapUrls) {
  try {
    const url = new URL(value);
    sitemapOrigins.add(url.origin);
    sitemapPaths.add(decodeURIComponent(url.pathname));
    if (url.protocol !== "https:" || url.search || url.hash || url.username || url.password) {
      invalidSitemapUrls.push(value);
    }
  } catch {
    invalidSitemapUrls.push(value);
  }
}
const canonicalOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
  : null;
const wrongSitemapOrigins = canonicalOrigin
  ? [...sitemapOrigins].filter((origin) => origin !== canonicalOrigin)
  : [];
const missingPublicPaths = expectedPublicPaths.filter((path) => !sitemapPaths.has(path));
const privateSitemapUrls = [...sitemapPaths].filter((path) =>
  path === "/admin" || path.startsWith("/admin/") ||
  path === "/api" || path.startsWith("/api/")
);
const unverifiedInSitemap = sitemapUrls.filter((value) => {
  try {
    const pathname = decodeURIComponent(new URL(value).pathname);
    return detailRoutes.has(pathname) && !indexable.has(pathname);
  } catch {
    return true;
  }
});
console.log("\n===== SITEMAP =====");
console.log("HTTP:", sitemapResult.response.status);
console.log("URL COUNT:", sitemapUrls.length);
console.log("CANONICAL ORIGINS:", [...sitemapOrigins].join(", ") || "NONE");
console.log("MISSING REQUIRED PUBLIC PATHS:", missingPublicPaths.length);
console.log("INVALID URLS:", invalidSitemapUrls.length);
console.log("WRONG ORIGINS:", wrongSitemapOrigins.length);
console.log("PRIVATE URLS:", privateSitemapUrls.length);
console.log("UNVERIFIED DETAIL URLS:", unverifiedInSitemap.length);
for (const value of [...missingPublicPaths, ...invalidSitemapUrls, ...wrongSitemapOrigins, ...privateSitemapUrls, ...unverifiedInSitemap]) {
  console.log("SITEMAP ISSUE:", value);
}

const robotsResult = await fetchText("/robots.txt");
const robotsChecks = {
  oaiSearchAllowed: /User-Agent:\s*OAI-SearchBot[\s\S]*?Allow:\s*\//i.test(robotsResult.body),
  claudeSearchAllowed: /User-Agent:\s*Claude-SearchBot[\s\S]*?Allow:\s*\//i.test(robotsResult.body),
  perplexityAllowed: /User-Agent:\s*PerplexityBot[\s\S]*?Allow:\s*\//i.test(robotsResult.body),
  gptBotBlocked: /User-Agent:\s*GPTBot[\s\S]*?Disallow:\s*\//i.test(robotsResult.body),
  claudeBotBlocked: /User-Agent:\s*ClaudeBot[\s\S]*?Disallow:\s*\//i.test(robotsResult.body),
  googleExtendedBlocked: /User-Agent:\s*Google-Extended[\s\S]*?Disallow:\s*\//i.test(robotsResult.body),
  adminBlocked: /Disallow:\s*\/admin/i.test(robotsResult.body),
  apiBlocked: /Disallow:\s*\/api/i.test(robotsResult.body),
  sitemapMatchesCanonical: canonicalOrigin
    ? robotsResult.body.includes("Sitemap: " + canonicalOrigin + "/sitemap.xml")
    : false,
};
console.log("\n===== ROBOTS =====");
console.log("HTTP:", robotsResult.response.status);
for (const [name, passed] of Object.entries(robotsChecks)) console.log(name + ":", passed ? "PASS" : "FAIL");

if (failed.length || noindexMissing.length || canonicalFailures.length || !adminLoginNoindex || sitemapResult.response.status !== 200 ||
    sitemapUrls.length === 0 || missingPublicPaths.length || invalidSitemapUrls.length ||
    wrongSitemapOrigins.length || privateSitemapUrls.length || unverifiedInSitemap.length ||
    robotsResult.response.status !== 200 || Object.values(robotsChecks).some((passed) => !passed)) {
  if (failed.length && routes.length) {
    console.log("\nPOSSIBLE STALE SERVER BUILD: the build manifest contains these routes, but the running server does not serve them. Stop the old Next.js server, build the current branch, then start the production server again.");
  }
  process.exit(1);
}
console.log("\nLEGAL LIBRARY HTTP CHECK PASSED");
