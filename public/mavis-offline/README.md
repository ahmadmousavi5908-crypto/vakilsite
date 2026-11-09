# MAVIS Offline Public Knowledge Assistant

## Scope
This is a separate, public, deterministic knowledge-retrieval and answer-composition surface. It does not modify or replace the legacy `/ai-assistant` page and does not share private intake data.

## Offline behavior
- The user must open `/mavis-offline/index.html` once while online and wait for the knowledge bundle to load.
- A scoped service worker caches only this standalone application and its public knowledge bundle.
- Subsequent searches and preliminary answer composition run locally in the browser. The top retrieved record is presented with its source status, a topic-specific information checklist and an explicit no-match response. No ChatGPT, LLM, external API, server-side search endpoint, or network request is required for search or answer composition.
- Network indication distinguishes the browser's network hint from actual MAVIS-origin reachability using a short-timeout, uncached same-origin health probe. If the server is unavailable, local public search remains available.
- Search text is not persisted and is not transmitted.
- Primary-document verification and current legal validity are separate states. Even when an exact primary document has been reviewed, the interface does not imply that later amendments or current validity were checked unless a valid primary-source review date and explicit validity flag are present.
- Only this offline knowledge surface is guaranteed by this service worker. The rest of the website, online intake, WhatsApp, and live legal-source checks are not guaranteed offline.

## Dataset
Generated from the existing legal-library corpus version 1.3.2. It reuses the existing 132 terms, 16 law records, 22 article summaries and 19 subject categories. 350 search-only colloquial phrases were added to improve recall; they do not assert legal equivalence or change legal definitions. A separate generated `published-articles.json` bundle is built from the site's canonical `src/data/articles.js` collection during `npm run dev` and `npm run build`; it adds the published article titles and educational text to local search without copying them into the legal-authority corpus. Every such record and outbound citation remains `secondary_source_only`, with primary-document and current-validity flags explicitly false. The service worker precaches this second bundle as part of the offline application. The bundle also includes a sixteen-entry source registry separating official publication/legislation portals from secondary databases and research guides. Existing review states, notes and sources are preserved. The national judicial decisions portal homepage was reachable on 2026-11-09; this is a landing-page access check only, not verification of any individual ruling or its legal effect. Every legal record carries conservative machine-readable provenance flags; the current bundle does not claim primary-source verification or current legal validity. Four law records include traceable links explicitly labeled as secondary or official-but-not-retrieved. Five additional research notes from the existing source-review report are searchable, retain secondary-only status, and include their individual citations and cautions.

## Safety
This is retrieval, not generated legal advice. It does not calculate deadlines, assess facts, determine current validity, or create a lawyer-client relationship. Unverified and secondary-source-only records remain visibly labeled. No sensitive client intake, case uploads, or browser storage is implemented.

## Update
When the source library changes, regenerate `knowledge.json` from the canonical dataset and increment the service-worker cache name in `sw.js`. Validate the bundle JSON and test a cold online visit followed by a genuine offline reload/search in a browser.
