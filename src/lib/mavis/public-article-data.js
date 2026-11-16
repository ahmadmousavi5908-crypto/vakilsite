import { createPublicContentClient } from "../supabase/public-content";
import { mapPublishedMavisArticle } from "./public-article-mapper.mjs";

const PUBLIC_ARTICLE_FIELDS = "id, slug, title, author_name, excerpt, category, content, tags, seo_title, seo_description, published_at, updated_at";

export async function getPublishedMavisArticleBySlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length > 180) {
    return null;
  }

  try {
    const supabase = createPublicContentClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("mavis_articles")
      .select(PUBLIC_ARTICLE_FIELDS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return null;

    let sources = [];
    const { data: sourceData, error: sourceError } = await supabase.rpc("get_public_mavis_article_sources", {
      p_article_id: data.id,
    });
    if (!sourceError && Array.isArray(sourceData)) sources = sourceData;

    return mapPublishedMavisArticle(data, sources);
  } catch {
    return null;
  }
}
