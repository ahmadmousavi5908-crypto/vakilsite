import "server-only";

import { createClient } from "@supabase/supabase-js";
import { articles as staticArticles } from "../../data/articles";
import { mapArticleRowToPublicArticle } from "./article-content.mjs";

const PUBLIC_COLUMNS = "id,slug,title,excerpt,category,read_time,content,seo_title,seo_description,status,version,published_at";

function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getPublishedArticles() {
  const client = createPublicClient();
  if (!client) return staticArticles;

  try {
    const { data, error } = await client
      .from("mavis_articles")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error || !Array.isArray(data) || data.length === 0) return staticArticles;
    const mapped = data.map(mapArticleRowToPublicArticle).filter(Boolean);
    return mapped.length > 0 ? mapped : staticArticles;
  } catch {
    return staticArticles;
  }
}

export async function getPublishedArticleBySlug(slug) {
  const client = createPublicClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("mavis_articles")
        .select(PUBLIC_COLUMNS)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!error && data) {
        const mapped = mapArticleRowToPublicArticle(data);
        if (mapped) return mapped;
      }
    } catch {
      // Fall back to the last known static public article when the database is unavailable.
    }
  }
  return staticArticles.find((article) => article.slug === slug) || null;
}

export async function getAdminArticleRecords(supabase) {
  const { data, error } = await supabase
    .from("mavis_articles")
    .select(PUBLIC_COLUMNS + ",created_at,updated_at,created_by,updated_by,approved_by,approved_at,last_change_note,source_origin")
    .order("updated_at", { ascending: false });
  return { data: Array.isArray(data) ? data : [], error };
}
