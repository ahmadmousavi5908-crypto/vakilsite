# MAVIS Offline Corpus Provenance Audit — 2026-11-08

## Audit finding
The static corpus contains 132 terms, 16 law records, 22 article summaries, 8 service FAQs and 5 research notes transferred from the existing source-review report. Before this audit, every legal record had an empty `sources` array. Most law records had only a generic secondary homepage in `source_url`; the 22 article summaries were explicitly secondary-source-only. The registry listed official portals but did not connect them to individual legal records.

A source directory is not the same as a citation attached to the exact law or article.

## Changes in this delivery
- Added the Judiciary's official gateway and the National Judicial Decisions portal to the source registry, based on the official eAdl gateway's listing. Live access remains explicitly unverified.
- Added five research notes with individual source links, colloquial aliases, search phrases, findings and cautions. All remain secondary-source-only; no new legal rule was marked verified.
- Expanded the source registry to 16 entries, including secondary legal news and commentary sources.
- Added a versioned provenance policy with mandatory fields for primary-source verification.
- Added conservative machine-readable provenance to all 170 legal records (terms, laws and article summaries). No record is marked as current or primary-source verified.
- Added record-level traceable links for four law records where exact discovery URLs already existed in the dataset. Secondary links remain secondary; the Official Gazette URL is labeled identified but not retrieved.
- Kept existing review states; no record was upgraded.
- Added a CI validator for IDs, record counts, source references, HTTPS URLs and conservative provenance flags.

## What is still not verified
- Current validity and amendment/repeal status of all 16 laws.
- Full official texts and exact source citations for the remaining law records.
- Primary-source texts for the 22 article summaries.
- Every one of the 132 legal-term definitions.
- Live availability, terms of use, API availability and automated reuse permissions for source portals.

## Acceptance rule
A record can become `verified_primary_source` only after an exact document is retrieved, issuing authority and instrument number are recorded, publication and effective dates are separated, amendments/repeals and transitional rules are checked, a SHA-256 content hash is stored, and a named human reviewer approves it. A link to a portal homepage is never sufficient.

## Research evidence
The Judiciary gateway lists laws, circulars, advisory opinions, Supreme Court unifying opinions, Administrative Justice Court decisions and the National Judicial Decisions system. This supports using it as an official discovery gateway, not treating the gateway itself as the primary legal instrument. The source listing was retrieved on 2026-11-08; live page access and API/ingestion rights remain unverified.
