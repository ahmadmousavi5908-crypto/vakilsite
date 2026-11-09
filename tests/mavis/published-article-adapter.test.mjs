import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishedArticleRecords } from "../../src/lib/mavis/published-article-adapter.mjs";
import { searchLegalRecords } from "../../src/lib/mavis/knowledge-search.mjs";
import { buildLegalEvidence } from "../../src/lib/mavis/legal-evidence.mjs";
import { buildLegalResearchDossier } from "../../src/lib/mavis/legal-research-dossier.mjs";

const article = {
  slug: "criminal-investigation-guide",
  title: "راهنمای تحقیقات مقدماتی",
  category: "حقوق کیفری",
  readTime: "۵ دقیقه",
  excerpt: "راهنمای عمومی برای آشنایی با تحقیقات مقدماتی.",
  intro: "در تحقیقات مقدماتی، حقوق اشخاص و تشریفات قانونی اهمیت دارد.",
  sections: [
    { heading: "حق همراه داشتن وکیل", body: "ماده ۱۹۰ قانون آیین دادرسی کیفری درباره حق همراه داشتن وکیل در تحقیقات مقدماتی است." },
  ],
  checklist: ["ابلاغیه را بررسی کنید"],
  warning: "این مطلب آموزشی است و جایگزین بررسی پرونده نیست.",
  sources: [
    { label: "منبع ثانویه معتبر", url: "https://example.org/legal-source" },
    { label: "URL نامعتبر", url: "javascript:alert(1)" },
    { label: "URL دارای اطلاعات ورود", url: "https://user:secret@example.org/private" },
  ],
};

test("adapts existing published articles as searchable secondary references", () => {
  const records = buildPublishedArticleRecords([article]);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, "published_article_criminal-investigation-guide");
  assert.equal(records[0].record_type, "published_article");
  assert.equal(records[0].review_status, "secondary_source_only");
  assert.equal(records[0].source_verified, false);
  assert.equal(records[0].source_class, "educational_summary");
  assert.equal(records[0].sources.length, 1);
  assert.equal(records[0].sources[0].source_type, "secondary");
  assert.match(records[0].definition, /ماده ۱۹۰/);
});

test("retrieves article body text through the existing deterministic search engine", () => {
  const records = buildPublishedArticleRecords([article]);
  const results = searchLegalRecords({ query: "ماده ۱۹۰ تحقیقات مقدماتی", records });
  assert.equal(results.length, 1);
  assert.equal(results[0].record_type, "published_article");
  assert.equal(results[0].path, "/articles/criminal-investigation-guide");
});

test("never upgrades a published article or its outbound links to primary evidence", () => {
  const [record] = buildPublishedArticleRecords([article]);
  const evidence = buildLegalEvidence(record);
  assert.equal(evidence.state, "secondary_reference");
  assert.equal(evidence.citations[0].sourceType, "secondary");
  assert.equal(evidence.citations[0].authorityVerified, false);

  const dossier = buildLegalResearchDossier({ topic: "تحقیقات مقدماتی", records: [record] });
  assert.equal(dossier.items[0].sourceVerified, false);
  assert.ok(dossier.items[0].missingFields.includes("exact_citation"));
  assert.equal(dossier.legalAnswer, null);
});

test("rejects malformed slugs, empty titles, and duplicate article identifiers", () => {
  const records = buildPublishedArticleRecords([
    article,
    { ...article, title: "عنوان تکراری" },
    { ...article, slug: "../unsafe" },
    { ...article, slug: "missing-title", title: " " },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].title, article.title);
});

test("returns an empty list for a non-array input", () => {
  assert.deepEqual(buildPublishedArticleRecords(null), []);
});


import { articles as publishedArticles } from "../../src/data/articles.js";

test("connects the real published site article collection without promoting legal authority", () => {
  const records = buildPublishedArticleRecords(publishedArticles);
  assert.equal(records.length, publishedArticles.length);
  assert.ok(records.length > 0);
  assert.ok(records.every((record) => record.review_status === "secondary_source_only"));
  assert.ok(records.every((record) => record.source_verified === false));

  const firstArticle = publishedArticles[0];
  const results = searchLegalRecords({ query: firstArticle.title, records });
  assert.equal(results[0].id, "published_article_" + firstArticle.slug);
  assert.equal(results[0].path, "/articles/" + firstArticle.slug);
});
