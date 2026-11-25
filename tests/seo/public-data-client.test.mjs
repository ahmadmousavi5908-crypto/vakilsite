import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public server data loaders use a stateless Supabase client", () => {
  const client = read("../../src/lib/supabase/public.js");
  const office = read("../../src/lib/public-office-location.js");
  const editorial = read("../../src/lib/mavis/published-editorial.js");
  const officeApi = read("../../src/app/api/office-location/route.js");
  const homepage = read("../../src/app/page.js");

  assert.ok(client.includes('from "@supabase/supabase-js"'));
  assert.ok(client.includes("autoRefreshToken: false"));
  assert.ok(client.includes("persistSession: false"));
  assert.ok(client.includes("detectSessionInUrl: false"));

  assert.ok(office.includes("createPublicClient()"));
  assert.ok(office.includes('.eq("is_location_public", true)'));
  assert.ok(office.includes('.select(PUBLIC_OFFICE_LOCATION_COLUMNS)'));
  assert.ok(office.includes('PUBLIC_OFFICE_LOCATION_COLUMNS =\n  "office_name,address,city,province,latitude,longitude,map_url,is_location_public"'));
  assert.ok(office.includes('STRUCTURED_DATA_OFFICE_LOCATION_COLUMNS =\n  "office_name,address,city,province,latitude,longitude,map_url,phone,is_location_public"'));
  assert.ok(office.includes("export async function getPublicOfficeLocation()"));
  assert.ok(office.includes("export async function getOfficeLocationForStructuredData()"));
  assert.ok(!office.includes("supabase/server"));

  assert.ok(officeApi.includes("getPublicOfficeLocation()"));
  assert.ok(!officeApi.includes("getOfficeLocationForStructuredData"));
  assert.ok(homepage.includes("getOfficeLocationForStructuredData()"));
  assert.ok(homepage.includes("initialLocation={officeLocationForDisplay}"));
  assert.ok(homepage.includes("const officeLocationForDisplay = normalizedOfficeLocation"));
  assert.ok(homepage.includes("is_location_public: normalizedOfficeLocation.is_location_public"));

  assert.ok(editorial.includes("createPublicClient()"));
  assert.ok(editorial.includes("get_mavis_published_articles"));
  assert.ok(!editorial.includes("supabase/server"));
});
