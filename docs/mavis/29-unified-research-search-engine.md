# MAVIS Unified Research Search Engine

**Status:** Architecture baseline plus first local-index implementation in PR #119.  
**Decision:** MAVIS owns the search experience, local archive, normalized records, ranking, provenance, and editorial workflow. External providers are replaceable discovery inputs, not the search engine itself.

## Product goal

Provide one administrator workspace where a researcher can:
- Search a topic, exact title, author, DOI, phrase, or keywords.
- Search records already stored in MAVIS without calling external providers.
- Discover recent scholarly metadata from a small set of reputable online sources.
- Compare, filter, deduplicate, inspect provenance, and select records.
- Complete missing metadata manually, preserve field-level provenance, and create an editorial draft.
- Work with a local research collection when disconnected, without making the hosted CMS or remote database a dependency of that offline workspace.
- Publish only after human editorial and rights review.

## Architecture boundaries

### 1. MAVIS-owned search core

The internal core owns:
- One query interface and normalized result model.
- Local archive indexing and relevance ranking.
- Duplicate detection and cross-provider identity resolution.
- Saved searches, filters, tags, and research collections.
- Field provenance: original value, source, retrieval time, confidence/verification state, and editor override.
- Draft creation and human-controlled publication.

Provider adapters must never own the article editor or publication process.

### 2. Online discovery

Initial adapters remain limited to:
- Crossref for DOI and bibliographic metadata.
- Semantic Scholar for scholarly discovery metadata.
- OpenAlex for broad scholarly coverage, behind its existing server-side daily spend cap.

Do not add providers merely to increase their count. Add one only when a demonstrated coverage gap exists. Search metadata only by default. Abstracts, full text, PDFs, and images require separate legal, technical, and cost review.

### 3. Connected local archive (implemented first)

Migration 017 adds PostgreSQL full-text indexes over:
- MAVIS article title, excerpt, tags, and structured article content.
- Registered source metadata.
- Persisted source-discovery candidates.

The admin-only `search_mavis_local_archive` RPC searches those records without contacting an external provider. GIN indexes support the local full-text query. This mode still requires access to the hosted MAVIS application and database; it is provider-independent, not disconnected-device offline mode.

### 4. True offline research workspace (next implementation phase)

A genuinely offline workspace must continue working after network access is lost. It must not silently label a remote database query as offline.

Proposed design:
- Installable PWA shell with only the minimum research workspace assets cached.
- Device-local IndexedDB collection for documents, extracted text, metadata, tags, and the local inverted index.
- Encryption at rest for private research collections; unlock with a user-held passphrase and Web Crypto-derived key. Never persist the passphrase or raw encryption key.
- Import/export of a portable encrypted research bundle for backup and transfer between devices.
- Explicit distinction between device-local records and records synchronized to the hosted CMS.
- Conflict-aware sync after reconnection; local edits must not overwrite a newer server version silently.
- First document formats: TXT, Markdown, and text/HTML exports. Add PDF parsing only after selecting and testing a maintained parser and reviewing its licensing, bundle size, and browser memory behavior.
- No caching of admin credentials, access tokens, private CMS responses, or unpublished article bodies in the service worker cache.

Offline mode must show its storage location and last synchronization time. If the device-local collection is empty, it must not imply that the full cloud archive is available.

## Result and metadata model

Each result should expose:
- Record type and stable local ID.
- Title, authors, publication date with original precision, venue/publisher, DOI, canonical URL.
- Provider/source and retrieval timestamp.
- Per-field provenance and verification state.
- Rights status and evidence reference; default is unknown.
- Local availability (metadata only, text available, file available, or not stored).
- Editorial state and a safe action to open the record or create a draft.

Unknown values remain unknown. Do not fabricate dates, publishers, author affiliations, citations, legal authority, or licences.

## Editorial workflow

`Search → Compare → Select → Import metadata → Complete fields → Rights review → Draft → Editorial review → Explicit approval → Publish`

- Candidate import remains metadata-only.
- Imported candidates start as drafts with rights unknown.
- No automatic article text copying, approval, or publication.
- The public website continues to expose published records only.
- Each edit must preserve immutable version history and audit provenance.

## Search behavior

- Search across local title, article body, authors, venue, publisher, DOI, and stored source metadata.
- Rank exact title/DOI matches above general body matches.
- Support phrase search and simple filters for source, date, document type, rights, and editorial state.
- Deduplicate exact DOI and canonical URL; fuzzy title matches remain review hints.
- Keep online provider failures isolated so local search remains available.
- Keep online and local result origins visibly distinct.

## Delivery sequence

1. **Completed in this branch:** admin-only local full-text index and RPC over existing article/source/candidate records; separate UI mode from online discovery.
2. **Next:** field-level provenance model and spreadsheet-style comparison/editing of selected candidates.
3. **Next:** true device-local PWA collection with encrypted IndexedDB, import/export, and offline search.
4. **Next:** PDF extraction and permitted document ingestion, only after library and rights review.
5. **Later:** controlled synchronization between device-local collections and the hosted CMS, plus performance tests on realistic archive sizes.

## Non-goals

- No broad crawler or arbitrary-URL fetch proxy.
- No paid search infrastructure before local indexing proves insufficient.
- No API key required for the local search core.
- No automatic republication of third-party material.
- No claim of true offline availability until the PWA shell, local encrypted storage, and disconnected-device tests are implemented.
