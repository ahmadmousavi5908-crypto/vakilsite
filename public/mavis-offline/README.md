# MAVIS Offline Public Knowledge Assistant

## Scope
This is a separate, public, deterministic knowledge-retrieval surface. It does not modify or replace the legacy `/ai-assistant` page and does not share private intake data.

## Offline behavior
- The user must open `/mavis-offline/index.html` once while online and wait for the knowledge bundle to load.
- A scoped service worker caches only this standalone application and its public knowledge bundle.
- Subsequent searches run locally in the browser. No ChatGPT, LLM, external API, server-side search endpoint, or network request is required for search.
- Search text is not persisted and is not transmitted.
- Only this offline knowledge surface is guaranteed by this service worker. The rest of the website, online intake, WhatsApp, and live legal-source checks are not guaranteed offline.

## Dataset
Generated from the existing legal-library corpus version 1.3.1. It reuses the existing 132 terms, 16 law records, 22 article summaries and 19 subject categories. Search-only colloquial phrases were added to improve recall; they do not assert legal equivalence or change legal definitions. Existing review states, notes and sources are preserved.

## Safety
This is retrieval, not generated legal advice. It does not calculate deadlines, assess facts, determine current validity, or create a lawyer-client relationship. Unverified and secondary-source-only records remain visibly labeled. No sensitive client intake, case uploads, or browser storage is implemented.

## Update
When the source library changes, regenerate `knowledge.json` from the canonical dataset and increment the service-worker cache name in `sw.js`. Validate the bundle JSON and test a cold online visit followed by a genuine offline reload/search in a browser.
