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


test("preserves warning and checklist fields when editing a draft", () => {
  const result = parseMavisArticleDraftInput(formWith({
    warning: "این متن صرفاً آموزشی است.",
    checklist: "بررسی منبع رسمی
کنترل تاریخ اصلاح",
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.payload.content.checklist, ["بررسی منبع رسمی", "کنترل تاریخ اصلاح"]);
  assert.equal(result.payload.content.warning, "این متن صرفاً آموزشی است.");
});

test("requires a valid article id and expected version together", () => {
  const missingVersion = parseMavisArticleDraftInput(formWith({
    article_id: "4a0d8f64-5b2a-4f2a-8a10-4a1d0d7b6f90",
  }));
  assert.equal(missingVersion.ok, false);

  const invalidId = parseMavisArticleDraftInput(formWith({
    article_id: "not-a-uuid",
    expected_version: "1",
  }));
  assert.equal(invalidId.ok, false);

  const valid = parseMavisArticleDraftInput(formWith({
    article_id: "4a0d8f64-5b2a-4f2a-8a10-4a1d0d7b6f90",
    expected_version: "3",
  }));
  assert.equal(valid.ok, true);
  assert.equal(valid.articleId, "4a0d8f64-5b2a-4f2a-8a10-4a1d0d7b6f90");
  assert.equal(valid.expectedVersion, 3);
});

test("rejects oversized warning and checklist", () => {
  assert.equal(parseMavisArticleDraftInput(formWith({ warning: "x".repeat(2001) })).ok, false);
  assert.equal(parseMavisArticleDraftInput(formWith({ checklist: Array.from({ length: 61 }, () => "item").join("
") })).ok, false);
});


test("rejects drafts that exceed the total content budget", () => {
  const headings = Array.from({ length: 17 }, () => "بخش");
  const bodies = Array.from({ length: 17 }, () => "x".repeat(12000));
  const result = parseMavisArticleDraftInput(formWith({
    section_heading: headings,
    section_body: bodies,
  }));
  assert.equal(result.ok, false);
  assert.match(result.error, /حجم کل متن/);
});


test("accepts typed Iranian legal records and preserves their legal metadata", () => {
  const form = new FormData();
  form.set("title", "رأی وحدت رویه نمونه");
  form.set("slug", "unifying-opinion-sample");
  form.set("excerpt", "خلاصه‌ای معتبر برای آزمون ساختار مدرک حقوقی.");
  form.set("category", "حقوق کیفری");
  form.set("intro", "این متن صرفاً برای آزمون اعتبارسنجی ساختار فرم استفاده می‌شود.");
  form.set("record_type", "unifying_opinion");
  form.set("document_number", "۱۲۳");
  form.set("issuing_authority", "دیوان عالی کشور");
  form.set("document_date", "2026-01-15");
  form.set("validity_status", "unknown");
  form.append("section_heading", "موضوع رأی");
  form.append("section_body", "شرح موضوع رأی برای آزمون باید حداقل ده نویسه داشته باشد.");

  const result = parseMavisArticleDraftInput(form);
  assert.equal(result.ok, true);
  assert.equal(result.payload.content.record_type, "unifying_opinion");
  assert.equal(result.payload.content.legal_metadata.document_number, "۱۲۳");
  assert.equal(result.payload.content.legal_metadata.issuing_authority, "دیوان عالی کشور");
});

test("rejects unsupported legal record types and malformed legal dates", () => {
  const form = new FormData();
  form.set("title", "قانون نمونه");
  form.set("slug", "sample-law");
  form.set("excerpt", "خلاصه‌ای معتبر برای آزمون ساختار مدرک حقوقی.");
  form.set("category", "حقوق مدنی");
  form.set("intro", "این متن صرفاً برای آزمون اعتبارسنجی ساختار فرم استفاده می‌شود.");
  form.set("record_type", "invented_type");
  form.set("document_date", "1405/01/01");
  form.append("section_heading", "ماده نخست");
  form.append("section_body", "متن ماده برای آزمون باید حداقل ده نویسه داشته باشد.");

  const result = parseMavisArticleDraftInput(form);
  assert.equal(result.ok, false);
});
