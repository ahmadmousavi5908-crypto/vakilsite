import { createClient } from "../supabase/server";
import { mapPublishedEditorialRecord } from "./editorial-content-core.mjs";

export async function getPublishedEditorialArticles() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_mavis_published_articles");
    if (error || !Array.isArray(data)) return [];
    return data.map((record) => mapPublishedEditorialRecord({
      ...record,
      status: "published",
    })).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getPublishedEditorialArticle(slug) {
  if (typeof slug !== "string" || !slug) return null;
  const articles = await getPublishedEditorialArticles();
  return articles.find((article) => article.slug === slug) || null;
}
