# MAVIS Offline Corpus Provenance Audit — 2026-11-08

## Audit finding
The static corpus contains 132 terms, 16 law records, 22 article summaries, 8 service FAQs and 5 research notes transferred from the existing source-review report. Before this audit, every legal record had an empty `sources` array. Most law records had only a generic secondary homepage in `source_url`; the 22 article summaries were explicitly secondary-source-only. The registry listed official portals but did not connect them to individual legal records.

A source directory is not the same as a citation attached to the exact law or article.

## Changes in this delivery
- Added the Judiciary's official gateway and the National Judicial Decisions portal to the source registry, based on the official eAdl gateway's listing. Live access remains explicitly unverified.
- Added five research notes with individual source links, colloquial aliases, search phrases, findings and cautions. All remain secondary-source-only; no new legal rule was marked verified.
- Expanded the source registry to 16 entries, including secondary legal news and commentary sources.
- Added a versioned provenance policy with mandatory fields for primary-source verification.
- Added conservative machine-readable provenance to all 175 legal records (132 terms, 16 laws, 22 article summaries and 5 research notes). No record is marked as current or primary-source verified.
- Added record-level traceable links to five law records and five research notes. Official URLs that have not been retrieved remain labeled as identified-but-not-retrieved; secondary links remain explicitly secondary.
- Kept existing review states; no record was upgraded.
- Added a CI validator for IDs, record counts, source references, HTTPS URLs and conservative provenance flags.

## What is still not verified
- Current validity and amendment/repeal status of all 16 laws.
- Full official texts and exact source citations for the remaining law records.
- Primary-source texts for the 22 article summaries.
- Every one of the 132 legal-term definitions.
- Live availability, terms of use, API availability and automated reuse permissions for source portals.

## Measured source coverage in the bundled dataset

The validated bundle contains 183 total records: 132 terms, 16 laws, 22 article summaries, 8 FAQs and 5 research notes. Of the 175 legal/research records (excluding FAQs), 10 have at least one attached source link and 165 have none. Those 10 records contain 25 source links in total. The 10 source-bearing records comprise 5 law records and 5 research notes; no term or article-summary record currently has an attached source. The registry contains 16 entries, all with live access explicitly unverified. No record is marked as primary-source verified or current-validity verified.

These counts describe provenance coverage, not legal correctness. The highest-value next step is to attach exact, record-specific sources in controlled batches, then verify each document under the acceptance rule below. Do not bulk-promote records based on a registry entry or portal homepage.

## Acceptance rule
A record can become `verified_primary_source` only after an exact document is retrieved, issuing authority and instrument number are recorded, publication and effective dates are separated, amendments/repeals and transitional rules are checked, a SHA-256 content hash is stored, and a named human reviewer approves it. A link to a portal homepage is never sufficient.

## Research evidence
The Judiciary gateway lists laws, circulars, advisory opinions, Supreme Court unifying opinions, Administrative Justice Court decisions and the National Judicial Decisions system. This supports using it as an official discovery gateway, not treating the gateway itself as the primary legal instrument. The source listing was retrieved on 2026-11-08; live page access and API/ingestion rights remain unverified.
