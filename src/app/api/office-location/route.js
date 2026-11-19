import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getInMemoryCachedValue } from "../../../lib/cache/in-memory-cache.mjs";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
};

async function loadPublicOfficeLocation() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("office_name,address,city,province,latitude,longitude,map_url,phone,is_location_public")
    .eq("setting_key", "office_location")
    .eq("is_location_public", true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function GET() {
  try {
    const location = await getInMemoryCachedValue(
      "public:office-location:v1",
      loadPublicOfficeLocation,
      { ttlMs: 60_000, staleIfErrorMs: 300_000 },
    );

    return NextResponse.json({ location }, { headers: responseHeaders });
  } catch {
    return NextResponse.json({ location: null }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
