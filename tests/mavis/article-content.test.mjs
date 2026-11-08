import test from "node:test";
import assert from "node:assert/strict";
import { mapArticleRowToPublicArticle, mapStaticArticleToRow, validateArticleDraft } from "../../src/lib/mavis/article-content.mjs";

const article = {
  slug: "sample-article",
  title: "راهنمای نمونه حقوقی",
  excerpt: "این خلاصه نمونه برای آزمون انتقال داده مقاله به مخزن پایدار نوشته شده است.",
  category: "حقوق مدنی",
  readTime: 6,
  intro: "مقدمه مقاله",
  sections: [{ heading: "بخش اول", body: "متن بخش اول" }],
  checklist: ["مدرک اول"],
  warning: "این متن جایگزین مشاوره حقوقی نیست.",
  sources: [{ label: "منبع رسمی", url: "https://example.org/law" }, { label: "پیوند ناامن", url: "javascript:alert(1)" }],
};

test("maps legacy static article fields into a versioned database row without unsafe source URLs", () => {
  const row = mapStaticArticleToRow(article, "2026-11-08T12:00:00.000Z");
  assert.equal(row.status, "published");
  assert.equal(row.source_origin, "legacy_static_import");
  assert.equal(row.content.sources.length, 1);
  assert.equal(row.content.sources[0].url, "https://example.org/law");
});

test("maps only published and structurally valid database rows to public article objects", () => {
  const row = mapStaticArticleToRow(article);
  const publicArticle = mapArticleRowToPublicArticle({ ...row, version: 3 });
  assert.equal(publicArticle.slug, article.slug);
  assert.equal(publicArticle.readTime, 6);
  assert.equal(publicArticle.version, 3);
  assert.equal(mapArticleRowToPublicArticle({ ...row, status: "draft" }), null);
  assert.equal(mapArticleRowToPublicArticle({ ...row, content: {} }), null);
});

test("validates article drafts and rejects unsafe or malformed content", () => {
  const row = mapStaticArticleToRow(article);
  const payload = {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    read_time: row.read_time,
    content: row.content,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
  };
  assert.equal(validateArticleDraft(payload).ok, true);
  assert.equal(validateArticleDraft({ ...payload, slug: "../bad" }).ok, false);
  assert.equal(validateArticleDraft({ ...payload, content: { ...payload.content, sources: [{ label: "bad", url: "javascript:alert(1)" }] } }).ok, false);
});
