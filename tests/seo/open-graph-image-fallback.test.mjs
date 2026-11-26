import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("indexable site sections provide the branded default social image", async () => {
  const files = await Promise.all([
    source("../../src/app/layout.js"),
    source("../../src/app/services/page.js"),
    source("../../src/app/locations/khuzestan/page.js"),
    source("../../src/app/legal-glossary/page.js"),
    source("../../src/app/legal-library/page.js"),
    source("../../src/app/services/[slug]/page.js"),
  ]);

  for (const file of files) {
    assert.ok(file.includes('/images/lawyer.jpg'), "Missing default social image");
    assert.ok(file.includes("تصویر سید احمد موسوی"), "Missing descriptive social image alt text");
  }
});

test("article cover images remain optional and use the attorney portrait as a social fallback", async () => {
  const file = await source("../../src/app/articles/[slug]/page.js");

  assert.ok(file.includes("const hasSeoCoverImage"));
  assert.ok(file.includes(' : "/images/lawyer.jpg";'));
  assert.ok(file.includes("images: [{"));
  assert.ok(file.includes("card: \"summary_large_image\""));
  assert.ok(file.includes("coverImageUseForSeo === true"));
});
