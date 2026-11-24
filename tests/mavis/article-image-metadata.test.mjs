import test from "node:test";
import assert from "node:assert/strict";
import {
  isMavisArticleImageOwnedByUser,
  parseMavisArticleImageMetadata,
} from "../../src/lib/mavis/article-image-metadata.mjs";

const projectUrl = "https://srbwniqhaxwaoepjfizf.supabase.co";
const userId = "550e8400-e29b-41d4-a716-446655440000";
const uploadId = "b3a1f9d0-2c64-4d17-9f2f-1a2b3c4d5e6f";
const base = `${projectUrl}/storage/v1/object/public/mavis-article-images/${userId}/${uploadId}/`;

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
    alt: "تصویر مفهومی مقاله حقوقی",
    title: "راهنمای حقوقی",
    caption: "تصویر شاخص",
    width: 1600,
    height: 900,
    mimeType: "image/webp",
    showInArticle: true,
    useForSeo: true,
    ...overrides,
  };
}

test("accepts a complete image metadata set with six matching WebP assets", () => {
  const result = parseMavisArticleImageMetadata(validImage());
  assert.equal(result.ok, true);
  assert.equal(result.image.url, base + "wide.webp");
  assert.equal(result.image.variants.square, base + "square.webp");
});

test("rejects an empty alt attribute when an image is attached", () => {
  const result = parseMavisArticleImageMetadata(validImage({ alt: "عکس" }));
  assert.equal(result.ok, false);
});

test("rejects a variant uploaded under a different folder", () => {
  const image = validImage();
  image.variants.square = image.variants.square.replace(uploadId, "b3a1f9d0-2c64-4d17-9f2f-1a2b3c4d5e70");
  assert.equal(parseMavisArticleImageMetadata(image).ok, false);
});

test("rejects a non-HTTPS or non-Supabase object URL", () => {
  const image = validImage();
  image.variants.medium = image.variants.medium.replace("https://", "http://");
  assert.equal(parseMavisArticleImageMetadata(image).ok, false);
});

test("scopes an otherwise valid image set to the authenticated owner and exact project", () => {
  const parsed = parseMavisArticleImageMetadata(validImage());
  assert.equal(isMavisArticleImageOwnedByUser(parsed.image, projectUrl, userId), true);
  assert.equal(isMavisArticleImageOwnedByUser(parsed.image, projectUrl, "650e8400-e29b-41d4-a716-446655440000"), false);
  assert.equal(isMavisArticleImageOwnedByUser(parsed.image, "https://another-project.supabase.co", userId), false);
});

test("keeps an article without a cover image fully optional", () => {
  assert.deepEqual(parseMavisArticleImageMetadata(""), { ok: true, image: null });
});
