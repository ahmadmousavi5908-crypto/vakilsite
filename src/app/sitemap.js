import { articles } from "../data/articles";
import { practiceAreas } from "../data/practice-areas";
import { getIndexableLegalRecords } from "../lib/legal-library";
import { getPublishedEditorialArticles } from "../lib/mavis/editorial-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return [];

  const base = siteUrl.replace(/\/$/, "");
  const editorialArticles = await getPublishedEditorialArticles();
  const staticSlugs = new Set(articles.map((article) => article.slug));
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: base + "/ai-assistant",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: base + "/lawyer-cooperation",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: base + "/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: base + "/articles",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: base + "/services",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: base + "/about",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: base + "/locations/khuzestan",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...practiceAreas.map((area) => ({
      url: base + "/services/" + area.slug,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    {
      url: base + "/legal-glossary",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: base + "/legal-library",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: base + "/legal-library/catalog",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...getIndexableLegalRecords().map((record) => ({
      url: base + record.path,
      changeFrequency: "monthly",
      priority: 0.55,
    })),
    ...articles.map((article) => ({
      url: base + "/articles/" + article.slug,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
    ...editorialArticles.filter((article) => article.isIndexable && !staticSlugs.has(article.slug)).map((article) => ({
      url: base + "/articles/" + article.slug,
      lastModified: article.updatedAt || article.publishedAt || undefined,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}
