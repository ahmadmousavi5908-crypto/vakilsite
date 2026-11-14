# MAVIS Source Discovery — Adapter and Rights-Safe Design

**Status:** Research-backed implementation contract; no provider adapter is active yet.  
**Priority:** Next CMS vertical slice after authenticated draft inventory/editor.  
**Scope:** Metadata discovery only. No full-text or PDF fetching, importing, approval, or publication.

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
- Polite pool currently documents 10 requests/second and concurrency 5; include a valid `mailto` parameter or `agent` header.
- A 429 response means the adapter must honor rate-limit guidance and retry only within a bounded policy.
- Initial implementation should be more conservative than the published ceiling: one in-flight request per process and bounded retries.
- Crossref metadata may include abstracts that are subject to copyright. Do not fetch or store abstract/full text by default.

Official references:
- https://www.crossref.org/documentation/retrieve-metadata/rest-api
- https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication

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

Discovery is read-only. Search results remain transient until an administrator explicitly selects a candidate.

The future import action must:
1. Re-check administrator authorization.
2. Re-check provider identity and candidate shape server-side.
3. Resolve duplicate signals against existing `mavis_sources` and `mavis_articles`.
4. Create a source record with rights status `unknown` and full provenance.
5. Create a metadata-only article candidate/draft; never copy provider abstracts or full text by default.
6. Write an audit event.
7. Return the new draft/source IDs for review.

The source insert and draft creation should be one atomic database operation. Direct browser writes to CMS tables remain prohibited.

## 8. Implementation sequence

1. Build pure provider normalizers and fixtures.
2. Add injected-fetch adapters with timeout, response-size, and retry guards.
3. Add provider-specific tests for empty results, malformed JSON, 429, 5xx, timeout, invalid fields, and partial provider failure.
4. Add an admin-only search action with per-provider enablement and server-side rate limits.
5. Add transient candidate cards and explicit metadata-only import.
6. Add an atomic import RPC and pgTAP tests for duplicate handling, rights defaults, audit events, and draft-first invariants.
7. Only after the above, evaluate any AI-assisted field completion. AI suggestions remain editable and never publish.

## 9. Explicit non-goals

- No crawling of arbitrary websites.
- No bulk downloading of academic corpora.
- No full-text extraction or PDF ingestion.
- No automated legal authority classification without primary-source verification.
- No AI-generated article publication.
- No automatic publication or public route switch.
- No Production migration or import without separate approval.
