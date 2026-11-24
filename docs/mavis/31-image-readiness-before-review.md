# MAVIS article image readiness gate

**Updated:** 24 November 2026  
**Scope:** new and edited MAVIS article versions submitted for human review

## Rule

A draft may be saved without a cover image so that editorial work is not lost. It cannot be submitted to the human review queue until the *same current version* has a valid article image that:

- is stored in the current site's public `mavis-article-images` bucket and belongs to the authenticated editor;
- is rendered at the beginning of the article;
- has a descriptive, non-empty `alt` value;
- has the `useForSeo` switch enabled so it can be considered for Google Images, Open Graph and Article structured data;
- contains a complete, validated set of responsive WebP variants.

The image validator also requires the original upload to be at least 1200 × 675 pixels and no more than 24 megapixels. This is a quality threshold for the site's fixed 1600 × 900 cover pipeline, not a promise of Discover inclusion. The editor should choose a genuinely relevant image and check its crop before saving.

## Enforcement

- Browser validation rejects undersized source files before resizing them; it no longer silently upscales a tiny image and labels the result a high-resolution cover.
- On submission for review, the server reads `mavis_article_version_images` using the exact `article_id` and `current_version`. A cover from an earlier version does not satisfy the gate.
- The server reuses the existing strict image metadata parser and blocks the review request when the image is missing, hidden, disabled for SEO, or malformed.
- Saving a draft remains allowed without an image. Publication remains a separate human approval and explicit publish action. No existing public article is changed by this rule.

## Search surface notes

A relevant large image makes a page eligible for image-based surfaces; it does not guarantee Google Images impressions, Discover distribution or a rich result. Search engines still judge the page, image context, usefulness, crawlability and their own selection systems. Do not reuse one attorney portrait as the cover for unrelated articles, add keyword-stuffed alt text, or manufacture schema for an absent image.
