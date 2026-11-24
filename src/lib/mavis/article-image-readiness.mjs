import { parseMavisArticleImageMetadata } from "./article-image-metadata.mjs";

export function analyzeMavisArticleImageReadiness(image) {
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    return Object.freeze({ ready: false, reason: "missing_image" });
  }

  const parsed = parseMavisArticleImageMetadata(image);
  if (!parsed.ok) return Object.freeze({ ready: false, reason: "invalid_metadata" });
  if (parsed.image.showInArticle !== true) {
    return Object.freeze({ ready: false, reason: "not_visible" });
  }
  if (parsed.image.useForSeo !== true) {
    return Object.freeze({ ready: false, reason: "seo_disabled" });
  }

  return Object.freeze({ ready: true, reason: null });
}
