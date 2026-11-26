import test from "node:test";
import assert from "node:assert/strict";
import { getArticleSearchMetadata } from "../../src/lib/mavis/article-search-metadata.mjs";

test("uses the reviewed short metadata for the long criminal-property article", () => {
  const result = getArticleSearchMetadata({
    slug: "criminal-court-authority-restitution-real-estate-third-party-deed-annulment",
    title: "A deliberately long article title",
    seoTitle: "A deliberately long SEO title",
    seoDescription: "A deliberately long SEO description",
    excerpt: "Fallback excerpt",
  });

  assert.equal(
    result.title,
    "رد مال غیرمنقول به ثالث؛ اختیار دادگاه کیفری",
  );
  assert.equal(
    result.description,
    "بررسی اختلاف رویه درباره رد مال غیرمنقول منتقل‌شده به ثالث با سند رسمی و حدود اختیار دادگاه کیفری در رسیدگی به ابطال سند.",
  );
});

test("preserves existing CMS SEO metadata for all other articles", () => {
  const result = getArticleSearchMetadata({
    slug: "another-article",
    title: "Visible article title",
    metaTitle: "Legacy metadata title",
    seoTitle: "CMS SEO title",
    seoDescription: "CMS SEO description",
    excerpt: "Fallback excerpt",
  });

  assert.deepEqual(result, {
    title: "CMS SEO title",
    description: "CMS SEO description",
  });
});

test("falls back to legacy title and excerpt when CMS SEO fields are absent", () => {
  const result = getArticleSearchMetadata({
    slug: "legacy-article",
    title: "Legacy article title",
    excerpt: "Legacy article excerpt",
  });

  assert.deepEqual(result, {
    title: "Legacy article title",
    description: "Legacy article excerpt",
  });
});

test("uses the article introduction when an excerpt is absent", () => {
  const result = getArticleSearchMetadata({
    slug: "article-without-excerpt",
    title: "عنوان مقاله",
    intro: "این مقدمه توضیح مشخصی درباره موضوع و مسیر حقوقی مقاله ارائه می‌کند.",
  });

  assert.equal(
    result.description,
    "این مقدمه توضیح مشخصی درباره موضوع و مسیر حقوقی مقاله ارائه می‌کند.",
  );
});

test("blank CMS SEO fields fall back to the article's editorial metadata", () => {
  const result = getArticleSearchMetadata({
    slug: "cms-article",
    seoTitle: "   ",
    metaTitle: "عنوان جایگزین",
    seoDescription: "  ",
    excerpt: "خلاصه قابل استفاده برای توضیحات موتور جست‌وجو.",
    intro: "مقدمه مقاله",
  });

  assert.deepEqual(result, {
    title: "عنوان جایگزین",
    description: "خلاصه قابل استفاده برای توضیحات موتور جست‌وجو.",
  });
});

test("all static public articles have non-empty search metadata", async () => {
  const { articles } = await import("../../src/data/articles.js");
  assert.equal(articles.length, 11);

  for (const article of articles) {
    const result = getArticleSearchMetadata(article);
    assert.ok(result.title.trim(), article.slug + " title");
    assert.ok(result.description.trim(), article.slug + " description");
  }
});

test("returns safe non-empty defaults for invalid input", () => {
  assert.deepEqual(getArticleSearchMetadata(null), {
    title: "مقاله حقوقی",
    description: "راهنمای حقوقی بر پایه قوانین ایران.",
  });
});
