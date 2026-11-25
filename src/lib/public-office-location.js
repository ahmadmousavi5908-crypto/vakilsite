import { createPublicClient } from "./supabase/public";
import { getInMemoryCachedValue } from "./cache/in-memory-cache.mjs";

async function loadPublicOfficeLocation() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("office_name,address,city,province,latitude,longitude,map_url,is_location_public")
    .eq("setting_key", "office_location")
    .eq("is_location_public", true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getPublicOfficeLocation() {
  try {
    return await getInMemoryCachedValue(
      "public:office-location:v1",
      loadPublicOfficeLocation,
      { ttlMs: 60_000, staleIfErrorMs: 300_000 },
    );
  } catch {
    return null;
  }
}
