import assert from "node:assert/strict";
import test from "node:test";

import { queryMavisEditorialArticles } from "../../src/lib/mavis/editorial-table.mjs";

function createSupabase() {
  const calls = [];
  return {
    calls,
    from(tableName) {
      calls.push(tableName);
      return { tableName };
    },
  };
}

test("uses the canonical editorial table when it exists", async () => {
  const supabase = createSupabase();
  const result = await queryMavisEditorialArticles(supabase, async (table) => ({
    data: [{ id: "canonical-article" }],
    error: null,
    table: table.tableName,
  }));

  assert.deepEqual(supabase.calls, ["mavis_editorial_articles"]);
  assert.equal(result.table, "mavis_editorial_articles");
});

test("falls back to the legacy table only when the canonical relation is missing", async () => {
  const supabase = createSupabase();
  const result = await queryMavisEditorialArticles(supabase, async (table) => {
    if (table.tableName === "mavis_editorial_articles") {
      return { data: null, error: { code: "PGRST205", message: "Table not found in schema cache" } };
    }
    return { data: [{ id: "legacy-article" }], error: null, table: table.tableName };
  });

  assert.deepEqual(supabase.calls, ["mavis_editorial_articles", "mavis_articles"]);
  assert.equal(result.table, "mavis_articles");
  assert.equal(result.data[0].id, "legacy-article");
});

test("falls back when Postgres reports an undefined relation", async () => {
  const supabase = createSupabase();
  const result = await queryMavisEditorialArticles(supabase, async (table) => (
    table.tableName === "mavis_editorial_articles"
      ? { data: null, error: { code: "42P01", message: "relation does not exist" } }
      : { data: [{ id: "legacy-article" }], error: null, table: table.tableName }
  ));

  assert.equal(result.table, "mavis_articles");
  assert.deepEqual(supabase.calls, ["mavis_editorial_articles", "mavis_articles"]);
});

test("does not hide authorization or query errors behind a legacy fallback", async () => {
  const supabase = createSupabase();
  const error = { code: "42501", message: "permission denied" };
  const result = await queryMavisEditorialArticles(supabase, async () => ({
    data: null,
    error,
  }));

  assert.deepEqual(supabase.calls, ["mavis_editorial_articles"]);
  assert.equal(result.error, error);
});

test("does not fall back when the canonical query succeeds with no rows", async () => {
  const supabase = createSupabase();
  const result = await queryMavisEditorialArticles(supabase, async (table) => ({
    data: [],
    error: null,
    table: table.tableName,
  }));

  assert.deepEqual(supabase.calls, ["mavis_editorial_articles"]);
  assert.deepEqual(result.data, []);
});
