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
  assert.ok(csv.includes("'=HYPERLINK(""https://example.com"")"));
  assert.ok(csv.includes(String.fromCharCode(13, 10)));
});
