import { articles as siteArticles } from "../../data/articles";
import { createClient } from "../supabase/server";
import { mapPublishedEditorialRecord } from "./editorial-content-core.mjs";

export async function getMavisPublishedArticles() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_mavis_published_articles");
    if (error || !Array.isArray(data)) return [];
    return data
      .map((record) => mapPublishedEditorialRecord({ ...record, status: "published" }))
      .filter(Boolean);
  } catch {
    return [];
  }
}

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
