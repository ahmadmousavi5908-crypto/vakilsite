# MAVIS Editorial Source Discovery: Operational Notes

## Scope implemented in this slice

- Admin-only source search is embedded in `/admin/mavis/articles`.
- Search adapters are metadata-only and use fixed provider endpoints: Crossref Works, Semantic Scholar Paper Search, and OpenAlex Works.
- Crossref and Semantic Scholar can be queried when upstream services are available. OpenAlex is intentionally disabled until a real usage-budget ledger is implemented and explicitly enabled.
- Search requests are sequential, bounded to 5 candidates per provider, and use the existing authenticated admin session.
- A dedicated durable per-admin fixed-window limiter allows at most 30 discovery requests per 60 seconds.
- The UI merges duplicate DOI records, filters by provider, displays provenance and rights status, and lets the administrator copy metadata or explicitly create a draft.
- The draft inventory provides in-page text/category/slug filtering and sortable columns while preserving server-side keyset pagination.
- Drafts can be submitted for review only against their current immutable version. The review queue displays the exact version snapshot and its linked source rights metadata.
- Review decisions (`approved`, `changes_requested`, `rejected`) are append-only and bind to the exact current version. Change requests and rejections require an explanatory note.
- Approval only changes the editorial status to `approved`; it does not publish or expose the article publicly.

## Runtime configuration

- `MAVIS_CROSSREF_MAILTO`: optional valid contact email used for Crossref's polite pool.
- `SEMANTIC_SCHOLAR_API_KEY`: optional server-side key, sent only in the `x-api-key` header.
- `OPENALEX_API_KEY`: server-side key; not sufficient by itself to enable OpenAlex.
- `MAVIS_OPENALEX_MAX_COST_USD`: configured positive budget value; not currently enforced by a usage ledger.
- `MAVIS_OPENALEX_BUDGET_ENFORCEMENT=true`: must remain unset until cost accounting and hard budget enforcement are implemented and reviewed.

Never place provider keys in browser variables, URLs, source files, logs, or PR descriptions.

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
- Public `/articles` remains the existing editorial accordion page and is not changed in this slice. Database-backed public listing/detail routes must wait until the CMS schema and publication workflow are approved and applied in the target environment.

## Verification commands

```sh
node --test tests/mavis/source-discovery-adapters.test.mjs
supabase test db
npm run lint
npm run build
```

## Not yet implemented

- Candidate queue with durable discovery history and administrator triage states.
- Cross-provider distributed leases and global provider concurrency coordination.
- AI-assisted metadata/content completion.
- Publication, archive, rollback, and public database-backed article pages.
