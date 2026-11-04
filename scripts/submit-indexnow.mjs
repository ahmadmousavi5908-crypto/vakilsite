import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isPrivateIndexNowPath, isValidIndexNowKey } from "./indexnow-validation.mjs";

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

if (!isValidIndexNowKey(key)) {
  throw new Error("Set an 8 to 128 character alphanumeric INDEXNOW_KEY (hyphens allowed) in .env.local or the deployment environment.");
}
if (!configuredSite) {
  throw new Error("Set NEXT_PUBLIC_SITE_URL to the canonical HTTPS site origin.");
}
if (!inputUrls.length) {
  throw new Error("Pass one or more changed public URLs or paths. Do not submit the whole sitemap routinely.");
}

const site = new URL(configuredSite);
if (site.protocol !== "https:" || site.pathname !== "/" || site.search || site.hash) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be the canonical HTTPS origin only, without a path, query, or fragment.");
}

const urls = [...new Set(inputUrls.map((value) => new URL(value, site.origin).href))];
for (const value of urls) {
  const url = new URL(value);
  if (url.origin !== site.origin) throw new Error("Every submitted URL must belong to the canonical site host.");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Submit clean public page URLs without credentials, query strings, or fragments.");
  }
  if (isPrivateIndexNowPath(url.pathname)) {
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
