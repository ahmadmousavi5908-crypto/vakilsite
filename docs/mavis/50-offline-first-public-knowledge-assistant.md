# MAVIS Offline-First Public Knowledge Assistant

**Status:** implementation slice, isolated from the legacy `/ai-assistant` route.

## Purpose
Provide a public, first-party, deterministic legal-information retrieval surface that remains usable when ChatGPT, external LLM APIs, and the network are unavailable after the user has downloaded the bundle once.

## Delivered boundary
- Static application at `/mavis-offline/index.html`.
- Scoped service worker; caches only the offline application shell and its public knowledge bundle.
- Local Persian normalization and deterministic ranking.
- Deterministic offline answer composition from the top retrieved record, with source-status labeling, topic-specific information prompts and a conservative no-match response; no missing legal facts are generated.
- Reuses canonical legal-library records and review labels.
- Adds query-only colloquial phrases to improve discovery without changing legal meaning.
- No server request for search, no LLM, no external API, no persistence of typed queries.
- No confidential intake data, uploads, case facts, or legal deadline calculations.

## Corpus at bundle generation
- 132 terms
- 16 law records
- 22 article summaries
- 19 subject categories
- 8 public service FAQs
- 5 source-reviewed research notes, all explicitly secondary-source-only
- 16-entry source registry covering official portals, secondary legal databases, news reports and research archives
- 350 curated query-only phrases in addition to the existing aliases and search phrases

The bundle also contains a sixteen-entry source registry that distinguishes official publication/legislation portals from secondary databases and research guides. Live availability of those source websites is not implied.

## Correct interpretation of offline
The application must be opened once online so the service worker can cache the static shell and dataset. Thereafter, the `/mavis-offline/` surface and local search can work without connectivity. This does not make the entire Next.js website, database, public intake submission, or external legal sources available offline.

## Legal safety
The UI must preserve each record's review status and notes. A search result is a retrieved record, not a legal opinion. Secondary-source-only and needs-review records must never be presented as verified current law. Primary-source verification, amendments, commencement, repeal and transitional rules remain explicit per-record research tasks.

## Operational acceptance
1. Cold visit with internet: shell and bundle load; service worker installs and precaches all required assets.
2. Reload with network disabled: route still opens and dataset loads.
3. Search Persian/Arabic Yeh/Kaf, Persian/Arabic digits, ZWNJ and common colloquial phrases.
4. Verify no fetch to `/api/mavis`, no LLM endpoint, and no query persistence.
5. Verify external source links are merely links and are not required for offline search.
6. Verify only the scoped offline route is controlled/cached.
7. On library release, increment cache version and regenerate bundle from canonical data.

## Known limits
- No generative reasoning, case-specific assessment, deadline calculation or legal strategy.
- Browser storage quotas and service-worker support vary by device; the app must clearly explain first-download requirements.
- Offline data can become stale. The bundle date and legal review status must remain visible.
- Offline public search is separate from authenticated lawyer research, private intake, and Growth Intelligence.
