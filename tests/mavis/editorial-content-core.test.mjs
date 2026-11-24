import test from "node:test";
import assert from "node:assert/strict";
import {
  formatEditorialBody,
  formatEditorialSources,
  mapPublishedEditorialRecord,
  parseEditorialBody,
  parseEditorialSources,
  serializeEditorialCsv,
  validateEditorialSlug,
} from "../../src/lib/mavis/editorial-content-core.mjs";

test("editorial body round-trips headings and paragraph content", () => {
  const markdown = "## مسئولیت مدنی\n\nمتن بخش اول.\n\n## شرایط تحقق\nمتن بخش دوم.";
  const sections = parseEditorialBody(markdown);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, "مسئولیت مدنی");
  assert.match(formatEditorialBody(sections), /شرایط تحقق/);
});

test("source parser accepts only labelled HTTPS URLs", () => {
  const sources = parseEditorialSources([
    "روزنامه رسمی | https://rrk.ir/law/123",
    "نشانی ناامن | http://example.com",
    "بدون جداکننده",
    "منبع دارای اعتبارنامه | https://user:pass@qavanin.ir",
  ].join("\n"));
  assert.equal(sources.length, 1);
  assert.equal(sources[0].label, "روزنامه رسمی");
  assert.match(formatEditorialSources(sources), /https:\/\/rrk\.ir/);
});

test("slugs follow the public URL contract", () => {
  assert.equal(validateEditorialSlug("civil-liability"), true);
  assert.equal(validateEditorialSlug("قانون-مدنی"), false);
  assert.equal(validateEditorialSlug("-bad"), false);
  assert.equal(validateEditorialSlug("bad--slug"), false);
});

test("only published snapshots are exposed to public pages", () => {
  const published = mapPublishedEditorialRecord({
    status: "published",
    slug: "civil-liability",
    published_content: { title: "مسئولیت مدنی", sections: [] },
    is_indexable: true,
    published_at: "2026-11-16T10:00:00.000Z",
    updated_at: "2026-11-16T10:00:00.000Z",
  });
  const draft = mapPublishedEditorialRecord({
    status: "draft",
    slug: "draft-only",
    published_content: null,
  });
  assert.equal(published.title, "مسئولیت مدنی");
  assert.equal(published.isIndexable, true);
  assert.equal(draft, null);
});

test("maps independent SEO keywords and source provenance from published snapshots", () => {
  const article = mapPublishedEditorialRecord({
    status: "published",
    slug: "seo-and-source-metadata",
    published_content: {
      title: "مقاله دارای کلیدواژه و منبع",
      seo_title: "عنوان سئوی مستقل",
      seo_description: "توضیح سئوی مستقل",
      focus_keyword: "پابند الکترونیکی قبل از زندان",
      related_keywords: ["نظارت الکترونیکی", "رأی وحدت رویه ۸۷۴"],
      tags: ["حقوق کیفری", "اجرای احکام"],
      content: {
        intro: "مقدمه مقاله برای آزمون",
        sections: [{ heading: "بخش", body: "متن کافی برای آزمون این بخش" }],
        sources: [{
          id: "source-1",
          label: "رأی وحدت رویه شماره ۸۷۴",
          title: "رأی وحدت رویه شماره ۸۷۴",
          url: "https://example.com/legal/874",
          source_type: "judiciary",
          publisher: "هیأت عمومی دیوان عالی کشور",
          published_on: "2026-01-01",
          metadata: { document_number: "۸۷۴", document_type: "رأی وحدت رویه" },
        }],
      },
    },
    is_indexable: true,
    published_at: "2026-11-24T10:00:00.000Z",
    updated_at: "2026-11-24T10:00:00.000Z",
  });

  assert.equal(article.seoTitle, "عنوان سئوی مستقل");
  assert.equal(article.seoDescription, "توضیح سئوی مستقل");
  assert.equal(article.focusKeyword, "پابند الکترونیکی قبل از زندان");
  assert.deepEqual(article.relatedKeywords, ["نظارت الکترونیکی", "رأی وحدت رویه ۸۷۴"]);
  assert.deepEqual(article.tags, ["حقوق کیفری", "اجرای احکام"]);
  assert.equal(article.sources[0].publisher, "هیأت عمومی دیوان عالی کشور");
  assert.equal(article.sources[0].metadata.document_number, "۸۷۴");
});

