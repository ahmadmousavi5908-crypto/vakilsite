# MAVIS Intake and Growth Foundation

Date: 2026-11-08

## Scope of this implementation slice

This branch adds three provider-independent, deterministic foundations: intake validation, cautious urgency triage, and growth metrics. It does not expose a public form, persist intake data, call external APIs, or publish SEO recommendations automatically.

## Public Intake boundary

- Validate minimum contact and matter-summary fields before any future persistence adapter.
- Case category and urgency use allowlists.
- Initial-review consent is required and distinct from optional marketing consent and a third-party data notice acknowledgement. An acknowledgement by the submitter is not treated as consent from the third party.
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


## Public intake endpoint implementation boundary

The server route `POST /api/mavis/intake` is implemented but remains fail-closed unless `MAVIS_INTAKE_ENABLED=true`. It requires all of the following server-side settings before it can accept data:

- `SUPABASE_SECRET_KEY` using the current Supabase secret-key format; never a browser-exposed publishable key.
- `MAVIS_INTAKE_RATE_LIMIT_SECRET` with at least 32 characters for HMAC-SHA256 IP bucket pseudonyms.
- `MAVIS_INTAKE_IDEMPOTENCY_SECRET` with at least 32 characters, separate from the rate-limit secret, for keyed HMAC-SHA256 fingerprints of canonical validated submissions.
- `MAVIS_TRUST_X_REAL_IP=true` only when the hosting reverse proxy strips client-supplied `X-Real-IP` and overwrites it with the verified client address.
- `MAVIS_INTAKE_RETENTION_DAYS` explicitly approved and bounded to 1–3650 days; no default legal retention period is assumed.
- Consent text is versioned in code as `mavis-intake-v1-{retentionDays}d`; any change to the consent wording requires a version bump.

The route checks same-origin, JSON content type, an 8 KB streamed body cap, a UUID idempotency key, strict field allowlist, deterministic validation and triage, persistent database rate limit, and then calls the service-role-only idempotent RPC. The browser reuses the same in-memory request key for retries and clears it when the user edits the form; no sensitive form data or key is persisted to localStorage. The database unique constraint returns the original receipt for the same key and keyed request fingerprint, and rejects reuse of a key with different content. The previous non-idempotent service-role RPC is revoked. Database failure is returned as failure; no success receipt is emitted unless a tracking code is returned. Raw IP, name, phone and summary are never written to application logs by this route.

The endpoint is not active until all environment settings, migration 006, proxy behavior, approved retention schedule and live local Supabase CI have been verified. No public form or visual change is included in this implementation.


## Admin intake inbox

The existing `/admin/mavis` workspace now includes a private intake inbox. It reads through `GET /api/admin/mavis/intake` and changes only the workflow status through `PATCH`. Both routes require the current admin authorization check, the service-side secret client, the persistent admin rate-limit guard, and the database RPC's second admin-role check. The list is bounded to 50 rows per page, supports an allowlisted status filter, and the database records list views and status changes.

The inbox displays contact details and matter summaries only to authorized administrators. It does not calculate legal deadlines, accept files, edit submitted facts, or expose a public tracking lookup. It remains unavailable until Migration 006 is applied and the server-side secret key is configured.


## Gated public intake page

A standalone `/mavis/intake` page and compact responsive RTL form have been added without changing the homepage, contact dock, header or existing public design. The page is `noindex,nofollow`, is not linked from public navigation, and displays a disabled notice unless all server configuration gates are present. When enabled, it displays the exact versioned consent copy, independent optional marketing choice, third-party notice acknowledgement, retention period, strict field set and no-file/no-national-ID warning. It returns a tracking receipt only after the database confirms persistence.
