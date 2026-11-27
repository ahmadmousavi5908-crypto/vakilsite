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
    "family-law": "وکیل خانواده در اهواز و خوزستان",
    "criminal-law": "وکیل کیفری در اهواز و خوزستان",
    "property-law": "وکیل ملکی در اهواز و خوزستان",
    "contracts-and-obligations": "وکیل قرارداد در اهواز و خوزستان",
    "claims-and-enforcement": "وکیل چک و مطالبه وجه در اهواز",
    "legal-consultation": "مشاوره حقوقی در اهواز و خوزستان"
  });
});

test("unknown practice areas keep their existing neutral title", () => {
  assert.equal(getPracticeAreaSearchTitle("unknown-area", "عنوان حوزه"), "عنوان حوزه");
});


test("service metadata titles stay neutral while preserving descriptive visible H1 titles", () => {
  assert.deepEqual(PRACTICE_AREA_META_TITLES, {
    "family-law": "وکیل خانواده اهواز؛ راهنمای انتخاب",
    "criminal-law": "وکیل کیفری اهواز؛ راهنمای انتخاب",
    "property-law": "وکیل ملکی اهواز؛ راهنمای انتخاب",
    "contracts-and-obligations": "وکیل قرارداد و تعهدات اهواز",
    "claims-and-enforcement": "وکیل چک و مطالبه وجه اهواز؛ راهنمای انتخاب",
    "legal-consultation": "مشاوره حقوقی اهواز"
  });
  assert.equal(getPracticeAreaMetaTitle("property-law"), "وکیل ملکی اهواز؛ راهنمای انتخاب");
  assert.equal(getPracticeAreaMetaTitle("criminal-law"), "وکیل کیفری اهواز؛ راهنمای انتخاب");
  assert.equal(getPracticeAreaMetaTitle("legal-consultation"), "مشاوره حقوقی اهواز");
  assert.equal(getPracticeAreaMetaTitle("unknown-area", "وکیل در اهواز"), "وکیل در اهواز");
  assert.equal(getPracticeAreaSearchTitle("property-law"), "وکیل ملکی در اهواز و خوزستان");
  for (const title of Object.values(PRACTICE_AREA_META_TITLES)) {
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
    "وکیل دیه اهواز", "وکیل تهدید اهواز", "وکیل قذف اهواز", "وکیل فرجام‌خواهی اهواز",
    "وکیل اعاده دادرسی اهواز", "وکیل لایحه دفاعیه اهواز"
  ]) assert.ok(PRACTICE_AREA_KEYWORDS["criminal-law"].includes(phrase), `Missing criminal keyword: ${phrase}`);
  assert.ok(PRACTICE_AREA_KEYWORDS["contracts-and-obligations"].includes("وکیل الزام به انجام تعهد اهواز"));
  assert.ok(PRACTICE_AREA_KEYWORDS["claims-and-enforcement"].includes("وکیل چک و سفته اهواز"));
});
