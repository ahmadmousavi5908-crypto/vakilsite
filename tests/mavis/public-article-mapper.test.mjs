import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateMavisArticleReadTime,
  mapPublishedMavisArticle,
  mapPublishedMavisArticleSummary,
} from "../../src/lib/mavis/public-article-mapper.mjs";

const row = {
  id: "4a0d8f64-5b2a-4f2a-8a10-4a1d0d7b6f90",
  slug: "published-legal-guide",
  title: "راهنمای حقوقی منتشرشده",
  author_name: "سید احمد موسوی",
  excerpt: "خلاصه‌ای روشن از موضوع حقوقی و نکات مهم آن.",
  category: "حقوق مدنی",
  seo_title: "عنوان سئو",
  seo_description: "توضیحات سئو",
  content: {
    intro: "مقدمه مقاله",
    sections: [{ heading: "بخش نخست", body: "متن بخش نخست" }],
    checklist: ["مدرک اول"],
    warning: "توضیح مهم",
  },
  published_at: "2026-11-14T12:30:00Z",
  updated_at: "2026-11-14T12:35:00Z",
};

test("maps only the public editorial fields", () => {
  const article = mapPublishedMavisArticle(row, [
    { title: "منبع رسمی", url: "https://example.org/law", sourceType: "official_law" },
    { title: "Unsafe", url: "javascript:alert(1)" },
  ]);
  assert.equal(article.slug, row.slug);
  assert.equal(article.author, row.author_name);
  assert.equal(article.metaTitle, row.seo_title);
  assert.equal(article.sections[0].heading, "بخش نخست");
  assert.equal(article.sources.length, 1);
  assert.equal(article.sources[0].url, "https://example.org/law");
});

test("estimates reading time and rejects malformed records", () => {
  assert.equal(estimateMavisArticleReadTime({ title: "عنوان" }), 1);
  assert.equal(mapPublishedMavisArticle(null), null);
  assert.equal(mapPublishedMavisArticle({ slug: "missing-title" }), null);
});


test("maps a lightweight public article summary without requiring full content", () => {
  const summary = mapPublishedMavisArticleSummary({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    content: row.content,
  });
  assert.deepEqual(summary, {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
  });
  assert.equal(mapPublishedMavisArticleSummary({ slug: "missing-title" }), null);
});
