# MAVIS Intake and Growth Foundation

Date: 2026-11-08

## Scope of this implementation slice

This branch adds three provider-independent, deterministic foundations: intake validation, cautious urgency triage, and growth metrics. It does not expose a public form, persist intake data, call external APIs, or publish SEO recommendations automatically.

## Public Intake boundary

- Validate minimum contact and matter-summary fields before any future persistence adapter.
- Case category and urgency use allowlists.
- Initial-review consent is required and distinct from optional marketing and third-party consent.
- No national identifier, bank credential, password, document upload, or unnecessary sensitive detail is requested by this validation contract.
- Validation success is not a submission receipt, engagement agreement, conflict check, limitation/deadline review, or legal assessment.
- The next persistence milestone requires a dedicated schema, RLS/grants, private storage policy, retention/deletion policy, audit events, abuse controls, and live database tests before activation.

## Lawyer-style initial triage boundary

- Lexical red-flag detection routes apparent deadlines, court notices, detention/liberty concerns and family-safety language to human review.
- It never calculates a deadline, assesses the merits, recommends a procedural step, or promises a response time.
- False negatives remain possible; this is a prioritization aid, not a legal risk classifier. All matters still require human review.

## Growth Intelligence boundary

- Accepts explicit Search Console-like aggregate metrics only; no connector or credential is assumed.
- Separates impressions, clicks, CTR, average position and qualified leads.
- Missing conversion or position data remains unknown, not zero.
- Opportunity score is a transparent internal sorting heuristic, not a Google ranking prediction or performance guarantee.
- No auto-publication, mass city-page generation, keyword stuffing, or fabricated competitor intelligence.

## Legal-source and answer policy

The legal corpus must prioritize the original promulgated text and official amendment/repeal evidence. Secondary databases and research guides are discovery aids only. The Library of Congress guide notes that some government links have been unavailable, so a listed official domain is not proof of current accessibility. WIPO Lex reproduces the Electronic Commerce Law; Articles 58–59 include explicit-consent and purpose/necessity/accuracy/access/correction/deletion principles for the relevant electronic personal-data processing. Before relying on those provisions in a live legal opinion, the Persian official text, amendments and current legal status must be checked.

## Release gates

1. Unit tests and static checks pass in CI.
2. Lawyer reviews intake wording, required fields, retention and consent.
3. Database migration is reviewed against the actual Mother Two schema; run pgTAP and RLS tests in an isolated Supabase project.
4. Browser test confirms no sensitive content is cached or written to local storage/service-worker caches.
5. Growth calculations are reconciled against real Search Console exports and conversion definitions.
6. Enable public intake only after server-side authorization, rate limiting, CSRF/origin controls, private storage and monitoring are verified.