test("CSV export neutralizes spreadsheet formula prefixes", () => {
  const csv = serializeEditorialCsv([["title"], ["=HYPERLINK(\"https://bad.example\")"]]);
  assert.match(csv, /'=HYPERLINK/);
});

test("maps unified CMS snapshots into the public article page shape", () => {
  const article = mapPublishedEditorialRecord({
    status: "published",
    slug: "production-article",
    published_content: {
      status: "draft",
      title: "مقاله آزمایشی",
      excerpt: "خلاصه مقاله",
      content: {
        intro: "مقدمه مقاله",
        sections: [{ heading: "بخش نخست", body: "متن بخش نخست" }],
        checklist: ["مدرک نخست"],
        warning: "توضیح احتیاطی",
        sources: [{ label: "روزنامه رسمی", url: "https://rrk.ir/law/1" }],
      },
    },
    is_indexable: true,
    published_at: "2026-11-18T10:00:00.000Z",
    updated_at: "2026-11-18T10:00:00.000Z",
  });

  assert.equal(article.status, "published");
  assert.equal(article.intro, "مقدمه مقاله");
  assert.equal(article.sections[0].heading, "بخش نخست");
  assert.deepEqual(article.checklist, ["مدرک نخست"]);
  assert.equal(article.sources[0].label, "روزنامه رسمی");
  assert.equal(article.warning, "توضیح احتیاطی");
  assert.match(article.readTime, /دقیقه$/);
});

test("maps versioned article image metadata to public image fields", () => {
  const prefix = "https://srbwniqhaxwaoepjfizf.supabase.co/storage/v1/object/public/mavis-article-images/550e8400-e29b-41d4-a716-446655440000/b3a1f9d0-2c64-4d17-9f2f-1a2b3c4d5e6f/";
  const article = mapPublishedEditorialRecord({
    status: "published",
    slug: "article-with-image",
    published_content: {
      title: "مقاله دارای تصویر",
      content: {
        intro: "مقدمه کافی برای آزمون مقاله تصویردار",
        sections: [{ heading: "بخش نخست", body: "متن نمونه این بخش برای آزمون است." }],
        image: {
          url: prefix + "wide.webp",
          ogUrl: prefix + "og.webp",
          variants: {
            small: prefix + "small.webp",
            medium: prefix + "medium.webp",
            wide: prefix + "wide.webp",
            landscape: prefix + "landscape.webp",
            square: prefix + "square.webp",
          },
          alt: "تصویر شاخص مقاله حقوقی",
          title: "راهنمای حقوقی",
          caption: "زیرنویس تصویر",
          width: 1600,
          height: 900,
          mimeType: "image/webp",
          showInArticle: true,
          useForSeo: true,
        },
      },
    },
    is_indexable: true,
    published_at: "2026-11-24T10:00:00.000Z",
    updated_at: "2026-11-24T10:00:00.000Z",
  });

  assert.equal(article.coverImageUrl, prefix + "wide.webp");
  assert.equal(article.coverImageAlt, "تصویر شاخص مقاله حقوقی");
  assert.equal(article.coverImageUseForSeo, true);
  assert.equal(article.coverImageVariants.square, prefix + "square.webp");
});

test("does not expose a disabled cover image to public pages or SEO", () => {
  const article = mapPublishedEditorialRecord({
    status: "published",
    slug: "hidden-cover-image",
    published_content: {
      title: "مقاله بدون تصویر عمومی",
      content: {
        intro: "مقدمه کافی برای آزمون مقاله",
        sections: [{ heading: "بخش نخست", body: "متن نمونه این بخش برای آزمون است." }],
        image: {
          url: "https://srbwniqhaxwaoepjfizf.supabase.co/storage/v1/object/public/mavis-article-images/550e8400-e29b-41d4-a716-446655440000/b3a1f9d0-2c64-4d17-9f2f-1a2b3c4d5e6f/wide.webp",
          showInArticle: false,
          useForSeo: false,
        },
      },
    },
  });

  assert.equal(article.coverImageUrl, "");
  assert.equal(article.coverImageUseForSeo, false);
});
