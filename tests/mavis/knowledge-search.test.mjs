import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLegalSearchText,
  searchLegalRecords,
} from "../../src/lib/mavis/knowledge-search.mjs";

const records = [
  {
    id: "term_cheque",
    canonical: "چک",
    search_title: "چک چیست",
    aliases: ["سفته بانکی"],
    search_phrases: ["وصول چک برگشتی"],
    definition: "سند تجاری با مقررات خاص",
    review_status: "needs_legal_review",
  },
  {
    id: "term_title_deed",
    canonical: "سند مالکیت",
    search_title: "سند مالکیت ملک",
    aliases: ["سند تک برگ"],
    search_phrases: ["استعلام وضعیت سند مالکیت ملک"],
    definition: "سند صادرشده از مرجع ثبتی",
    review_status: "needs_legal_review",
  },
  {
    id: "law_civil_code",
    title: "قانون مدنی",
    review_status: "secondary_source_only",
  },
];

test("normalizes Persian and Arabic character variants and digits", () => {
  assert.equal(normalizeLegalSearchText("ي ك ۱۲۳"), "ی ک 123");
  assert.equal(normalizeLegalSearchText("سند\u200cمالکیت"), "سند مالکیت");
  assert.equal(normalizeLegalSearchText("مُعامله"), "معامله");
});

test("ranks exact canonical titles before broader matches", () => {
  const results = searchLegalRecords({ query: "سند مالکیت", records });
  assert.equal(results[0].id, "term_title_deed");
  assert.equal(results[0].search_score, 1000);
  assert.equal(results[0].matched_field, "title");
});

test("matches aliases without inventing legal conclusions", () => {
  const results = searchLegalRecords({ query: "سند تک برگ", records });
  assert.equal(results[0].id, "term_title_deed");
  assert.equal(results[0].matched_field, "alias");
  assert.equal(results[0].review_status, "needs_legal_review");
});

test("matches curated search phrases", () => {
  const results = searchLegalRecords({ query: "وصول چک برگشتی", records });
  assert.equal(results[0].id, "term_cheque");
  assert.equal(results[0].matched_field, "search_phrase");
});

test("matches public definitions and summaries at a lower rank", () => {
  const results = searchLegalRecords({ query: "مقررات خاص", records });
  assert.equal(results[0].id, "term_cheque");
  assert.equal(results[0].matched_field, "body");
});

test("preserves review status and source metadata from records", () => {
  const results = searchLegalRecords({ query: "قانون مدنی", records });
  assert.equal(results[0].review_status, "secondary_source_only");
});

test("returns an empty list for blank, too-short, or oversized queries", () => {
  assert.deepEqual(searchLegalRecords({ query: " ", records }), []);
  assert.deepEqual(searchLegalRecords({ query: "چ", records }), []);
  assert.deepEqual(searchLegalRecords({ query: "الف".repeat(121), records }), []);
});

test("returns an empty list for invalid record collections", () => {
  assert.deepEqual(searchLegalRecords({ query: "سند", records: null }), []);
});

test("clamps result count and removes duplicate record identifiers", () => {
  const duplicateRecords = [...records, records[1]];
  const results = searchLegalRecords({ query: "سند", records: duplicateRecords, limit: 100 });
  assert.ok(results.length <= 20);
  assert.equal(results.filter((record) => record.id === "term_title_deed").length, 1);
});

test("keeps stable input order when scores are equal", () => {
  const equalRecords = [
    { id: "a", title: "اختلاف ملکی" },
    { id: "b", title: "اختلاف ملکی" },
  ];
  const results = searchLegalRecords({ query: "اختلاف ملکی", records: equalRecords });
  assert.deepEqual(results.map((record) => record.id), ["a", "b"]);
});


import { readFileSync } from "node:fs";

const readDataset = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const termsDataset = readDataset("../../src/data/legal-library/terms/terms.json");
const lawsDataset = readDataset("../../src/data/legal-library/laws/laws.json");
const articlesDataset = readDataset("../../src/data/legal-library/articles/articles.json");

const actualLibraryRecords = [
  ...termsDataset.records.map((record) => ({
    ...record,
    title: record.search_title || record.canonical,
    record_type: "term",
  })),
  ...lawsDataset.records.map((record) => ({
    ...record,
    title: record.title,
    record_type: "law",
  })),
  ...articlesDataset.records.map((record) => ({
    ...record,
    title: record.title,
    record_type: "article",
  })),
].filter((record) => record.review_status !== "draft");

