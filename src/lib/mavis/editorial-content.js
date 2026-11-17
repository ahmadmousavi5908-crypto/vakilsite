import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { mapPublishedEditorialRecord } from "./editorial-content-core.mjs";

const getCachedPublishedEditorialArticles = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return [];

    try {
      const supabase = createSupabaseClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      const { data, error } = await supabase.rpc("get_mavis_published_articles");
      if (error || !Array.isArray(data)) return [];
      return data.map((record) => mapPublishedEditorialRecord({
        ...record,
        status: "published",
      })).filter(Boolean);
    } catch {
      return [];
    }
  },
  ["mavis-editorial-published-v1"],
  { revalidate: 300, tags: ["mavis-editorial"] },
);

export async function getPublishedEditorialArticles() {
  return getCachedPublishedEditorialArticles();
}

export async function getPublishedEditorialArticlesStrict() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Published editorial database is not configured.");

  const supabase = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.rpc("get_mavis_published_articles");
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Published editorial RPC returned an invalid response.");

  return data.map((record) => mapPublishedEditorialRecord({
    ...record,
    status: "published",
  })).filter(Boolean);
}

export async function getPublishedEditorialArticle(slug) {
  if (typeof slug !== "string" || !slug) return null;
  const articles = await getPublishedEditorialArticles();
  return articles.find((article) => article.slug === slug) || null;
}
