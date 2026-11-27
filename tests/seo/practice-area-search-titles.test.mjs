import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getPracticeAreaMetaTitle,
  getPracticeAreaSearchTitle,
  PRACTICE_AREA_KEYWORDS,
  PRACTICE_AREA_META_TITLES,
  PRACTICE_AREA_SEARCH_TITLES
} from "../../src/lib/seo/practice-area-search-titles.mjs";

test("practice area search titles are descriptive and locally accurate", () => {
  assert.deepEqual(PRACTICE_AREA_SEARCH_TITLES, {
    "family-law": "بهترین وکیل خانواده اهواز؛ معیارهای انتخاب",
    "criminal-law": "بهترین وکیل کیفری اهواز؛ معیارهای انتخاب",
    "property-law": "بهترین وکیل ملکی اهواز؛ معیارهای انتخاب",
    "contracts-and-obligations": "بهترین وکیل قرارداد اهواز؛ معیارهای انتخاب",
    "claims-and-enforcement": "بهترین وکیل چک و مطالبه وجه اهواز؛ معیارهای انتخاب",
    "legal-consultation": "بهترین وکیل حقوقی اهواز؛ معیارهای انتخاب"
  });
});

test("unknown practice areas keep their existing neutral title", () => {
  assert.equal(getPracticeAreaSearchTitle("unknown-area", "عنوان حوزه"), "عنوان حوزه");
});


test("service metadata titles lead with best-lawyer search intent and frame it as selection guidance", () => {
  assert.deepEqual(PRACTICE_AREA_META_TITLES, {
    "family-law": "بهترین وکیل خانواده اهواز؛ راهنمای انتخاب",
    "criminal-law": "بهترین وکیل کیفری اهواز؛ راهنمای انتخاب",
    "property-law": "بهترین وکیل ملکی اهواز؛ راهنمای انتخاب",
    "contracts-and-obligations": "بهترین وکیل قرارداد اهواز؛ راهنمای انتخاب",
    "claims-and-enforcement": "بهترین وکیل چک اهواز؛ راهنمای انتخاب",
    "legal-consultation": "بهترین وکیل حقوقی اهواز؛ راهنمای انتخاب"
  });
  assert.equal(getPracticeAreaMetaTitle("property-law"), "بهترین وکیل ملکی اهواز؛ راهنمای انتخاب");
  assert.equal(getPracticeAreaMetaTitle("criminal-law"), "بهترین وکیل کیفری اهواز؛ راهنمای انتخاب");
  assert.equal(getPracticeAreaMetaTitle("legal-consultation"), "بهترین وکیل حقوقی اهواز؛ راهنمای انتخاب");
  assert.equal(getPracticeAreaMetaTitle("unknown-area", "وکیل در اهواز"), "وکیل در اهواز");
  assert.equal(getPracticeAreaSearchTitle("property-law"), "بهترین وکیل ملکی اهواز؛ معیارهای انتخاب");
  for (const title of Object.values(PRACTICE_AREA_META_TITLES)) {
    assert.ok(title.startsWith("بهترین وکیل "), `Titles must lead with the primary best-lawyer phrase: ${title}`);
    assert.ok(title.includes("راهنمای انتخاب"), `Best-lawyer wording must be framed as selection guidance: ${title}`);
    assert.ok(`${title} | سید احمد موسوی`.length <= 60, `Service title exceeds 60 characters: ${title}`);
  }
});


test("service page titles and social metadata always use the full attorney identity", () => {
  const source = readFileSync(new URL("../../src/app/services/[slug]/page.js", import.meta.url), "utf8");
  assert.match(source, /title:\s*\{\s*absolute:\s*fullTitle\s*\}/u);
  assert.match(source, /openGraph:\s*\{[^\n]*title:\s*fullTitle/u);
  assert.match(source, /twitter:\s*\{[^\n]*title:\s*fullTitle/u);
  assert.match(source, /const fullTitle = `\$\{metaTitle\} \| سید احمد موسوی`/u);
});


test("criminal and civil service metadata retain explicit user-requested legal topics", () => {
  for (const phrase of [
    "وکیل مواد مخدر اهواز", "وکیل قاچاق کالا اهواز", "وکیل جرایم رایانه‌ای اهواز",
    "وکیل جرایم اینترنتی اهواز", "وکیل خیانت در امانت اهواز", "وکیل سرقت اهواز",
    "وکیل ضرب و جرح اهواز", "وکیل دیه اهواز", "وکیل جرایم اقتصادی اهواز", "وکیل تهدید اهواز",
    "وکیل توهین اهواز", "وکیل افترا اهواز", "وکیل نشر اکاذیب اهواز", "وکیل قذف اهواز",
    "وکیل دادسرا اهواز", "وکیل تحقیقات مقدماتی اهواز", "وکیل تجدیدنظر اهواز", "وکیل اعتراض به قرار اهواز",
    "وکیل فرجام‌خواهی اهواز", "وکیل لایحه دفاع اهواز",
    "وکیل اعاده دادرسی اهواز", "وکیل لایحه دفاعیه اهواز"
  ]) assert.ok(PRACTICE_AREA_KEYWORDS["criminal-law"].includes(phrase), `Missing criminal keyword: ${phrase}`);
  assert.ok(PRACTICE_AREA_KEYWORDS["contracts-and-obligations"].includes("وکیل الزام به انجام تعهد اهواز"));
  assert.ok(PRACTICE_AREA_KEYWORDS["claims-and-enforcement"].includes("وکیل چک و سفته اهواز"));
});
