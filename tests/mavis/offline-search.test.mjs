import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const knowledge = JSON.parse(await readFile(new URL("../../public/mavis-offline/knowledge.json", import.meta.url), "utf8"));

test("offline bundle counts match the actual corpus", () => {
  const counts = Object.fromEntries(["term", "law", "article", "faq", "research_note"].map((type) => [
    type === "term" ? "terms" : type === "law" ? "laws" : type === "article" ? "articles" : type === "faq" ? "faqs" : "research_notes",
    knowledge.records.filter((record) => record.record_type === type).length,
  ]));
  assert.deepEqual(counts, {
    terms: knowledge.counts.terms,
    laws: knowledge.counts.laws,
    articles: knowledge.counts.articles,
    faqs: knowledge.counts.faqs,
    research_notes: knowledge.counts.research_notes,
  });
});

test("real corpus resolves common client wording to the intended record", () => {
  assert.equal(rankOfflineRecords("چک برگشتی", knowledge.records)[0].id, "term_cheque_bounce");
  assert.equal(rankOfflineRecords("قولنامه", knowledge.records)[0].id, "term_ordinary_document");
  assert.equal(rankOfflineRecords("فیشینگ", knowledge.records)[0].id, "term_computer_fraud");
});

test("offline bundle includes ranked primary and secondary legal research sources", () => {
  assert.ok(knowledge.source_registry.length >= 16);
  const primary = knowledge.source_registry.filter((source) => source.class === "primary_publication" || source.class === "official_law_portal");
  assert.ok(primary.some((source) => source.url === "https://www.rrk.ir/"));
  assert.ok(primary.some((source) => source.url === "https://qavanin.ir/"));
  assert.ok(knowledge.source_registry.every((source) => typeof source.live_access_checked === "boolean"));
  const reachable = knowledge.source_registry.find((source) => source.id === "src_national_judicial_decisions");
  assert.equal(reachable.live_access_checked, true);
  assert.equal(reachable.access_check.scope, "landing_page_only");
});

test("legal records carry conservative provenance and never imply verified current law", () => {
  for (const record of knowledge.records.filter((item) => ["term", "law", "article", "research_note"].includes(item.record_type))) {
    assert.equal(record.provenance?.exact_primary_document_verified, false, record.id);
    assert.equal(record.provenance?.current_validity_verified, false, record.id);
  }
  assert.equal(knowledge.records.filter((record) => record.review_status === "verified_primary_source").length, 0);
});

test("official judiciary sources distinguish landing-page reachability from legal verification", () => {
  const gateway = knowledge.source_registry.find((source) => source.id === "src_official_judiciary_gateway");
  const decisions = knowledge.source_registry.find((source) => source.id === "src_national_judicial_decisions");
  assert.equal(gateway.url, "https://eadl.ir/");
  assert.equal(decisions.url, "https://ara.jri.ac.ir/");
  assert.equal(gateway.live_access_checked, false);
  assert.equal(decisions.live_access_checked, true);
  assert.equal(decisions.access_check.result, "reachable");
  assert.equal(decisions.access_check.scope, "landing_page_only");
  assert.equal(knowledge.records.filter((record) => record.review_status === "verified_primary_source").length, 0);
});

test("record-level citations identify secondary and not-yet-retrieved official links honestly", () => {
  const compulsory = knowledge.records.find((record) => record.id === "law_compulsory_real_estate_registration");
  assert.ok(compulsory.sources.some((source) => source.verification_status === "official_url_identified_not_retrieved"));
  assert.ok(compulsory.sources.some((source) => source.verification_status === "secondary_source_only"));
});

test("real corpus retrieves the new research notes using client-style wording", () => {
  assert.ok(rankOfflineRecords("سامانه ثبت ادعا", knowledge.records).some((record) => record.id === "research_note_real_estate_registration_claims"));
  assert.ok(rankOfflineRecords("واخواست سفته", knowledge.records).some((record) => record.id === "research_note_promissory_note"));
  assert.ok(rankOfflineRecords("چک صیادی", knowledge.records).some((record) => record.id === "research_note_cheque_amendments"));
});

test("research notes retain secondary-only status and conservative provenance", () => {
  const notes = knowledge.records.filter((record) => record.record_type === "research_note");
  assert.equal(notes.length, 5);
  assert.ok(notes.every((record) => record.review_status === "secondary_source_only"));
  assert.ok(notes.every((record) => record.provenance.current_validity_verified === false));
  assert.ok(notes.every((record) => record.sources.length > 0));
});


import { buildOfflineAnswer } from "../../public/mavis-offline/answer.mjs";
const publishedBundle = JSON.parse(await readFile(new URL("../../public/mavis-offline/published-articles.json", import.meta.url), "utf8"));

test("offline published article bundle matches its canonical generated collection", () => {
  assert.ok(publishedBundle.records.length > 0);
  assert.equal(publishedBundle.counts.published_articles, publishedBundle.records.length);
  assert.ok(publishedBundle.records.every((record) => record.record_type === "published_article"));
  assert.ok(publishedBundle.records.every((record) => record.review_status === "secondary_source_only"));
  assert.ok(publishedBundle.records.every((record) => record.source_verified === false));
  assert.ok(publishedBundle.records.every((record) => record.provenance.current_validity_verified === false));
});

test("offline search retrieves published article text but labels it as secondary material", () => {
  const article = publishedBundle.records[0];
  const results = rankOfflineRecords(article.title, publishedBundle.records);
  assert.equal(results[0].id, article.id);
  const answer = buildOfflineAnswer(article.title, results);
  assert.equal(answer.reviewStatus, "secondary_source_only");
  assert.match(answer.sourceStatus, /منابع ثانویه/);
  assert.equal(answer.caution, article.warning);
});

test("offline published article citations remain HTTPS secondary references", () => {
  for (const record of publishedBundle.records) {
    for (const source of record.sources) {
      assert.match(source.url, /^https:\/\//);
      assert.equal(source.source_type, "secondary");
      assert.equal(source.verification_status, "secondary_source_only");
    }
  }
});
