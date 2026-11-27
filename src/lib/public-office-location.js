import { createPublicClient } from "./supabase/public";
import { getInMemoryCachedValue } from "./cache/in-memory-cache.mjs";

const PUBLIC_OFFICE_LOCATION_COLUMNS =
  "office_name,city,province,is_location_public";
const STRUCTURED_DATA_OFFICE_LOCATION_COLUMNS =
  "office_name,city,province,phone,is_location_public";

async function loadOfficeLocation(columns) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select(columns)
    .eq("setting_key", "office_location")
    .eq("is_location_public", true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function readCachedOfficeLocation(cacheKey, columns) {
  try {
    return await getInMemoryCachedValue(
      cacheKey,
      () => loadOfficeLocation(columns),
      { ttlMs: 60_000, staleIfErrorMs: 300_000 },
    );
  } catch {
    return null;
  }
}

export async function getPublicOfficeLocation() {
  return readCachedOfficeLocation(
    "public:office-location:v1",
    PUBLIC_OFFICE_LOCATION_COLUMNS,
  );
}

export async function getOfficeLocationForStructuredData() {
  return readCachedOfficeLocation(
    "server:office-location-structured-data:v1",
    STRUCTURED_DATA_OFFICE_LOCATION_COLUMNS,
  );
}
