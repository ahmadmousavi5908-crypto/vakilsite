import { getSiteUrl } from "./site-url.mjs";

const ALLOWED_CHANGE_FREQUENCIES = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);

const MAX_SITEMAP_URLS = 50000;

export function buildSitemapEntries(entries, siteOrigin) {
  const base = getSiteUrl(
    { NEXT_PUBLIC_SITE_URL: siteOrigin },
    { required: true },
  );

  if (!Array.isArray(entries)) {
    throw new TypeError("Sitemap entries must be an array.");
  }

  if (entries.length > MAX_SITEMAP_URLS) {
    throw new Error("Sitemap exceeds the 50,000 URL limit; split it into multiple sitemaps.");
  }

  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    if (!entry || typeof entry.path !== "string") {
      throw new Error("Every sitemap entry must contain a path.");
    }

    const path = entry.path;
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("\\") ||
      /[\\u0000-\\u001f\\u007f]/.test(path) ||
      path.includes("?") ||
      path.includes("#")
    ) {
      throw new Error(`Invalid sitemap path: ${path}`);
    }

    let url;
    try {
      url = new URL(path, base);
    } catch {
      throw new Error(`Invalid sitemap URL path: ${path}`);
    }

    if (url.origin !== base || url.username || url.password) {
      throw new Error(`Sitemap path escaped the canonical origin: ${path}`);
    }

    if (
      url.pathname === "/admin" ||
      url.pathname.startsWith("/admin/") ||
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/")
    ) {
      throw new Error(`Private route cannot be included in sitemap: ${path}`);
    }

    if (!ALLOWED_CHANGE_FREQUENCIES.has(entry.changeFrequency)) {
      throw new Error(`Invalid sitemap changeFrequency for path: ${path}`);
    }

    if (
      typeof entry.priority !== "number" ||
      !Number.isFinite(entry.priority) ||
      entry.priority < 0 ||
      entry.priority > 1
    ) {
      throw new Error(`Invalid sitemap priority for path: ${path}`);
    }

    if (seen.has(url.href)) continue;
    seen.add(url.href);

    result.push({
      url: url.href,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    });
  }

  if (result.length === 0) {
    throw new Error("Sitemap generation produced no public URLs.");
  }

  return result;
}
