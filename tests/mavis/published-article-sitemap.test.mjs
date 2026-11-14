import assert from "node:assert/strict";
import test from "node:test";
import { buildSitemapEntries } from "../../src/lib/sitemap.mjs";
import {
  getPublishedMavisArticleSitemapEntries,
  PublishedMavisSitemapCapacityError,
} from "../../src/lib/mavis/published-article-sitemap.mjs";

function createClient(pages, { error = null } = {}) {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        assert.equal(table, "mavis_articles");
        const query = {
          select(columns) {
            calls.push({ method: "select", columns });
            return query;
          },
          eq(column, value) {
            calls.push({ method: "eq", column, value });
            return query;
          },
          order(column, options) {
            calls.push({ method: "order", column, options });
            return query;
          },
          async range(from, to) {
            calls.push({ method: "range", from, to });
            if (error) return { data: null, error };
            return { data: pages.get(from) || [], error: null };
          },
        };
        return query;
      },
    },
  };
}

test("reads only published CMS article slugs in bounded ordered pages", async () => {
  const { client, calls } = createClient(new Map([
    [0, [
      { slug: "first-published-article", updated_at: "2026-11-14T10:00:00Z" },
      { slug: "second-published-article", updated_at: "2026-11-13T10:00:00Z" },
    ]],
    [2, [{ slug: "third-published-article", updated_at: "2026-11-12T10:00:00Z" }]],
  ]));

  const entries = await getPublishedMavisArticleSitemapEntries(client, {
    pageSize: 2,
    maxEntries: 10,
  });

  assert.deepEqual(entries.map((entry) => entry.path), [
    "/articles/first-published-article",
    "/articles/second-published-article",
    "/articles/third-published-article",
  ]);
  assert.equal(entries[0].lastModified, "2026-11-14T10:00:00Z");
  assert.deepEqual(calls.filter((call) => call.method === "eq"), [
    { method: "eq", column: "status", value: "published" },
    { method: "eq", column: "status", value: "published" },
  ]);
  assert.deepEqual(calls.filter((call) => call.method === "range"), [
    { method: "range", from: 0, to: 1 },
    { method: "range", from: 2, to: 3 },
  ]);
});

test("skips malformed slugs and omits invalid last-modified values", async () => {
  const { client } = createClient(new Map([
    [0, [
      { slug: "valid-article", updated_at: "not-a-date" },
      { slug: "../admin", updated_at: "2026-11-14T10:00:00Z" },
      { slug: "UPPERCASE", updated_at: "2026-11-14T10:00:00Z" },
    ]],
  ]));

  const entries = await getPublishedMavisArticleSitemapEntries(client, {
    pageSize: 5,
    maxEntries: 10,
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].path, "/articles/valid-article");
  assert.equal("lastModified" in entries[0], false);
});

test("fails explicitly when published article count exceeds sitemap capacity", async () => {
  const { client } = createClient(new Map([
    [0, [
      { slug: "first-article" },
      { slug: "second-article" },
    ]],
    [2, [{ slug: "overflow-article" }]],
  ]));

  await assert.rejects(
    getPublishedMavisArticleSitemapEntries(client, { pageSize: 2, maxEntries: 2 }),
    PublishedMavisSitemapCapacityError,
  );
});

test("fails closed on upstream read errors", async () => {
  const { client } = createClient(new Map(), { error: new Error("database unavailable") });

  await assert.rejects(
    getPublishedMavisArticleSitemapEntries(client, { pageSize: 2, maxEntries: 2 }),
    /Could not read published CMS article sitemap records/,
  );
});

test("rejects unbounded or invalid pagination settings", async () => {
  const { client } = createClient(new Map());
  await assert.rejects(
    getPublishedMavisArticleSitemapEntries(client, { pageSize: 1001 }),
    RangeError,
  );
  await assert.rejects(
    getPublishedMavisArticleSitemapEntries(client, { maxEntries: 50001 }),
    RangeError,
  );
});


test("builds sitemap entries with validated last-modified timestamps", () => {
  const entries = buildSitemapEntries([{
    path: "/articles/dated-article",
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: "2026-11-14T10:00:00Z",
  }], "https://example.org");
  assert.equal(entries[0].lastModified.toISOString(), "2026-11-14T10:00:00.000Z");
  assert.throws(() => buildSitemapEntries([{
    path: "/articles/invalid-date",
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: "not-a-date",
  }], "https://example.org"), /Invalid sitemap lastModified/);
});
