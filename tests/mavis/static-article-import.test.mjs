import assert from "node:assert/strict";
import test from "node:test";
import { buildMavisStaticArticleImport } from "../../src/lib/mavis/static-article-import.mjs";

const article = {
  slug: "civil-claim-checklist",
  title: "پیش از طرح دعوای حقوقی چه چیزهایی آماده کنیم؟",
  metaTitle: "چک‌لیست دعوای حقوقی",
  excerpt: "چک‌لیستی کاربردی برای آماده‌سازی پیش از طرح دعوای حقوقی.",
  category: "آیین دادرسی مدنی",
  intro: "پیش از طرح دعوا باید خواسته، طرف دعوا و مدارک مرتبط را روشن کنید.",
  sections: [
    { heading: "تعیین خواسته", body: "خواسته را روشن، دقیق و متناسب با اسناد موجود مشخص کنید." },
  ],
  checklist: ["مرتب‌سازی اسناد", "بررسی مهلت‌ها"],
  warning: "این متن راهنمای عمومی است و جایگزین بررسی پرونده نیست.",
  sources: [
    { label: "منبع رسمی", url: "https://example.gov.ir/law" },
    { label: "پیوند ناامن", url: "http://example.com/article" },
    { label: "نشانی نامعتبر", url: "javascript:alert(1)" },
  ],
};

test("maps a published static article to an unpublished versioned draft payload", () => {
  const result = buildMavisStaticArticleImport(article);
  assert.equal(result.payload.slug, article.slug);
  assert.equal(result.payload.title, article.title);
  assert.equal(result.payload.seo_title, article.metaTitle);
  assert.deepEqual(result.payload.content.sections, article.sections);
  assert.deepEqual(result.payload.content.checklist, article.checklist);
  assert.equal(result.payload.content.warning, article.warning);
  assert.equal(result.payload.content_schema_version, 1);
  assert.equal(result.sources.length, 1);
  assert.equal(result.skippedSources, 2);
  assert.equal(result.sources[0].relationType, "research_background");
  assert.equal(result.sources[0].sourceType, "manual");
});

test("uses safe SEO fallbacks and keeps unknown source rights unclassified", () => {
  const result = buildMavisStaticArticleImport({ ...article, metaTitle: "", metaDescription: "" });
  assert.equal(result.payload.seo_title, article.title);
  assert.equal(result.payload.seo_description, article.excerpt);
  assert.equal("author_name" in result.payload, false);
  assert.equal("rightsStatus" in result.sources[0], false);
});

test("rejects malformed static article structures instead of truncating content", () => {
  assert.throws(() => buildMavisStaticArticleImport(null), /invalid/i);
  assert.throws(() => buildMavisStaticArticleImport({ ...article, slug: "نامک فارسی" }), /slug/i);
  assert.throws(() => buildMavisStaticArticleImport({
    ...article,
    sections: [{ heading: "بخش", body: "کوتاه" }],
  }), /sections/i);
});
