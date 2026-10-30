import { articles } from "../data/articles";

export default function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];

  const base = siteUrl.replace(/\/$/, "");
  const now = new Date();
  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: base + "/ai-assistant",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: base + "/lawyer-cooperation",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: base + "/privacy",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: base + "/articles",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: base + "/legal-glossary",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: base + "/articles/" + article.slug,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}
