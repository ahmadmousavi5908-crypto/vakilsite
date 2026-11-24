import assert from "node:assert/strict";
import test from "node:test";
import { validateMavisArticleImageDimensions } from "../../src/lib/mavis/article-image-browser.mjs";

test("requires a source image large enough for high-resolution discovery surfaces", () => {
  assert.equal(validateMavisArticleImageDimensions(1200, 675), true);
  assert.equal(validateMavisArticleImageDimensions(1600, 900), true);
  assert.equal(validateMavisArticleImageDimensions(2400, 1600), true);
});

test("rejects source images too small for a high-resolution cover", () => {
  assert.equal(validateMavisArticleImageDimensions(1199, 900), false);
  assert.equal(validateMavisArticleImageDimensions(1600, 674), false);
  assert.equal(validateMavisArticleImageDimensions(800, 600), false);
  assert.equal(validateMavisArticleImageDimensions(320, 180), false);
  assert.equal(validateMavisArticleImageDimensions(96, 64), false);
});

test("rejects invalid and technically oversized image dimensions", () => {
  assert.equal(validateMavisArticleImageDimensions(0, 600), false);
  assert.equal(validateMavisArticleImageDimensions(600, 0), false);
  assert.equal(validateMavisArticleImageDimensions(-1, 600), false);
  assert.equal(validateMavisArticleImageDimensions(5000, 5000), false);
  assert.equal(validateMavisArticleImageDimensions(100.5, 100), false);
});
