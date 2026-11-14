import assert from "node:assert/strict";
import test from "node:test";
import { parseMavisArticleDraftInput } from "../../src/lib/mavis/article-draft-input.mjs";

function formWith(overrides = {}) {
  const form = new FormData();
  const values = {
    title: "راهنمای حقوقی قرارداد",
    slug: "contract-legal-guide",
    excerpt: "خلاصه‌ای کامل و کاربردی برای بررسی حقوقی قرارداد.",
    category: "حقوق مدنی",
    tags: "قرارداد، حقوق مدنی, قرارداد",
    intro: "این مقدمه برای آزمون ساختار پیش‌نویس مقاله نوشته شده است.",
    author_name: "گروه پژوهش",
    seo_title: "راهنمای قرارداد",
    seo_description: "راهنمای حقوقی بررسی قراردادها",
    section_heading: "مبانی قرارداد",
    section_body: "این متن نمونه برای بررسی ساختار و اعتبارسنجی بخش مقاله نوشته شده است.",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) {
    if (key === "section_heading" || key === "section_body") {
      for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
    } else form.set(key, value);
  }
  return form;
}

test("normalizes tags and builds structured article content", () => {
  const result = parseMavisArticleDraftInput(formWith());
  assert.equal(result.ok, true);
  assert.deepEqual(result.payload.tags, ["قرارداد", "حقوق مدنی"]);
  assert.equal(result.payload.content.sections[0].heading, "مبانی قرارداد");
});

test("rejects unsafe slugs", () => {
  const result = parseMavisArticleDraftInput(formWith({ slug: "مقاله-حقوقی" }));
  assert.equal(result.ok, false);
  assert.match(result.error, /نامک/);
});

test("rejects mismatched section fields", () => {
  const result = parseMavisArticleDraftInput(formWith({ section_heading: ["بخش اول", "بخش دوم"] }));
  assert.equal(result.ok, false);
  assert.match(result.error, /بخش معتبر/);
});

test("rejects more than forty tags", () => {
  const tags = Array.from({ length: 41 }, (_, index) => "tag-" + index).join(",");
  const result = parseMavisArticleDraftInput(formWith({ tags }));
  assert.equal(result.ok, false);
  assert.match(result.error, /۴۰ برچسب/);
});

test("rejects short section bodies and malformed forms", () => {
  assert.equal(parseMavisArticleDraftInput(formWith({ section_body: "کوتاه" })).ok, false);
  assert.equal(parseMavisArticleDraftInput(null).ok, false);
});
