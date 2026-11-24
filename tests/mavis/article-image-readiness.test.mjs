import assert from "node:assert/strict";
import test from "node:test";
import { analyzeMavisArticleImageReadiness } from "../../src/lib/mavis/article-image-readiness.mjs";

const origin = "https://srbwniqhaxwaoepjfizf.supabase.co";
const userId = "550e8400-e29b-41d4-a716-446655440000";
const uploadId = "b3a1f9d0-2c64-4d17-9f2f-1a2b3c4d5e6f";
const base = `${origin}/storage/v1/object/public/mavis-article-images/${userId}/${uploadId}/`;

function validImage(overrides = {}) {
  return {
    url: base + "wide.webp",
    ogUrl: base + "og.webp",
    variants: {
      small: base + "small.webp",
      medium: base + "medium.webp",
      wide: base + "wide.webp",
      landscape: base + "landscape.webp",
      square: base + "square.webp",
    },
    alt: "تصویر مرتبط با موضوع مقاله حقوقی",
    title: "تصویر شاخص مقاله",
    caption: "تصویر توضیحی مقاله",
    width: 1600,
    height: 900,
    mimeType: "image/webp",
    showInArticle: true,
    useForSeo: true,
    ...overrides,
  };
}

test("accepts a validated visible SEO cover image", () => {
  assert.deepEqual(analyzeMavisArticleImageReadiness(validImage()), { ready: true, reason: null });
});

test("blocks review when the current version has no cover image", () => {
  assert.deepEqual(analyzeMavisArticleImageReadiness(null), { ready: false, reason: "missing_image" });
});

test("blocks an image hidden from the article body", () => {
  assert.deepEqual(
    analyzeMavisArticleImageReadiness(validImage({ showInArticle: false, useForSeo: false })),
    { ready: false, reason: "not_visible" },
  );
});

test("blocks an image that is visible but disabled for SEO", () => {
  assert.deepEqual(
    analyzeMavisArticleImageReadiness(validImage({ useForSeo: false })),
    { ready: false, reason: "seo_disabled" },
  );
});

test("blocks malformed image metadata including an empty alt attribute", () => {
  assert.deepEqual(
    analyzeMavisArticleImageReadiness(validImage({ alt: "" })),
    { ready: false, reason: "invalid_metadata" },
  );
});
