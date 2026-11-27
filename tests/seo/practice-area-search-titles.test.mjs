import assert from "node:assert/strict";
import test from "node:test";
import {
  getPracticeAreaMetaTitle,
  getPracticeAreaSearchTitle,
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


test("service metadata titles target best-lawyer intent while preserving descriptive visible H1 titles", () => {
  assert.deepEqual(PRACTICE_AREA_META_TITLES, {
    "family-law": "بهترین وکیل خانواده اهواز؛ معیارهای انتخاب وکیل",
    "criminal-law": "بهترین وکیل کیفری اهواز؛ معیارهای انتخاب وکیل",
    "property-law": "بهترین وکیل ملکی اهواز؛ معیارهای انتخاب وکیل",
    "contracts-and-obligations": "بهترین وکیل قرارداد اهواز؛ معیارهای انتخاب وکیل",
    "claims-and-enforcement": "وکیل چک و مطالبه وجه اهواز؛ راهنمای انتخاب",
    "legal-consultation": "مشاوره حقوقی اهواز؛ هزینه، مراحل و انتخاب وکیل"
  });
  assert.equal(getPracticeAreaMetaTitle("property-law"), "بهترین وکیل ملکی اهواز؛ معیارهای انتخاب وکیل");
  assert.equal(getPracticeAreaMetaTitle("criminal-law"), "بهترین وکیل کیفری اهواز؛ معیارهای انتخاب وکیل");
  assert.equal(getPracticeAreaMetaTitle("legal-consultation"), "مشاوره حقوقی اهواز؛ هزینه، مراحل و انتخاب وکیل");
  assert.equal(getPracticeAreaMetaTitle("unknown-area", "وکیل در اهواز"), "وکیل در اهواز");
  assert.equal(getPracticeAreaSearchTitle("property-law"), "وکیل ملکی در اهواز و خوزستان");
});
