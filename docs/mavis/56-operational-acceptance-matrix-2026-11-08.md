# MAVIS Operational Acceptance Matrix — 2026-11-08

**Status:** Engineering acceptance plan; not a release approval.  
**Scope:** Public offline knowledge, legal evidence, intake, database controls, and growth intelligence.

## Workstream A — Legal evidence quality

| Gate | Check | Pass condition | Current state |
|---|---|---|---|
| Source classification | Separate primary publication, official portal, official issuing authority, judicial decision, advisory opinion and secondary commentary | No source-class conflation | Implemented in corpus contract; review continues |
| Exact-document provenance | URL, authority, instrument number, publication reference/date, effective date, amendments/repeals, retrieval time, SHA-256, reviewer and review time | All required fields present | Not yet populated for verified records |
| Verification label | Run the primary verification contract for every record labeled verified | Incomplete evidence is rejected | Added to candidate; CI pending |
| Current validity | Check amendments, repeal, transitional clauses and time scope | Named reviewer approves each record | Pending legal review |

## Workstream B — Offline reliability

1. Open /mavis-offline/index.html online in a clean browser profile.
2. Wait for the app shell and full knowledge bundle to load; record bundle version and cache name.
3. Confirm service-worker registration and that all required assets are cached.
4. Switch the device/browser to airplane mode or fully disable network access.
5. Reload the offline route, search Persian and Arabic variants, test a known hit, a no-match query, and an answer with source-status disclosure.
6. Confirm that searches work without network calls and that query text is not persisted.
7. Restore network, update the bundle in a test branch, and verify cache-version replacement without stale results.
8. Record device, browser/version, timestamp, bundle hash, test cases, screenshots/logs, and outcome.

**Pass:** all required assets load from cache; search and answer composition remain deterministic; no hidden network dependency; no stale bundle after an approved version update.  
**Current state:** automated syntax/search/shell/answer tests pass in CI; genuine device airplane-mode test remains pending.

## Workstream C — Public intake and database safety

| Scenario | Expected behavior |
|---|---|
| Valid intake request | Server validates allowlisted payload, persists private record, returns tracking reference |
| Invalid or oversized body | Clear 4xx response; no partial record |
| Missing/invalid Origin | Request rejected according to route policy |
| Rate limit reached | Bounded 429 response; no persistence |
| Database unavailable | Explicit failure; never return a fake success or tracking reference |
| LLM quota/provider outage | Intake validation, persistence, checklist and tracking remain independent of LLM |
| Unauthorized admin | No private record or audit data disclosed |
| Retention/purge | Only policy-eligible records purged; audit cutoff is bounded by an approved retention policy and cannot be chosen ad hoc |

**Pass:** integration tests prove each failure path, RLS/grants and server authorization agree, no private payload is emitted to logs or public responses, and an approved scheduler runs retention purges with observable last-success/failure state and alerting.  
**Current state:** Both the application workflow and isolated Supabase/pgTAP workflow passed on exact candidate commit `8781f16f5a3907bd5e3588f9097bc185694ec03b` (application run `42505648719`; database run `42505653385`). The admin intake inbox has an independent per-admin rate-limit counter and dedicated response parser. Migration 009 creates an owner-controlled retention policy table but deliberately seeds no policy; purge fails closed until an approved policy is recorded and enabled, enforces minimum submission age independently of each record's expiry timestamp, and rejects audit cutoffs shorter than the approved minimum. A follow-up pgTAP change now exercises authenticated admin/non-admin JWT contexts, the 30-request boundary, and counter separation; its new commit must pass both workflows before its tests are accepted. No scheduler or operational alerting is enabled. Local device/staging failure-injection remains pending.

**Scheduler candidate (research only):** Supabase Cron (`pg_cron`) can run database functions directly and records job-run history in `cron.job_run_details`; confirm project/version availability and the current feature stage before enabling it. Do not schedule the purge until the audit-retention policy and safe cutoff are approved.

## Workstream D — Growth intelligence

1. Keep provider adapters read-only until official OAuth scopes, redirect URIs, token storage and revocation are approved.
2. Distinguish provider data freshness, import time, query period and attribution window.
3. Track impressions, clicks, CTR, average position, landing page, query, indexation request, observed indexation and conversion as separate measures.
4. Never equate an indexing request with successful indexing or ranking.
5. Every recommendation must include evidence, confidence, expected impact, implementation cost and a human approval state.
6. Test empty data, stale data, partial provider responses, quota errors, invalid credentials and timezone boundaries.

**Pass:** metrics are deterministic from fixtures; provider failures are typed and visible; no content is generated or published automatically.  
**Current state:** metrics and Search Console parsing adapter tests exist; live OAuth/provider verification is not enabled.

## Cross-workstream release gate

- [ ] CI green on the exact candidate commit.
- [ ] Local Termux npm ci, legal-library validator, MAVIS tests, lint and production build.
- [ ] Cold-online then true-offline browser/device test.
- [ ] Staging tests for DB outage, rate limit, unauthorized access and data retention.
- [ ] Obtain owner/legal approval for minimum submission and audit retention periods; record the approval reference and enable the private retention policy only after review.
- [ ] Configure and verify a scheduled retention-purge mechanism only after policy approval, including failure alerting and a documented recovery path.
- [ ] Legal reviewer has approved each record that claims primary-source verification.
- [ ] Privacy review confirms no sensitive intake data in browser storage, public bundle, analytics or logs.
- [ ] Backup/restore and rollback procedure tested against a disposable staging environment.
- [ ] Explicit owner approval before merge, production migration, activation or deployment.

A green CI run proves only the checks executed by that workflow on that commit. It does not prove legal currency, device-offline behavior, production security, provider connectivity, or deployment readiness.
