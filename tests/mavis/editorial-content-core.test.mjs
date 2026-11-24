import test from "node:test";
import assert from "node:assert/strict";
import {
  formatEditorialBody,
  formatEditorialSources,
  mapPublishedEditorialRecord,
  parseEditorialBody,
  parseEditorialList,
  parseEditorialSources,
  serializeEditorialCsv,
  validateArticleImageDimensions,
  validateEditorialSlug,
} from "../../src/lib/mavis/editorial-content-core.mjs";

test("editorial markdown preserves headings and paragraph boundaries", () => {
  const markdown = "## بخش اول\n\nپاراگراف یک\n\nپاراگراف دو\n\n## بخش دوم\nمتن دوم";
  const parsed = parseEditorialBody(markdown);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].heading, "بخش اول");
  assert.equal(parsed[0].body, "پاراگراف یک\n\nپاراگراف دو");
  assert.equal(parsed[1].heading, "بخش دوم");
  assert.equal(parsed[1].body, "متن دوم");
  assert.deepEqual(parseEditorialBody(formatEditorialBody(parsed)), parsed);
});

test("editorial sources accept only labelled HTTPS links", () => {
  const sources = parseEditorialSources(
    "روزنامه رسمی | https://rrk.ir/\nمنبع ناامن | http://example.com\nبدون عنوان"
  );
  assert.deepEqual(sources, [{ label: "روزنامه رسمی", url: "https://rrk.ir/" }]);
  assert.equal(formatEditorialSources(sources), "روزنامه رسمی | https://rrk.ir/");
});

test("structured sources preserve type, title, publisher, reference and date", () => {
  const value = "رأی وحدت رویه | رأی وحدت رویه شماره ۸۷۴ | هیأت عمومی دیوان عالی کشور | ۸۷۴ | ۱۴۰۴/۱۰/۲۳ | https://example.com/raye-874";
  const [source] = parseEditorialSources(value);
  assert.deepEqual(source, {
    type: "رأی وحدت رویه",
    title: "رأی وحدت رویه شماره ۸۷۴",
    label: "رأی وحدت رویه شماره ۸۷۴",
    publisher: "هیأت عمومی دیوان عالی کشور",
    reference: "۸۷۴",
    date: "۱۴۰۴/۱۰/۲۳",
    url: "https://example.com/raye-874",
  });
  assert.equal(formatEditorialSources([source]), value);
});

test("SEO keywords and editorial tags are parsed as separate lists", () => {
  assert.deepEqual(parseEditorialList("پابند الکترونیکی, نظارت الکترونیکی, پابند الکترونیکی"), [
    "پابند الکترونیکی",
    "نظارت الکترونیکی",
  ]);
  assert.deepEqual(parseEditorialList("کیفری, اجرای احکام", 30, 80), ["کیفری", "اجرای احکام"]);
});

test("valid low-resolution images are accepted while invalid or oversized images are rejected", () => {
  assert.equal(validateArticleImageDimensions(64, 64), true);
  assert.equal(validateArticleImageDimensions(320, 180), true);
  assert.equal(validateArticleImageDimensions(0, 180), false);
  assert.equal(validateArticleImageDimensions(10000, 10000), false);
});

test("slugs are lowercase URL-safe identifiers", () => {
  assert.equal(validateEditorialSlug("cheque-delay-damages"), true);
  assert.equal(validateEditorialSlug("چک-قدیمی"), false);
  assert.equal(validateEditorialSlug("bad slug"), false);
  assert.equal(validateEditorialSlug("../admin"), false);
});

test("public mapper never exposes a draft-only record", () => {
  assert.equal(mapPublishedEditorialRecord({ slug: "draft", status: "draft", published_content: null }), null);
  const published = mapPublishedEditorialRecord({
    slug: "published",
    status: "published",
    published_content: { title: "مقاله" },
    is_indexable: true,
    published_at: "2026-11-15T10:00:00.000Z",
    updated_at: "2026-11-15T10:00:00.000Z",
  });
  assert.equal(published.title, "مقاله");
  assert.equal(published.isIndexable, true);
});

test("CSV export escapes cells and neutralizes spreadsheet formulas", () => {
  const csv = serializeEditorialCsv([["title", "note"], ["مقاله", '=HYPERLINK("https://example.com")']]);
  assert.ok(csv.startsWith(String.fromCharCode(0xfeff)));
  assert.ok(csv.includes("'=HYPERLINK("));
  assert.ok(csv.includes('""https://example.com""'));
  assert.ok(csv.includes(String.fromCharCode(13, 10)));
});
