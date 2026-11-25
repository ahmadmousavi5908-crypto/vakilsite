import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public server data loaders use a stateless Supabase client", () => {
  const client = read("../../src/lib/supabase/public.js");
  const office = read("../../src/lib/public-office-location.js");
  const editorial = read("../../src/lib/mavis/published-editorial.js");

  assert.match(client, /from "@supabase\\/supabase-js"/);
  assert.match(client, /autoRefreshToken: false/);
  assert.match(client, /persistSession: false/);
  assert.match(client, /detectSessionInUrl: false/);

  assert.match(office, /createPublicClient\\(\\)/);
  assert.match(office, /is_location_public", true/);
  assert.match(
    office,
    /\\.select\\("office_name,address,city,province,latitude,longitude,map_url,phone,is_location_public"\\)/,
  );
  assert.doesNotMatch(office, /supabase\\/server/);

  assert.match(editorial, /createPublicClient\\(\\)/);
  assert.match(editorial, /get_mavis_published_articles/);
  assert.doesNotMatch(editorial, /supabase\\/server/);
});
