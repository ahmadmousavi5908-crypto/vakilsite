# Automated publication discovery pipeline

## Scope

This pipeline applies to every MAVIS article and every future publication. It does not publish drafts or bypass the human approval workflow.

## On every successful publish or unpublish

1. The authenticated administrator action changes the exact approved article version in Supabase.
2. The application revalidates the home page, article archive, article library, article detail route, and /sitemap.xml.
3. The dynamic XML sitemap reads the published article catalogue directly. If the CMS database is temporarily unavailable, the sitemap remains a valid XML response with static public URLs, while a server-side warning records that dynamic CMS URLs could not be loaded.
4. Every published CMS article is listed only when is_indexable = true, with its actual publication timestamp as lastmod. The article archive and library use the newest valid publication timestamp.
5. IndexNow receives the changed article URL and both affected archive URLs in one deduplicated batch. The same lifecycle hook handles unpublishing so participating engines can refresh stale URLs.
6. The IndexNow API key is read from the single public verification file named {key}.txt. The deployment validates that the filename and file contents match, then injects the same value into the Cloudflare Worker runtime without logging it. The keyLocation sent to IndexNow is derived from that exact key filename.

## Google discovery

- robots.txt advertises the canonical /sitemap.xml.
- Submit the sitemap to Search Console once; the URL remains stable while its contents update on every publication.
- Accurate lastmod values help Google schedule recrawls. Do not call the deprecated sitemap ping endpoint.
- Google does not participate in IndexNow. For Google, sitemap discovery and normal crawling are the supported scalable path. URL Inspection is reserved for exceptional one-off troubleshooting, not routine article publication.
- A successful sitemap or IndexNow submission is a discovery notification, not a guarantee of crawling, indexing, ranking, or traffic.

## Safety and validation

- Drafts and approved-but-unpublished articles never enter the public sitemap or IndexNow batch.
- Admin and API routes are rejected by the IndexNow client.
- Only same-origin HTTPS public URLs are accepted.
- IndexNow submissions are limited to changed URLs; the entire site is not repeatedly resubmitted.
- Build fails if the production IndexNow verification key is absent, invalid, ambiguous, or mismatched.
- Publication remains gated by the existing authenticated administrator and exact-version approval checks.
