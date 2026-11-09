import { readFile } from "node:fs/promises";

const baseUrl = (process.env.SITE_TEST_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function readCanonical(html) {
  const tag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1] || null;
}

function canonicalPath(value) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).pathname.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

function readMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
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

const publicCanonicalPaths = [
  "/", "/about", "/articles", "/services", "/lawyer-cooperation",
  "/privacy", "/legal-library", "/legal-glossary", "/locations/khuzestan",
];
const canonicalResults = [];
for (const path of publicCanonicalPaths) {
  try {
    const { response, body } = await fetchText(path);
    const canonical = readCanonical(body);
    const actualPath = canonicalPath(canonical);
    canonicalResults.push({ path, status: response.status, canonical, actualPath });
  } catch (error) {
    canonicalResults.push({ path, status: "ERROR", error: error.message });
  }
}

const aiAssistantResult = await fetchText("/ai-assistant");
const aiAssistantRobots = readMeta(aiAssistantResult.body, "robots") || "";
const aiAssistantCanonical = canonicalPath(readCanonical(aiAssistantResult.body));
const aiAssistantNoindex = /(^|[,\s])noindex([,\s]|$)/.test(aiAssistantRobots);

const homeResult = await fetchText("/");
const homeSiteName = readMeta(homeResult.body, "og:site_name");
const jsonLdBlocks = [...homeResult.body.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
let websiteSchemaName = null;
for (const match of jsonLdBlocks) {
  try {
    const data = JSON.parse(match[1]);
    const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    websiteSchemaName = nodes.find((node) => node["@type"] === "WebSite")?.name || websiteSchemaName;
  } catch {
    // Ignore unrelated or malformed blocks here; schema validation is handled separately.
  }
}

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

console.log("\\n===== PUBLIC CANONICALS =====");
console.log("CHECKED:", canonicalResults.length);
console.log("CANONICAL MISMATCHES:", canonicalResults.filter((item) => item.status !== 200 || item.actualPath !== item.path).length);
console.log("AI ASSISTANT NOINDEX:", aiAssistantNoindex);
console.log("AI ASSISTANT CANONICAL:", aiAssistantCanonical);
console.log("HOME OG SITE NAME:", homeSiteName);
console.log("HOME WEB SITE SCHEMA NAME:", websiteSchemaName);

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

const sitemapResult = await fetchText("/sitemap.xml");
const sitemapUrls = [...sitemapResult.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const unverifiedInSitemap = sitemapUrls.filter((url) => {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    return detailRoutes.has(pathname) && !indexable.has(pathname);
  } catch {
    return false;
  }
});
console.log("\n===== SITEMAP =====");
console.log("HTTP:", sitemapResult.response.status);
console.log("URL COUNT:", sitemapUrls.length);
console.log("UNVERIFIED DETAIL URLS:", unverifiedInSitemap.length);
for (const url of unverifiedInSitemap) console.log(url);

const robotsResult = await fetchText("/robots.txt");
console.log("\n===== ROBOTS =====");
console.log("HTTP:", robotsResult.response.status);
console.log("OAI-SearchBot POLICY PRESENT:", /OAI-SearchBot/i.test(robotsResult.body));
console.log("GPTBot POLICY PRESENT:", /GPTBot/i.test(robotsResult.body));

const canonicalMismatches = canonicalResults.filter((item) =>
  item.status !== 200 || item.actualPath !== item.path
);
const aiAssistantInSitemap = sitemapUrls.some((url) => {
  try { return new URL(url).pathname === "/ai-assistant"; } catch { return false; }
});
const siteNameMismatch = !homeSiteName || !websiteSchemaName || homeSiteName !== websiteSchemaName;

if (failed.length || noindexMissing.length || sitemapResult.response.status !== 200 ||
    unverifiedInSitemap.length || robotsResult.response.status !== 200 ||
    canonicalMismatches.length || aiAssistantResult.response.status !== 200 ||
    !aiAssistantNoindex || aiAssistantCanonical !== "/ai-assistant" ||
    aiAssistantInSitemap || siteNameMismatch) {
  if (failed.length && routes.length) {
    console.log("\nPOSSIBLE STALE SERVER BUILD: the build manifest contains these routes, but the running server does not serve them. Stop the old Next.js server, build the current branch, then start the production server again.");
  }
  process.exit(1);
}
console.log("\nPUBLIC SEO AND LEGAL LIBRARY HTTP CHECK PASSED");
