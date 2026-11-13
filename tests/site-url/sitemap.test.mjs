import test from "node:test";
import assert from "node:assert/strict";
import { buildSitemapEntries } from "../../src/lib/sitemap.mjs";

const origin = "https://example.ir";
const entry = (path) => ({
  path,
  changeFrequency: "monthly",
  priority: 0.5,
});

test("builds absolute canonical URLs", () => {
  assert.deepEqual(buildSitemapEntries([entry("/about")], origin), [{
    url: "https://example.ir/about",
    changeFrequency: "monthly",
    priority: 0.5,
  }]);
});

test("deduplicates equivalent URLs", () => {
  const result = buildSitemapEntries([entry("/about"), entry("/about")], origin);
  assert.equal(result.length, 1);
});

test("rejects external and protocol-relative paths", () => {
  for (const path of ["//evil.example/path", "/\\\\evil.example/path"]) {
    assert.throws(() => buildSitemapEntries([entry(path)], origin));
  }
});

test("rejects query strings, fragments, and control characters", () => {
  for (const path of ["/about?x=1", "/about#section", "/about\nadmin"]) {
    assert.throws(() => buildSitemapEntries([entry(path)], origin));
  }
});

test("rejects private admin and API routes", () => {
  for (const path of ["/admin", "/admin/users", "/api", "/api/private"]) {
    assert.throws(() => buildSitemapEntries([entry(path)], origin));
  }
});

test("rejects invalid priority and change frequency", () => {
  assert.throws(() => buildSitemapEntries([{ ...entry("/"), priority: 2 }], origin));
  assert.throws(() => buildSitemapEntries([{ ...entry("/"), changeFrequency: "sometimes" }], origin));
});

test("rejects empty and oversized sitemaps", () => {
  assert.throws(() => buildSitemapEntries([], origin), /no public URLs/);
  assert.throws(
    () => buildSitemapEntries(Array.from({ length: 50001 }, (_, i) => entry(`/p-${i}`)), origin),
    /50,000 URL limit/,
  );
});

test("requires a valid canonical HTTPS origin", () => {
  assert.throws(() => buildSitemapEntries([entry("/")], "http://example.ir"));
});
