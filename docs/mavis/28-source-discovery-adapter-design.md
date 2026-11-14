# MAVIS Source Discovery — Adapter and Rights-Safe Design

**Status:** Implemented metadata-discovery baseline; this document now records the provider contract and remaining hardening work.  
**Priority:** Complete the end-to-end editorial experience and production-grade provider coordination.  
**Scope:** Crossref and Semantic Scholar metadata search, candidate persistence, explicit metadata-only import, and draft-first editorial workflow. Full-text/PDF ingestion is not implemented and is not implied by metadata discovery.

## 1. Design decision

Use independent provider adapters behind one normalized metadata contract. Prefer this over a single generic search proxy because provider query semantics, rate limits, identifiers, and failure modes differ materially. A provider failure must not block results from another provider.

Initial provider order:
1. Crossref Works: DOI, title, author, journal, publisher, and publication metadata.
2. Semantic Scholar Academic Graph: scholarly paper metadata and author identifiers.
3. OpenAlex Works: broad scholarly discovery, enabled only after an explicit API-key and usage-budget configuration.

Provider results are candidates, not verified legal authority and not permission to republish.

## 2. Current provider constraints

### Crossref
- REST base: `https://api.crossref.org`; Works search is metadata discovery.
- Public pool currently documents 5 requests/second and concurrency 1.
- The current Crossref access/authentication page lists the polite pool as 10 requests/second with concurrency 3. A Crossref community update from December 2025 reports concurrency 5, so the published sources are not fully aligned.
- Include a valid `mailto` parameter or `agent` header to use the polite pool.
- A 429 response means the adapter must honor rate-limit guidance and retry only within a bounded policy.
- Current adapter requests are sequential in the discovery action and bounded; the per-admin durable rate limiter is enforced separately. Cross-instance provider concurrency coordination remains outstanding.
- Crossref metadata may include abstracts that are subject to copyright. Do not fetch or store abstract/full text by default.

Official references:
- https://www.crossref.org/documentation/retrieve-metadata/rest-api
- https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication
- https://community.crossref.org/t/updates-to-rest-api-rate-limits/14872

### Semantic Scholar
- Academic Graph API supports paper relevance search and explicit field selection.
- Search is relevance-ranked and limited to at most 1,000 results; the admin UI should request only a small first page (10–20).
- API keys, when configured, belong in the `x-api-key` header, never in query strings, logs, or client code.
- Unauthenticated requests can be throttled during heavy usage. Keep the adapter independently disableable and apply bounded concurrency.
- Request only metadata fields such as title, year, authors, venue, publication date, external IDs, and canonical URL. Do not request abstracts, snippets, or PDF content in this discovery phase.

Official references:
- https://api.semanticscholar.org/api-docs/
- https://webflow.semanticscholar.org/product/api

### OpenAlex
- Works API supports text search, filters, selected fields, and pagination.
- The current API documentation describes usage-based pricing and API keys. Do not assume that an unkeyed endpoint is an unlimited free production dependency.
- Enable only when `OPENALEX_API_KEY` and an explicit per-request usage budget are configured. Send the key through the Authorization header.
- Search and semantic search have different costs/limits; semantic search is not the default discovery path.
- Select only the metadata fields required for the candidate card.

Official references:
- https://help.openalex.org/api/
- https://help.openalex.org/api/searching/
- https://help.openalex.org/api/authentication/

## 3. Normalized candidate contract

Each adapter returns only:
- provider and provider record ID;
- canonical DOI, if present;
- title;
- author names (not inferred affiliations);
- publisher/venue;
- publication date or year, with original precision retained;
- source URL;
- source type;
- retrieved timestamp;
- provider-specific identifiers;
- a small provider provenance object.

Do not normalize unknown dates into invented exact dates. Preserve whether a provider supplied a year, month, or full date.

## 4. Rights and legal-quality boundary

