import assert from "node:assert/strict";
import test from "node:test";
import { validateMavisArticleImageDimensions } from "../../src/lib/mavis/article-image-browser.mjs";

test("accepts small but valid article image dimensions without a minimum threshold", () => {
  assert.equal(validateMavisArticleImageDimensions(96, 64), true);
  assert.equal(validateMavisArticleImageDimensions(320, 180), true);
  assert.equal(validateMavisArticleImageDimensions(800, 600), true);
});

test("rejects invalid and technically oversized image dimensions", () => {
  assert.equal(validateMavisArticleImageDimensions(0, 600), false);
  assert.equal(validateMavisArticleImageDimensions(600, 0), false);
  assert.equal(validateMavisArticleImageDimensions(-1, 600), false);
  assert.equal(validateMavisArticleImageDimensions(5000, 5000), false);
  assert.equal(validateMavisArticleImageDimensions(100.5, 100), false);
});
