# MAVIS Article Image Pipeline

**Status:** Feature implementation on `feature/mavis-article-image-seo`  
**Scope:** Optional article hero image, secure upload, SEO metadata and image discovery.

## Editorial workflow

1. The administrator enters the article's English slug and optionally selects one source image in the editorial studio.
2. The browser checks that the source is at least 1200×675 and creates six WebP assets: responsive 640×360, 960×540 and 1600×900 (16:9), 1200×900 (4:3), 1200×1200 (1:1), and 1200×630 (Open Graph).
3. The server action requires an authenticated site administrator and uploads the variants to the public `mavis-article-images` bucket. Only administrators can create, update or delete objects, and each administrator is restricted to their own storage folder. Public read access is intentional so crawlers and social preview bots can fetch published images.
4. The editor exposes descriptive Alt text, image title and caption, plus separate controls for showing the image above the article and using it in Google/Schema/social metadata.
5. Draft saves update only `draft_content`. Explicit publication copies the image metadata into `published_content`, just like the article body.

## Discovery and rendering

- The public article page renders a normal HTML image element above the article title, with descriptive Alt text, dimensions, responsive srcset/sizes, eager loading and high fetch priority.
- When enabled, the 1200×630 crop is used for Open Graph and Twitter large-image previews.
- BlogPosting JSON-LD exposes the 16:9, 4:3 and 1:1 image variants.
- The Next.js sitemap includes the image variants for indexable published articles.
- Long articles receive an accessible table of contents with in-page anchors. Reading typography is tuned for Persian long-form text, with a narrower reading measure, larger body type, generous line height and responsive spacing.
- The spreadsheet-like article inventory and all existing article URLs remain unchanged.

## Safety and limits

- The image field is optional. Articles without images continue to work unchanged.
- SVG and arbitrary HTML are not accepted. Only browser-generated WebP variants are uploaded, each capped at 3 MiB.
- Uploads are scoped to the authenticated admin's storage path and protected by Storage RLS.
- Replaced images are retained because a previous published snapshot may still reference them. A future orphan-cleanup job must verify all draft and published references before deletion.
- Google and AI systems choose what to crawl, index and display. This pipeline improves discoverability and metadata quality but cannot guarantee indexing or ranking.

## Staging release gate

Apply migration `007_mavis_article_images.sql` only to the isolated `vakilsite-staging` project. Never apply it to Production as part of this feature branch. Deploy the feature only through the existing manual staging workflow, verify upload, draft isolation, publication, public image URLs, page metadata, JSON-LD and image sitemap, then obtain owner approval before any production release.