- Every discovered source starts with `rights_status = unknown`.
- Metadata discovery does not establish copyright permission, legal validity, currentness, or authority.
- Do not fetch full text, abstracts, snippets, or PDFs in the initial discovery adapter.
- Do not treat an OpenAlex/Semantic Scholar/Crossref record as an official Iranian law, binding judicial precedent, or advisory opinion.
- Source classification must remain conservative: scholarly publication is secondary research unless an official primary source is separately verified.
- A candidate can be imported as metadata-only or link-only; full-text reuse requires separately recorded licence/permission evidence and human review.
- Search results must never auto-create a published article.

## 5. Duplicate detection

Use layered, explainable duplicate signals:
1. Exact normalized DOI match: definite duplicate.
2. Exact canonical URL match after safe normalization: definite duplicate.
3. Normalized title + publication year + first author: possible duplicate.
4. Fuzzy title similarity: show as a review hint only; never auto-merge or auto-reject.

Do not discard a candidate solely because its title resembles another record. Preprints, translations, versions, and republished works can be related without being identical.

## 6. Network and application safety

- Provider endpoints are fixed constants; users cannot supply arbitrary fetch URLs to provider adapters.
- Manual URL retrieval is a separate future capability and must defend against SSRF, DNS rebinding, private/loopback/link-local addresses, redirects to blocked hosts, oversized responses, and unsupported content types.
- Use a bounded timeout and response-body size limit.
- Do not follow redirects blindly; validate each redirect destination against the provider allowlist.
- Validate JSON shape and field lengths before returning any candidate.
- Redact provider credentials and upstream response bodies from logs and errors.
- Bound result count, query length, concurrency, and retry count.
- Use separate provider circuit-breaker state so one outage does not disable other adapters.
- Admin authorization must be checked server-side for every search action.

## 7. Persistence and workflow

Provider search itself is read-only. Search candidates are persisted in the administrator-only candidate queue; an administrator must explicitly select a candidate before import.

The implemented import action must:
1. Re-check administrator authorization.
2. Re-check provider identity and candidate shape server-side.
3. Resolve duplicate signals against existing `mavis_sources` and `mavis_articles`.
4. Create a source record with rights status `unknown` and full provenance.
5. Create a metadata-only article candidate/draft; never copy provider abstracts or full text by default.
6. Write an audit event.
7. Return the new draft/source IDs for review.

The source insert and draft creation should be one atomic database operation. Direct browser writes to CMS tables remain prohibited.

## 8. Implemented baseline and remaining sequence

Implemented and covered by application/database tests:
1. Crossref and Semantic Scholar metadata normalizers and fixed-endpoint adapters with bounded timeout, response-size limits, redirect rejection, and safe upstream error mapping.
2. Admin-only source search with a durable per-admin rate limiter and sequential provider requests.
3. Persisted candidate queue, duplicate-aware metadata-only import, atomic source/draft creation, rights defaulting to `unknown`, and audit events.
4. Explicit draft, review, approval, publication, unpublication, archive, restore, and rollback transitions bound to immutable versions.
5. Spreadsheet-compatible TSV export for the currently loaded filtered draft inventory.

Remaining engineering sequence:
1. Add cross-instance provider concurrency coordination and provider circuit-breakers before increasing search throughput.
2. Improve the editorial workspace into one coherent, keyboard-accessible RTL data workspace with clear bulk-safe actions, saved filters, and responsive detail editing.
3. Add richer field provenance and per-field AI-assisted completion with editable suggestions and human review.
4. Add a legally reviewed, SSRF-safe document retrieval pipeline only for sources whose licences or permissions explicitly allow it; do not infer rights from public availability.
5. Complete production migration parity, live provider checks, end-to-end publication tests, and scale benchmarks before declaring the editorial arm production-ready.

## 9. Explicit non-goals

- No crawling of arbitrary websites.
- No bulk downloading of academic corpora.
- No full-text extraction or PDF ingestion.
- No automated legal authority classification without primary-source verification.
- No AI-generated article publication.
- No automatic publication or public route switch.
- No Production migration or import without separate approval.
