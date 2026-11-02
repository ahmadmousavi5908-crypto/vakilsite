import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadLocalEnv() {
  try {
    const content = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // Environment variables may be supplied by the deployment platform.
  }
}

await loadLocalEnv();

const key = process.env.INDEXNOW_KEY?.trim();
const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const inputUrls = process.argv.slice(2);

if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  throw new Error("Set a valid INDEXNOW_KEY in .env.local or the deployment environment.");
}
if (!configuredSite) {
  throw new Error("Set NEXT_PUBLIC_SITE_URL to the canonical HTTPS site origin.");
}
if (!inputUrls.length) {
  throw new Error("Pass one or more changed public URLs or paths. Do not submit the whole sitemap routinely.");
}

const site = new URL(configuredSite);
if (site.protocol !== "https:") {
  throw new Error("IndexNow requires the public canonical HTTPS site URL.");
}

const urls = [...new Set(inputUrls.map((value) => new URL(value, site.origin).href))];
for (const value of urls) {
  const url = new URL(value);
  if (url.origin !== site.origin) throw new Error("Every submitted URL must belong to the canonical site host.");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Submit clean public page URLs without credentials, query strings, or fragments.");
  }
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/")) {
    throw new Error("Private admin and API paths must never be submitted to IndexNow.");
  }
}
if (urls.length > 10000) throw new Error("IndexNow accepts at most 10,000 URLs per request.");

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: site.host,
    key,
    keyLocation: new URL("/indexnow-key.txt", site.origin).href,
    urlList: urls,
  }),
});

if (response.status !== 200 && response.status !== 202) {
  const details = await response.text();
  throw new Error(`IndexNow rejected the request (HTTP ${response.status}): ${details}`);
}

console.log(JSON.stringify({
  accepted: true,
  status: response.status,
  submitted: urls.length,
  note: response.status === 202
    ? "Accepted; the search engine may still be verifying the key."
    : "URLs accepted for notification. Indexing is not guaranteed.",
}, null, 2));
