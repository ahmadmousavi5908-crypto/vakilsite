# MAVIS Editorial Source Discovery: Operational Notes

## Scope implemented in this slice

- Admin-only source search is embedded in `/admin/mavis/articles`.
- Search adapters are metadata-only and use fixed provider endpoints: Crossref Works, Semantic Scholar Paper Search, and OpenAlex Works.
- Crossref and Semantic Scholar can be queried when upstream services are available. OpenAlex is intentionally disabled until a real usage-budget ledger is implemented and explicitly enabled.
- Search requests are sequential, bounded to 5 candidates per provider, and use the existing authenticated admin session.
- A dedicated durable per-admin fixed-window limiter allows at most 30 discovery requests per 60 seconds.
- The UI merges duplicate DOI records, filters by provider, displays provenance and rights status, and lets the administrator copy metadata or explicitly create a draft.
- The draft inventory provides in-page text/category/slug filtering, sortable columns, server-side keyset pagination, and a UTF-8 Excel-compatible TSV export of the currently loaded filtered rows.
- Discovery results are persisted in the administrator-only source-candidate queue by migration 015. Candidates can be filtered by state, imported into metadata-only drafts, or ignored; each transition is audited.
- Drafts can be submitted for review only against their current immutable version. The review queue displays the exact version snapshot and its linked source rights metadata.
- Review decisions (`approved`, `changes_requested`, `rejected`) are append-only and bind to the exact current version. Change requests and rejections require an explanatory note.
- Approval only changes the editorial status to `approved`; it does not publish the article.
- A separate administrator action can publish only the exact current immutable version with an `approved` decision record.
- After publish or unpublish, the server attempts a bounded IndexNow notification for the article URL. The action succeeds independently of notification delivery; the admin queue reports whether IndexNow accepted, skipped, or could not deliver the notification. This uses the existing `INDEXNOW_KEY` and `/indexnow-key.txt` verification file; no new credential or dependency is introduced.
- Unpublishing returns the article to `approved`, clears `published_at`, and records an audit event; the public RLS policy then stops exposing it.
- Archive, restore, and rollback operations are version-checked and audited. Restoring a previously published article returns it to `approved`, not `published`.
- Rollback copies a selected historical snapshot into a new version, changes status to `draft`, clears `published_at`, and requires review and publication again.

## Runtime configuration

- `MAVIS_CROSSREF_MAILTO`: optional valid contact email used for Crossref's polite pool.
- `SEMANTIC_SCHOLAR_API_KEY`: optional server-side key, sent only in the `x-api-key` header.
- `OPENALEX_API_KEY`: server-side key; not sufficient by itself to enable OpenAlex.
- `MAVIS_OPENALEX_MAX_COST_USD`: configured positive budget value; not currently enforced by a usage ledger.
- `MAVIS_OPENALEX_BUDGET_ENFORCEMENT=true`: must remain unset until cost accounting and hard budget enforcement are implemented and reviewed.

Never place provider keys in browser variables, URLs, source files, logs, or PR descriptions.

## Search-engine integration status

- Google Search Console uses the read-only OAuth integration and URL Inspection/Sitemap inventory described in PRs 113 and 114.
- Published and unpublished article URLs are notified through the existing IndexNow key file after the publication action succeeds. IndexNow acceptance is a crawl notification, not an indexing guarantee.
- Bing Webmaster's official documentation recommends IndexNow for automated URL changes. Its OAuth documentation describes the `webmaster.read` scope, but a Microsoft Q&A report dated 14 October 2026 documents newly issued OAuth tokens being rejected by the API with `InvalidToken`; the moderator directed the report to Bing Webmaster support without confirming a fix. A direct Bing Webmaster OAuth connector is therefore deferred until Microsoft confirms service recovery and a live read-only test passes.
- Do not use the legacy SOAP/POX endpoints; Microsoft documents their retirement on 31 August 2026.

References:
- https://learn.microsoft.com/en-us/bingwebmaster/
- https://learn.microsoft.com/en-us/bingwebmaster/oauth2
- https://learn.microsoft.com/en-us/answers/questions/6036910/webmaster-api-rejects-every-oauth-access-token-wit
- https://www.indexnow.org/documentation
- https://www.bing.com/webmasters/help/?topicid=62f2860b

## Rights and legal-source policy

- Every candidate starts with `rightsStatus: unknown`.
- Discovery does not grant permission to republish or reproduce an abstract, PDF, image, or full text.
- Academic discovery records are research leads, not Iranian legal authority.
- For Iranian legal claims, the editorial workflow must prioritize current primary legal sources and verify amendments, repeals, binding unifying opinions, and dates separately.
- The administrator can explicitly import a selected candidate into a metadata-only draft. The atomic import stores source provenance, an immutable version-one snapshot, and an audit event.
- The import RPC ignores client-supplied rights claims and always stores `rights_status=unknown`. It never fetches or copies source text, abstracts, PDFs, or images.
- Re-importing a source with an existing generated draft returns that draft rather than creating a duplicate.
- Imported drafts are marked `origin_type=metadata_only`, remain in `draft`, and contain an explicit editorial-completion warning. Import never approves or publishes.

## Security and reliability

- Fixed provider URLs only; no arbitrary URL fetching.
- Redirects are rejected.
- Query length, result count, timeout, and upstream response bytes are bounded.
- Streaming responses are cancelled immediately when the byte cap is exceeded.
- Provider errors are mapped to safe public messages; upstream response bodies and credentials are not returned.
- Rate-limit storage is private, RLS-enabled, and inaccessible for direct table access.
- Admin identity is checked server-side before the rate-limit RPC and upstream calls.
- Provider calls run sequentially. A cross-user distributed provider lease/queue is still a required hardening step before high-volume production use.

## User interface

- Admin route: `/admin/mavis/articles`.
- Source discovery panel appears above the database draft grid.
- The draft grid is spreadsheet-like: quick search, status filter, sortable title/category/version/update columns, and server-side keyset pagination.
- The review queue is available on the same admin page; each item opens a read-only immutable snapshot before a decision is recorded.
- A separate publication queue lists approved and published articles. Publish/unpublish actions require a second explicit confirmation and are version-bound.
- A separate archive queue links to version management for restore and rollback.
- Public `/articles` retains its existing editorial accordion design and static guides, with a separate paginated section for database-backed published articles.
- Dynamic detail pages render only records with `status=published`; legacy static slugs retain precedence and are reserved by the editor.
- Public reads use a dedicated anonymous Supabase client with the publishable key and RLS. The public citation RPC exposes only textual citation relations for published articles and omits image/dataset relations.

## Verification commands

```sh
node --test tests/mavis/source-discovery-adapters.test.mjs
supabase test db
npm run lint
npm run build
```

## Not yet implemented

- Cross-provider distributed leases and global provider concurrency coordination.
- AI-assisted metadata/content completion.
- Production migrations/deployment and runtime verification remain pending.
