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


test("property page metadata targets the observed service intent without changing its visible H1", () => {
  assert.deepEqual(PRACTICE_AREA_META_TITLES, {
    "property-law": "وکیل ملکی در اهواز | خلع ید، تخلیه و دعاوی ثبتی"
  });
  assert.equal(getPracticeAreaMetaTitle("property-law"), "وکیل ملکی در اهواز | خلع ید، تخلیه و دعاوی ثبتی");
  assert.equal(getPracticeAreaMetaTitle("criminal-law", "وکیل کیفری در اهواز و خوزستان"), "وکیل کیفری در اهواز و خوزستان");
  assert.equal(getPracticeAreaSearchTitle("property-law"), "وکیل ملکی در اهواز و خوزستان");
});
