import { articles } from "../data/articles";
import { practiceAreas } from "../data/practice-areas";
import { getIndexableLegalRecords } from "../lib/legal-library";
import { getSiteUrl } from "../lib/site-url.mjs";

export default function sitemap() {
  const base = getSiteUrl(process.env, { required: true });

  const entries = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/ai-assistant", changeFrequency: "monthly", priority: 0.6 },
    { path: "/lawyer-cooperation", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/articles", changeFrequency: "weekly", priority: 0.8 },
    { path: "/services", changeFrequency: "monthly", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/locations/khuzestan", changeFrequency: "monthly", priority: 0.8 },
    ...practiceAreas.map((area) => ({
      path: `/services/${area.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    { path: "/legal-glossary", changeFrequency: "monthly", priority: 0.8 },
    { path: "/legal-library", changeFrequency: "monthly", priority: 0.7 },
    { path: "/legal-library/catalog", changeFrequency: "monthly", priority: 0.7 },
    ...getIndexableLegalRecords().map((record) => ({
      path: record.path,
      changeFrequency: "monthly",
      priority: 0.55,
    })),
    ...articles.map((article) => ({
      path: `/articles/${article.slug}`,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];

  const seen = new Set();
  const sitemapEntries = [];

  for (const entry of entries) {
    if (
      typeof entry.path !== "string" ||
      !entry.path.startsWith("/") ||
      entry.path.startsWith("//") ||
      entry.path.includes("?") ||
      entry.path.includes("#") ||
      entry.path === "/admin" ||
      entry.path.startsWith("/admin/") ||
      entry.path === "/api" ||
      entry.path.startsWith("/api/")
    ) {
      throw new Error(`Invalid or non-public sitemap path: ${entry.path}`);
    }

    const url = new URL(entry.path, base).href;
    if (seen.has(url)) continue;
    seen.add(url);

    sitemapEntries.push({
      url,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    });
  }

  if (sitemapEntries.length === 0) {
    throw new Error("Sitemap generation produced no public URLs.");
  }

  if (sitemapEntries.length > 50000) {
    throw new Error("Sitemap exceeds the 50,000 URL limit; split it into multiple sitemaps.");
  }

  return sitemapEntries;
}
