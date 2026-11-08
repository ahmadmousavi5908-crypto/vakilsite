# MAVIS Growth Intelligence: official integration contracts

**Review date:** 2026-11-08  
**Status:** Research and implementation contract only. No OAuth client, API key, token, external fetch, or production integration is configured.

## 1. Design decisions

1. Use provider-specific adapters behind a shared, read-only analytics contract.
2. Request the narrowest available permission. Google Search Console uses `webmasters.readonly`; no write scope is needed for analytics.
3. Keep external credentials server-side. Never expose access tokens, refresh tokens, client secrets, or Bing API keys to browser code, logs, prompts, or Git.
4. Fetch only on an explicit administrator request, with bounded date ranges, pagination, per-provider budgets, cache windows, and resumable jobs.
5. Preserve source, property, request parameters, aggregation type, data freshness, row limits, and retrieval timestamp. Missing or incomplete data remains unknown, never zero.
6. Separate observed facts (clicks, impressions, CTR, position, crawl and submission responses) from internal opportunity heuristics. No metric predicts Google ranking.
7. No provider integration may publish an article, change site content, or grant indexing guarantees.

## 2. Google Search Console API

### Authorization

- Use OAuth 2.0 for private Search Console data.
- Minimum required scope: `https://www.googleapis.com/auth/webmasters.readonly`.
- Do not request the broader read/write `webmasters` scope for analytics-only features.
- The connected Google user must already have appropriate access to the verified property.
- Keep OAuth state, redirect validation, token encryption, refresh, revocation, and disconnect handling in a dedicated server-only integration boundary.

### Search Analytics query

Official endpoint: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`.

Supported dimensions relevant to MAVIS include date, hour, query, page, country, device, and searchAppearance. Supported search types include web, image, video, news, discover, and googleNews.

The adapter must preserve:
- startDate and endDate (the API interprets these in Pacific Time);
- dimensions and their order;
- type and dataState;
- aggregation type;
- rowLimit and startRow;
- responseAggregationType;
- clicks, impressions, CTR, and average position;
- first_incomplete_date / first_incomplete_hour metadata when returned.

The API permits rowLimit from 1 to 25,000 and uses startRow for pagination. Hour grouping requires hourly data; hourly_all and recent all-data responses can be incomplete. Search Analytics may omit rows and does not guarantee every possible row, so the result must not be described as a complete export.

Avoid repeatedly querying the same large date ranges. Google documents load quotas in addition to QPS/QPM/QPD limits; grouping or filtering by query and page, especially together, is more expensive. Use bounded requests, caching, incremental refresh, and explicit quota-exhausted states.

### Current adapter review

The existing `search-console-adapter.mjs` is a deterministic response normalizer, not a live API client. It already checks dimensions, date ranges, type/dataState, hourly rules, pagination bounds, aggregation labels, metric ranges, incomplete-data metadata, and masks likely personal query/page values.

Before OAuth activation:
- add contract fixtures from the official response shape, including empty rows and missing metadata;
- document Pacific Time date semantics in the UI and stored request metadata;
- validate the exact timestamp shape for first_incomplete_hour;
- test pagination boundaries and quota errors;
- verify that query/page privacy review is enforced before storage or display;
- do not silently interpret masked values as ordinary queries.

URL Inspection is a separate, quota-limited operation. It should be a targeted post-publication diagnostic, not a full-site crawler. Google currently documents a per-site limit of 2,000 requests/day and 600/minute for URL Inspection; monitor project and site quotas before scheduling.

## 3. Bing Webmaster Tools

- Build only against the current REST API documentation.
- Microsoft states that legacy SOAP and POX APIs retire on 2026-08-31. That date has passed as of this review; do not create a new SOAP/POX adapter.
- OAuth 2.0 is the recommended access method.
- An API key is also available, but it is generated per user rather than per site. Revoking it disables all applications using that key, so it is not the preferred long-term multi-integration credential.
- A site must be added and verified in Bing Webmaster Tools before its APIs can be used.
- Verify each exact REST endpoint, request schema, quota, and response contract from the current Microsoft reference before implementing it. Do not infer endpoint names from legacy SOAP/POX examples.

Initial scope: read-only rank/traffic, keyword, link, and crawl diagnostics. URL/sitemap submission is a separate explicitly approved publishing capability.

## 4. IndexNow publishing notification

IndexNow is a notification protocol, not an indexing or ranking guarantee.

Activation gates:
1. The article has been explicitly approved and published successfully on the canonical site.
2. The canonical URL is validated against the site's allowlisted host.
3. The IndexNow key is stored as a server-side secret and its UTF-8 key file is served from the verified host.
4. A bounded, idempotent job submits only changed canonical URLs and records the response.
5. Retries are bounded and respect rate-limit responses.

Protocol notes:
- A key is 8–128 characters and uses letters, digits, and hyphens according to the official protocol description.
- The recommended verification method is a key file at the site root.
- A batch may contain up to 10,000 URLs; MAVIS should use much smaller bounded batches.
- HTTP 200 means the URL notification was received, not that the URL was crawled, indexed, or ranked.
- HTTP 202 means accepted while key validation is pending.
- Record submitted, accepted, rejected, retried, and later-observed indexing states separately.

Never send drafts, private intake URLs, query strings containing personal data, admin pages, or unapproved URLs.

## 5. Unified provider-neutral result envelope

Each provider result should retain:
- provider and adapter version;
- verified property identifier (masked in ordinary UI where appropriate);
- request parameters and date/time semantics;
- source retrieval timestamp;
- data freshness/completeness and provider-reported aggregation;
- pagination and truncation indicators;
- quota/rate-limit state;
- privacy review flags;
- raw provider error code in restricted diagnostics, with safe user-facing error mapping.

A provider outage or quota exhaustion must not block public intake validation, deterministic legal-library retrieval, or local growth calculations. Only the affected external data refresh is paused.

## 6. Delivery order

1. Keep current Search Console adapter offline and fixture-driven; complete contract tests.
2. Add server-only Google OAuth read-only connection after explicit owner approval and credentials.
3. Add Google Search Analytics read-only fetch with bounded requests and persisted provenance.
4. Add Bing REST adapter only after endpoint-specific schema and quota verification.
5. Add IndexNow notifications only to the approved article-publishing workflow.
6. Add targeted URL Inspection as a separate quota-controlled diagnostic.

No external provider is considered connected until an authenticated live request succeeds against the verified site property and the result is safely recorded.

## Official references

- Google Search Analytics query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Console OAuth authorization: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- Google Search Console usage limits: https://developers.google.com/webmaster-tools/limits
- Google Search Console URL Inspection API reference: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Bing Webmaster API overview and REST transition: https://learn.microsoft.com/en-us/bingwebmaster/
- Bing Webmaster API access and OAuth/API-key choices: https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- Bing Webmaster OAuth 2.0: https://learn.microsoft.com/en-us/bingwebmaster/oauth2
- IndexNow protocol: https://www.indexnow.org/documentation
