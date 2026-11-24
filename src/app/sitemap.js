import { articles } from "../data/articles";
import { getMavisPublishedArticles } from "../lib/mavis/published-editorial";
import { practiceAreas } from "../data/practice-areas";
import { getIndexableLegalRecords } from "../lib/legal-library";
import { getSiteUrl } from "../lib/site-url.mjs";
import { buildSitemapEntries } from "../lib/sitemap.mjs";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const siteUrl = getSiteUrl(process.env, { required: true });
  const publishedArticles = await getMavisPublishedArticles();
  const publishedSlugs = new Set(publishedArticles.map((article) => article.slug));
  const entries = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/ai-assistant", changeFrequency: "monthly", priority: 0.6 },
    { path: "/lawyer-cooperation", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/articles", changeFrequency: "weekly", priority: 0.8 },
    { path: "/articles/library", changeFrequency: "weekly", priority: 0.75 },
    { path: "/services", changeFrequency: "monthly", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/locations/khuzestan", changeFrequency: "monthly", priority: 0.8 },
    ...practiceAreas.map((area) => ({
      path: "/services/" + area.slug,
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
    ...articles.filter((article) => !publishedSlugs.has(article.slug)).map((article) => ({
      path: "/articles/" + article.slug,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
    ...publishedArticles.filter((article) => article.isIndexable === true).map((article) => ({
      path: "/articles/" + article.slug,
      changeFrequency: "monthly",
      priority: 0.7,
      ...(article.coverImageUseForSeo && article.coverImageUrl
        ? { images: [article.coverImageUrl] }
        : {}),
    })),
  ];

  return buildSitemapEntries(entries, siteUrl);
}
