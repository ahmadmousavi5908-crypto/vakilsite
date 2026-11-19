import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getInMemoryCachedValue } from "../../../lib/cache/in-memory-cache.mjs";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
};

async function loadPublicSocialLinks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_links")
    .select("id,platform,label,url,link_type,sort_order")
    .eq("is_active", true)
    .order("link_type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function GET() {
  try {
    const links = await getInMemoryCachedValue(
      "public:social-links:v1",
      loadPublicSocialLinks,
      { ttlMs: 60_000, staleIfErrorMs: 300_000 },
    );

    return NextResponse.json({ links }, { headers: responseHeaders });
  } catch {
    return NextResponse.json({ links: [] }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
