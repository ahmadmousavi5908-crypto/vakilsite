import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOfflineQuery, rankOfflineRecords } from "../../public/mavis-offline/search.mjs";

const records = [
  { id: "term_cheque_bounce", title: "گواهی عدم پرداخت چک", aliases: ["چک برگشتی", "گواهی برگشت چک"], search_phrases: ["چک برگشتی چگونه پیگیری می‌شود"], definition: "تعریف آزمایشی" },
  { id: "term_title_deed", title: "سند مالکیت", aliases: ["سند تک‌برگ"], search_phrases: ["گرفتن سند ملک"], definition: "تعریف آزمایشی" },
  { id: "law_civil_code", title: "قانون مدنی", aliases: [], search_phrases: [], definition: "قانون آزمایشی" },
];

test("normalizes Arabic letters, Persian and Arabic digits, diacritics and ZWNJ", () => {
  assert.equal(normalizeOfflineQuery("ي ك ۱۲۳ ١٢٣ نیم‌فاصله"), "ی ک 123 123 نیم فاصله");
});

test("finds colloquial search aliases and ranks exact aliases first", () => {
  const results = rankOfflineRecords("چک برگشتی", records);
  assert.equal(results[0].id, "term_cheque_bounce");
});

test("matches title queries with token order differences", () => {
  const results = rankOfflineRecords("مدنی قانون", records);
  assert.equal(results[0].id, "law_civil_code");
});

test("rejects short queries and caps result count", () => {
  assert.deepEqual(rankOfflineRecords("چ", records), []);
  const expanded = [...records, ...records.map((record) => ({ ...record, id: record.id + "_copy" }))];
  assert.equal(rankOfflineRecords("سند", expanded, 1).length, 1);
});

test("deduplicates repeated record IDs and preserves stable tie order", () => {
  const duplicate = [...records, records[0]];
  const results = rankOfflineRecords("چک برگشتی", duplicate);
  assert.equal(results.filter((record) => record.id === "term_cheque_bounce").length, 1);
});
