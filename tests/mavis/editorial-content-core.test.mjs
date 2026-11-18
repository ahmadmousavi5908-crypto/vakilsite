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

test("CSV export neutralizes spreadsheet formula prefixes", () => {
  const csv = serializeEditorialCsv([["title"], ["=HYPERLINK(\"https://bad.example\")"]]);
  assert.match(csv, /'=HYPERLINK/);
});

test("maps unified CMS snapshots into the public article page shape", () => {
  const article = mapPublishedEditorialRecord({
    status: "published",
    slug: "production-article",
    published_content: {
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

  assert.equal(article.intro, "مقدمه مقاله");
  assert.equal(article.sections[0].heading, "بخش نخست");
  assert.deepEqual(article.checklist, ["مدرک نخست"]);
  assert.equal(article.sources[0].label, "روزنامه رسمی");
  assert.equal(article.warning, "توضیح احتیاطی");
  assert.match(article.readTime, /دقیقه$/);
});
