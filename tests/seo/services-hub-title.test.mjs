import assert from "node:assert/strict";
import test from "node:test";
import { SERVICES_HUB_TITLE } from "../../src/lib/seo/services-hub-title.mjs";

const metadataTemplateSuffix = " | موسوی";

test("services hub title targets the core local legal-services intent", () => {
  assert.equal(SERVICES_HUB_TITLE, "بهترین وکیل حقوقی و مدنی اهواز؛ معیارهای انتخاب وکیل");
  assert.ok(SERVICES_HUB_TITLE.startsWith("بهترین وکیل حقوقی و مدنی اهواز"));
});

test("services hub title stays within the search title length budget after the site template", () => {
  const resolvedTitle = SERVICES_HUB_TITLE + metadataTemplateSuffix;
  assert.ok(Array.from(resolvedTitle).length <= 60, resolvedTitle);
});