test("indexes the existing legal library inventory without a parallel corpus", () => {
  assert.equal(termsDataset.records.length, 132);
  assert.equal(lawsDataset.records.length, 16);
  assert.equal(articlesDataset.records.length, 22);
  assert.equal(termsDataset.records.length + lawsDataset.records.length + articlesDataset.records.length, 170);
  assert.ok(actualLibraryRecords.length > 0 && actualLibraryRecords.length <= 170);
});

test("retrieves actual library records and retains legal review status", () => {
  const results = searchLegalRecords({
    query: "سند مالکیت",
    records: actualLibraryRecords,
  });
  assert.equal(results[0].record_type, "term");
  assert.equal(results[0].canonical, "سند مالکیت");
  assert.equal(results[0].review_status, "needs_legal_review");
});

test("does not expose draft records through the first-stage retrieval fixture", () => {
  const draft = {
    id: "term_test_draft",
    canonical: "موضوع محرمانه آزمایشی",
    review_status: "draft",
  };
  const visibleRecords = [...actualLibraryRecords, draft]
    .filter((record) => record.review_status !== "draft");
  const results = searchLegalRecords({
    query: "موضوع محرمانه آزمایشی",
    records: visibleRecords,
  });
  assert.deepEqual(results, []);
});


import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../src/lib/mavis/request-guards.mjs";

test("accepts JSON media type with optional parameters only", () => {
  assert.equal(isJsonContentType("application/json"), true);
  assert.equal(isJsonContentType("Application/JSON; charset=utf-8"), true);
  assert.equal(isJsonContentType("application/jsonp"), false);
  assert.equal(isJsonContentType("text/json"), false);
  assert.equal(isJsonContentType(null), false);
});

test("requires an exact HTTP(S) same-origin match", () => {
  assert.equal(matchesRequestOrigin("https://example.com", "https://example.com/api"), true);
  assert.equal(matchesRequestOrigin("https://example.com:443", "https://example.com/api"), false);
  assert.equal(matchesRequestOrigin("https://evil.example", "https://example.com/api"), false);
  assert.equal(matchesRequestOrigin("null", "https://example.com/api"), false);
  assert.equal(matchesRequestOrigin("https://example.com/path", "https://example.com/api"), false);
  assert.equal(matchesRequestOrigin(undefined, "https://example.com/api"), false);
});

test("allows only safe same-site relative result paths", async () => {
  const { safeInternalPath } = await import("../../src/lib/mavis/request-guards.mjs");
  assert.equal(safeInternalPath("/legal-library/terms"), "/legal-library/terms");
  assert.equal(safeInternalPath("/legal-library?q=deed#results"), "/legal-library?q=deed#results");
  assert.equal(safeInternalPath("//evil.example/path"), null);
  assert.equal(safeInternalPath("https://evil.example/path"), null);
  assert.equal(safeInternalPath("/\\evil.example"), null);
  assert.equal(safeInternalPath("javascript:alert(1)"), null);
  assert.equal(safeInternalPath(null), null);
});

const goldenSet = readDataset("./knowledge-search-golden.json");

test("passes the curated legal-library top-1 retrieval smoke set", () => {
  const outcomes = goldenSet.cases.map((item) => {
    const result = searchLegalRecords({
      query: item.query,
      records: actualLibraryRecords,
      limit: 10,
    });
    return {
      query: item.query,
      expected: item.expected_id,
      actual: result[0]?.id || null,
    };
  });

  assert.deepEqual(
    outcomes.filter((item) => item.actual !== item.expected),
    [],
    JSON.stringify(outcomes, null, 2),
  );
});

import { parseKnowledgeSearchRateLimit } from "../../src/lib/mavis/rate-limit.mjs";

test("accepts only a single valid database rate-limit decision", () => {
  assert.deepEqual(
    parseKnowledgeSearchRateLimit({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null }),
    { status: "allowed" },
  );
  assert.deepEqual(
    parseKnowledgeSearchRateLimit({ data: [{ allowed: false, retry_after_seconds: 17 }], error: null }),
    { status: "limited", retryAfterSeconds: 17 },
  );
  assert.deepEqual(parseKnowledgeSearchRateLimit({ data: null, error: new Error("db down") }), { status: "unavailable" });
  assert.deepEqual(parseKnowledgeSearchRateLimit({ data: [], error: null }), { status: "unavailable" });
  assert.deepEqual(parseKnowledgeSearchRateLimit({ data: [{ allowed: false, retry_after_seconds: 999 }], error: null }), { status: "unavailable" });
  assert.deepEqual(parseKnowledgeSearchRateLimit({ data: [{ allowed: "false", retry_after_seconds: 10 }], error: null }), { status: "unavailable" });
});
