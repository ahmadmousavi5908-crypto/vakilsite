import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SERVICES_HUB_DESCRIPTION,
  SERVICES_HUB_TITLE
} from "../../src/lib/seo/services-hub-title.mjs";

const metadataTemplateSuffix = " | موسوی";

test("services hub title targets the core local legal-services intent", () => {
  assert.equal(SERVICES_HUB_TITLE, "بهترین وکیل حقوقی و مدنی اهواز؛ معیارهای انتخاب وکیل");
  assert.ok(SERVICES_HUB_TITLE.startsWith("بهترین وکیل حقوقی و مدنی اهواز"));
});

test("services hub title stays within the search title length budget after the site template", () => {
  const resolvedTitle = SERVICES_HUB_TITLE + metadataTemplateSuffix;
  assert.ok(Array.from(resolvedTitle).length <= 60, resolvedTitle);
});

test("services hub social metadata is page-specific instead of inheriting the homepage identity", async () => {
  const source = await readFile(new URL("../../src/app/services/page.js", import.meta.url), "utf8");
  assert.match(source, /openGraph:\s*\{/);
  assert.match(source, /url:\s*"\/services"/);
  assert.match(source, /title:\s*SERVICES_HUB_TITLE\s*\+\s*" \| موسوی"/);
  assert.match(source, /description:\s*SERVICES_HUB_DESCRIPTION/);
  assert.match(source, /twitter:\s*\{/);
  assert.match(source, /siteName:\s*"وکیل سید احمد موسوی"/);
  assert.ok(SERVICES_HUB_DESCRIPTION.includes("بهترین وکیل حقوقی و مدنی در اهواز"));
});
