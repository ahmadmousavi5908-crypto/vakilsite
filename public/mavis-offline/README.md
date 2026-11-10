# MAVIS Offline Public Knowledge Assistant

## Scope
This is a separate, public, deterministic knowledge-retrieval and answer-composition surface. It does not modify or replace the legacy `/ai-assistant` page and does not share private intake data.

## Offline behavior
- The user must open `/mavis-offline/index.html` once while online and wait for the knowledge bundle to load.
- A scoped service worker caches only this standalone application and its public knowledge bundle.
- Subsequent searches and preliminary answer composition run locally in the browser. The top retrieved record is presented with its source status, a topic-specific information checklist and an explicit no-match response. No ChatGPT, LLM, external API, server-side search endpoint, or network request is required for search or answer composition.
- Search text is not persisted and is not transmitted.
- The offline bundle also includes a conditional intake form. It validates the user's answers locally and creates a faithful, structured message with a local reference code; no legal analysis is added. The form and draft can be prepared offline, but sending to the office requires internet and an explicit user action in WhatsApp.
- Intake answers are not sent to a server, database, analytics provider, or browser storage. The message is copied only after the user clicks a copy/send-preparation control. The user reviews it and presses Send in WhatsApp. No attachment upload is supported.
- The rest of the website, WhatsApp delivery, online intake persistence, and live legal-source checks are not guaranteed offline.

## Dataset
Generated from the existing legal-library corpus version 1.3.1. It reuses the existing 132 terms, 16 law records, 22 article summaries and 19 subject categories. 350 search-only colloquial phrases were added to improve recall; they do not assert legal equivalence or change legal definitions. The bundle also includes a sixteen-entry source registry separating official publication/legislation portals from secondary databases and research guides. Existing review states, notes and sources are preserved. Every legal record carries conservative machine-readable provenance flags; the current bundle does not claim primary-source verification or current legal validity. Four law records include traceable links explicitly labeled as secondary or official-but-not-retrieved. Five additional research notes from the existing source-review report are searchable, retain secondary-only status, and include their individual citations and cautions.

## Safety
This is retrieval, not generated legal advice. It does not calculate deadlines, assess facts, determine current validity, or create a lawyer-client relationship. Unverified and secondary-source-only records remain visibly labeled. No sensitive client intake, case uploads, or browser storage is implemented.

## Update
When the source library changes, regenerate `knowledge.json` from the canonical dataset and increment the service-worker cache name in `sw.js`. Validate the bundle JSON and test a cold online visit followed by a genuine offline reload/search in a browser.
