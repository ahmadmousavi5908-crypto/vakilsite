# Low-Friction Legal Source Verification Workflow

**Date:** 2026-11-08  
**Applies to:** MAVIS legal corpus and offline knowledge bundle  
**Status:** Research-backed operating procedure; no legal record is verified by this document.

## 1. Objective

Raise legal-source reliability without building a crawler, buying a database, adding a vector store, or depending on an undocumented API. Use the existing legal-library records, a small review ledger, official web pages, and explicit human approval.

The workflow is incremental: verify high-impact statutes first, then amendments and implementing instruments, then judicial materials, then explanatory articles and legal-term definitions.

## 2. Evidence observed during this research pass

| Source | Observed evidence | Safe conclusion |
|---|---|---|
| National Laws and Regulations Portal (https://qavanin.ir/) | On 2026-11-08, the root page returned a transfer/redirect notice. An external law-research guide identifies a stable Civil Code record URL on this portal. | Keep as the first discovery/cross-check route; do not claim every record or endpoint is currently accessible. |
| Official Gazette (https://www.rrk.ir/) | A 2024 report by Ekhtbar described a new site structure and gave the candidate endpoint https://rrk.ir/ords/r/rrs/rrs-front/home. A live fetch of that candidate timed out in this research pass. | Record the candidate URL for manual browser verification only. Do not mark the endpoint live or supported. |
| Parliament Research Center (https://rc.majlis.ir/fa/law) | A live fetch returned a gateway error in this research pass. | Retain as a secondary official legislative-research route; access remains unverified. |
| ecoi Iran law guide | Explicitly warns that its guide is a starting point and does not replace independent verification of currency, validity, or accuracy. It points to qavanin.ir and example law records. | Use only for discovery and cross-checking, never as the final legal authority. |

Research links:
- https://qavanin.ir/
- https://www.rrk.ir/
- https://rrk.ir/ords/r/rrs/rrs-front/home
- https://rc.majlis.ir/fa/law
- https://www.ekhtebar.ir/نشانی-جدید-سایت-روزنامه-رسمی/
- https://www.ecoi.net/en/countries/islamic-republic-of-iran/law-guide/
- https://qavanin.ir/Law/TreeText/178971

A redirect, timeout, gateway error, search result, or third-party report is not proof that an official service is permanently unavailable. Recheck manually before changing source status.

## 3. Two implementation paths considered

1. **Automated crawler/API integration now:** higher maintenance, uncertain permissions and endpoints, brittle against site changes, and unnecessary before source contracts are confirmed.
2. **Human-in-the-loop verification ledger:** uses the current corpus and ordinary browser research, produces auditable evidence, and can later feed a permitted connector.

**Selected:** path 2. It is cheaper, easier to test, and avoids inventing an API or bypassing access controls.

## 4. Verification queue and order

### Batch A — 16 law records
For each law, capture:
1. Exact official document or official publication page.
2. Issuing authority and instrument number.
3. Approval, notification, publication, and effective dates as separate values where available.
4. Official Gazette issue/date/page or equivalent permanent official identifier.
5. Amendment, addition, repeal, replacement, corrigendum, and transitional provisions.
6. Retrieved timestamp and original URL.
7. SHA-256 of the retrieved document bytes or a lawful, stable text snapshot.
8. Reviewer identity, review timestamp, and unresolved questions.

Start with the most-used foundational laws and laws with immediate client impact. Do not infer priority from search volume alone; the lawyer sets the order.

### Batch B — amendments and implementation
Build explicit relations from each base law to its amendment, repeal, regulation, circular, and competent issuing authority. Check whether a later instrument changes only selected articles or the entire law.

### Batch C — judicial and interpretive materials
Keep Supreme Court unifying opinions, published judgments, Administrative Justice Court decisions, advisory opinions, and judicial نشست‌ها in distinct classes. Record court/authority, number, date, publication reference, and legal effect. Never label a judgment or advisory opinion as a statute.

### Batch D — 22 article summaries and 132 legal terms
Attach each summary to the exact legal provisions and sources it explains. A secondary article may support discovery, but cannot prove the underlying rule. Terms inherit no verified status merely because a linked statute was checked; verify each definition's legal basis separately.

## 5. Smallest useful review ledger

Use one row per legal record and one row per source document. The canonical corpus remains the source of truth; the ledger is a review queue, not a parallel knowledge base.

Minimum fields:
- record_id, source_id, source_class
- official_url, document_identifier, issuing_authority
- approved_at, notified_at, published_at, effective_from, effective_until
- amends_source_ids[], repeals_source_ids[], replaces_source_ids[]
- retrieved_at, retrieval_method, content_sha256
- verification_status, reviewer_id, reviewed_at, review_notes

Do not store a status without its evidence. Keep the source snapshot immutable; a later correction creates a new snapshot and review event.

## 6. Conservative status transitions

- discovered: candidate source found; no claim about authority or currentness.
- official_endpoint_identified: official domain/authority identified, but exact document not retrieved.
- retrieved_unreviewed: exact document retrieved and hashed; legal review not complete.
- verified_primary_source: exact primary document, identifiers, dates, legal relationships, hash, and human approval are all present.
- needs_official_check: evidence is incomplete or conflicting.
- secondary_source_only: only a secondary source supports the record.
- outdated: superseded or repealed for the relevant period, with replacement/repeal evidence linked.
- not_found: bounded search completed and documented; not a synonym for inaccessible.

No automatic promotion between these states. A validator may reject missing evidence, but only a named reviewer may approve legal verification.

## 7. Low-cost operating cadence

1. Review 3–5 high-impact records per session, not all 175 at once.
2. Search qavanin first for discovery and consolidated text; cross-check the original publication in the Official Gazette and the competent issuing authority.
3. If an official page cannot be reached, record the attempt and stop. Use secondary sources only to identify the next official document to seek.
4. Ask the reviewer to resolve only concrete conflicts: date, article text, amendment chain, competence, or legal effect.
5. Regenerate the offline bundle only after approved canonical-corpus changes; increment the service-worker cache version and run existing validators/tests.
6. Publish no legal record as current merely because it passed JSON validation or was found in a search engine.

## 8. Acceptance gates

A record may be labeled verified_primary_source only when all are true:
- exact primary document is retrieved from the issuing authority or official publication channel;
- authority, instrument identifier, and source class are recorded;
- publication and effective dates are distinguished;
- amendments/repeals and transitional provisions are checked or explicitly marked not applicable with rationale;
- content hash and retrieval timestamp are stored;
- named human reviewer and review timestamp are present;
- no unresolved material conflict remains.

A technically valid bundle is not the same as a legally verified corpus. Keep those two quality dimensions separate in dashboards and release notes.

## 9. Explicit non-goals

This workflow does not authorize scraping at scale, bypassing CAPTCHA/authentication/rate limits, undocumented API use, bulk republication of copyrighted commentary, automatic legal advice, or automatic publication. Confirm terms and permissions before any automated ingestion.

## 10. Current baseline

The 2026-11-08 corpus audit found 175 legal records (terms, laws, articles, research notes), 0 exact primary documents verified, and 0 current-validity verifications. This workflow defines the least-complex path to improve that baseline without overstating progress.
