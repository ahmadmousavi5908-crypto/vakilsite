import { cache } from "react";
import { articles as siteArticles } from "../../data/articles";
import { createClient } from "../supabase/server";
import { getInMemoryCachedValue } from "../cache/in-memory-cache.mjs";
import { mapPublishedEditorialRecord } from "./editorial-content-core.mjs";

async function loadPublishedArticles() {
  return getInMemoryCachedValue(
    "mavis:public-published-articles:v1",
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("get_mavis_published_articles");
      if (error) throw error;
      if (!Array.isArray(data)) {
        throw new TypeError("Published article RPC returned an invalid payload.");
      }

      return data
        .map((record) => mapPublishedEditorialRecord({
          ...record,
          updated_at: record.published_at,
          status: "published",
        }))
        .filter(Boolean);
    },
    { ttlMs: 60_000, staleIfErrorMs: 300_000 },
  );
}

export const getMavisPublishedArticles = cache(async function getMavisPublishedArticles() {
  try {
    return await loadPublishedArticles();
  } catch {
    return [];
  }
});

export async function getPublicArticleBySlug(slug) {
  const published = await getMavisPublishedArticles();
  const cmsArticle = published.find((article) => article.slug === slug);
  if (cmsArticle) return cmsArticle;
  return siteArticles.find((article) => article.slug === slug) || null;
}

export async function getPublicArticleCatalog() {
  const published = await getMavisPublishedArticles();
  const publishedSlugs = new Set(published.map((article) => article.slug));
  const legacy = siteArticles.filter((article) => !publishedSlugs.has(article.slug));
  return [...published, ...legacy];
}
