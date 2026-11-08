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
