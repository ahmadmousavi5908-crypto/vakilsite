# MAVIS Search Console URL inspection and sitemap inventory

## Purpose

Extend the existing administrator-only Google Search Console connection with two explicitly requested, read-only tools: inspect one URL's indexed state and list the sitemaps registered for the configured property.

## URL inspection

- Uses `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`.
- Uses the existing `webmasters.readonly` OAuth grant; no new consent scope is requested.
- Accepts one fully qualified HTTPS URL per administrator action.
- Rejects credentials, non-HTTPS URLs, fragments, and URLs outside the configured URL-prefix or Domain property before contacting Google.
- Returns a bounded, normalized subset of index status, canonical selection, crawl state, mobile usability, and rich-result information.
- This endpoint reports the version currently in Google's index. It does not perform a live URL test or request indexing.
- No bulk inspection or background polling is implemented.

Google's published quota for URL Inspection is 2,000 requests per Search Console property per day and 600 per minute per property. Project quota is 10,000,000 requests per day and 15,000 per minute. MAVIS therefore exposes a manual, one-URL-at-a-time action and does not schedule or batch inspections. Administrators should monitor current usage in Google Cloud Console.

## Sitemap inventory

- Uses `GET https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps`.
- Uses the existing `webmasters.readonly` OAuth grant.
- Returns at most 200 normalized sitemap entries and at most 20 content records per sitemap.
- Exposes path, type, submission/download timestamps, pending state, warning/error counts, and submitted/indexed counts.
- Does not submit, delete, or modify sitemaps.

## Security

- Both actions use the existing server-side encrypted refresh-token connection.
- Both actions are administrator-only, same-origin guarded, JSON-only, rate-limited, no-store, and bounded by request/response limits.
- Provider payloads are normalized before returning to the browser; raw provider objects and credentials are not exposed.
- No public routes, public UI, article content, or production data are modified.

## Verification

Run `npm run test:mavis-search-console`. The suite includes property-boundary validation, URL Inspection request shape and response normalization, sitemap normalization, and admin/origin/action guards.
