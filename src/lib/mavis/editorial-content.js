import { createClient } from "../supabase/server";
import { mapPublishedEditorialRecord } from "./editorial-content-core.mjs";

export async function getPublishedEditorialArticles() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mavis_editorial_articles")
      .select("slug,published_content,status,is_indexable,published_at,updated_at")
      .eq("status", "published")
      .not("published_content", "is", null)
      .order("published_at", { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data.map(mapPublishedEditorialRecord).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getPublishedEditorialArticle(slug) {
  if (typeof slug !== "string" || !slug) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mavis_editorial_articles")
      .select("slug,published_content,status,is_indexable,published_at,updated_at")
      .eq("slug", slug)
      .eq("status", "published")
      .not("published_content", "is", null)
      .maybeSingle();
    if (error) return null;
    return mapPublishedEditorialRecord(data);
  } catch {
    return null;
  }
}
