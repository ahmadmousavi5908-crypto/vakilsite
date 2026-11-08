# MAVIS Release Closure Runbook — 2026-11-09

**Purpose:** Close the remaining acceptance gaps with the smallest safe sequence. This is an operational runbook, not a release approval.
**Baseline:** Candidate branch `integration/mavis-mvp-candidate-20261108`, previously verified head `1307624d120f3fff99c94bf4d4bf1c30e883dd15`.
**Safety:** The updated Mother Two archive is a protected rollback artifact. Never overwrite, rename, delete, or use it as a working directory. No merge, production migration, OAuth activation, public Intake activation, or deployment is authorized by this document.

## 1. What is already evidenced

- Application and database CI passed on the exact baseline SHA above.
- Database workflow applied migrations 001–011 and passed six pgTAP files (167 assertions).
- Application workflow passed the legal-library validator, deterministic/offline checks, Intake and growth tests, lint, and Webpack build.
- Intake uses bounded JSON parsing, origin/content-type guards, rate limiting, idempotent submissions, and narrow RPC access.
- The offline legal bundle intentionally does not claim current-law verification.

A green CI result is evidence only for the checks actually executed. It is not proof of legal validity, real-device offline behavior, production configuration, or successful restore.

## 2. Final local verification (Termux — execute last)

**Do not run this step yet.** It is deliberately the final operator-side verification after remote code review, exact-SHA CI, legal/owner decisions, staging tests, and backup/restore checks are complete. Use a fresh directory. Do not reuse or overwrite the existing site workspace or any Mother Two backup.

```bash
cd ~/downloads
git clone --branch integration/mavis-mvp-candidate-20261108 --single-branch https://github.com/ahmadmousavi5908-crypto/vakilsite.git mavis-verification-20261109
cd mavis-verification-20261109
npm ci --no-audit --no-fund
npm run mavis:verify
```

**Pass evidence:** preserve the complete terminal output, command exit code 0, Node/npm versions, commit SHA, and available device/Android details. If any step fails, stop at the first failure, preserve its full output, and fix the root cause before continuing. Do not report a local pass until this output is reviewed.

The helper covers Python legal-library validation, all MAVIS Node tests, offline bundle/syntax validation, MAVIS lint, and a Webpack production build. It intentionally does not run pgTAP, staging failure injection, or physical-device offline tests.

## 3. Database and privacy acceptance in disposable staging

Run these only against a disposable staging project with synthetic data:

1. Verify anonymous, authenticated non-admin, and admin access separately.
2. Submit one valid intake; confirm exactly one private row and one expected audit record.
3. Retry with the same idempotency UUID and same payload; confirm the original receipt and no duplicate row.
4. Reuse that UUID with changed payload; confirm conflict and no second row.
5. Exercise invalid origin, wrong content type, malformed/oversized JSON, invalid fields, and rate-limit boundary.
6. Disable database connectivity; confirm an explicit 503 and no fabricated receipt.
7. Simulate LLM/provider failure; confirm deterministic validation and intake persistence remain independent.
8. Inspect application, database, and provider logs for PII, request bodies, fingerprints, secrets, and tokens.
9. Verify retention only after an owner-approved policy exists; test eligible and ineligible records with synthetic timestamps.
10. Restore a backup into a separate disposable project and verify schema, roles, expected synthetic rows, and storage objects separately.

Record environment, migration version, test data identifiers, timestamps, observed result, and reviewer. Never run destructive failure injection or restore against production.

## 4. Mother Two and database backups are different controls

- **Mother Two** protects the approved project source/workspace snapshot. Keep its archive and checksum unchanged.
- **Database backup** protects live Postgres data and schema. It does not automatically include objects stored through the Supabase Storage API; verify storage objects separately.
- A backup is not accepted merely because it exists or its checksum matches. A restore into a disposable target is the evidence that it can be recovered.
- Never commit database dumps, credentials, private intake data, or backup archives to this public repository.

Supabase's current backup guidance explains plan-dependent backup windows, logical dumps, Storage exclusions, and restore behavior: https://supabase.com/docs/guides/platform/backups
Supabase's backup workflow guidance explicitly warns against storing database dumps in a public repository and recommends testing restore, not just dump creation: https://supabase.com/docs/guides/deployment/ci/backups

## 5. Idempotency secret lifecycle

`MAVIS_INTAKE_IDEMPOTENCY_SECRET` is a server-only HMAC key and must be at least 32 characters. Keep it stable while any browser tab may retry an existing submission: the fingerprint is derived from this secret, so rotating it mid-retry-window can turn a legitimate retry into a conflicting-key response.

- Store it only in the deployment secret manager; never in `NEXT_PUBLIC_*`, source, browser storage, logs, or issue comments.
- Restrict access to the smallest operator set and record who changed it and when, without recording its value.
- Rotate only during a controlled maintenance window after active intake sessions and retry windows have expired, or after a separately tested versioned-key overlap implementation exists.
- After rotation, run a synthetic same-key/same-payload retry test and a changed-payload conflict test in staging.
- Do not invent a rotation interval without a documented threat model and operational owner.

## 6. Legal source verification: no shortcuts that counterfeit certainty

The offline corpus currently contains 175 legal records: 0 are fully verified against an exact primary document; 144 need legal review and 31 are secondary-source-only. These statuses must remain unchanged until evidence is actually collected and reviewed.

Use this order for each high-priority record:

1. Locate the exact document through the official issuing body or official publication.
2. Capture exact URL, issuing authority, instrument/decision number, official publication reference and date, effective date (or explicit unknown), and the exact document bytes.
3. Record retrieval timestamp and SHA-256 of the captured file.
4. Review amendment, repeal, replacement, transitional provisions, and temporal applicability.
5. Have a named legal reviewer compare the relevant text and approve the record with a review timestamp.
6. Only then update the canonical record and regenerate/validate the bundle. A secondary database or search result is discovery evidence, not primary verification.

Official discovery starting points:
- Official Judiciary gateway (its menu links to laws/regulations, Legal Department advisory opinions, Supreme Court unifying opinions, Administrative Justice Court decisions, and the National Judicial Decisions System): https://eadil.com/
- Official Gazette: https://www.rrk.ir/
- National Laws and Regulations portal: https://qavanin.ir/

The Judiciary gateway is useful for finding the responsible official system, but a gateway page is not the underlying legal instrument or judgment. Preserve that distinction in every citation.

**Practical batching:** begin with the 10 highest-impact records selected by legal counsel (not an arbitrary random sample), then review in small batches. Do not attempt to mark all 175 complete through bulk URL substitution or secondary-source scraping.

## 7. Retention, scheduler, and alerts

Migration 009 intentionally leaves retention policy unseeded. Do not guess a legal retention horizon. Before enabling purge:
- obtain written owner/legal approval for submission and audit retention periods;
- record the approval reference, effective date, and responsible owner;
- verify minimum-age and audit-cutoff guards in staging;
- select an execution mechanism supported by the deployed Supabase project/version;
- add observable last-success/failure state and an alert recipient;
- test failed-run recovery and prove that a rerun is idempotent.

Supabase Cron may be suitable, but availability and current behavior must be checked against the actual project before activation. No purge job is authorized by this runbook.

## 8. Growth integrations

Keep Google Search Console, Bing, Trends, and other providers read-only and inactive until each provider's current official OAuth documentation, scopes, redirect URI, token storage, refresh/revocation, quotas, and data-use terms have been reviewed. Use synthetic fixtures for empty, stale, partial, unauthorized, expired-token, quota, and timezone-boundary cases. Never treat an indexing request as proof of indexing or ranking.


## 10. Client fields, passwords, and offline behavior

The client intake and identity contract is in `docs/mavis/58-client-intake-and-identity-contract-2026-11-09.md`. The offline state contract is in `docs/mavis/59-offline-detection-and-private-data-boundary-2026-11-09.md`.

- Public intake remains passwordless and must reject unknown credential fields. Do not ask a visitor for a password or OTP.
- The tracking code and idempotency UUID are references only; neither authenticates a client.
- Do not activate a client workspace until office approval, identity verification, a configured verified-channel provider, tested MFA/session controls, and matter-level authorization are in place.
- If a password is enabled, the client chooses it after verified activation; the office never sees it. Apply NIST SP 800-63B-4: 15-character minimum for single-factor passwords, compromised-password blocklist, no composition rules, and no arbitrary periodic rotation.
- Phone OTP is passwordless but phone-number recycling and SIM-swap risks mean it must not be the only protection for sensitive case access. Require a second factor or stronger approved authenticator.
- Supabase passkeys are documented as experimental in the current 2026 docs; do not make them the sole production authentication path.
- Public offline knowledge search may run without network. Private client records, case uploads, messages, login, and account changes remain online-only. An offline page or cached browser session must never bypass server-side authentication or revocation.
- Offline status now uses an uncached same-origin connectivity probe with a 1.8-second timeout, separate from `navigator.onLine`. A failed probe must not disable local search.

## 9. Final release gate

Release readiness is **not achieved** until all applicable items below have evidence:

- [ ] Fresh Termux verification completed and reviewed on an exact commit.
- [ ] Real-device cold-online then airplane-mode test passed, including cache upgrade.
- [ ] Staging failure-injection and authorization/idempotency scenarios passed.
- [ ] Retention policy approved and purge/alert/recovery tested, or explicitly deferred with owner sign-off.
- [ ] Primary-source legal review completed for every record that claims verification.
- [ ] Privacy review confirms no PII in browser storage, public bundle, analytics, or logs.
- [ ] Disposable-target backup/restore and rollback drill passed, including Storage objects.
- [ ] Provider integrations individually approved and tested, or explicitly deferred.
- [ ] Both application and database CI workflows pass on the exact release candidate SHA.
- [ ] Owner explicitly approves merge, production migration, activation, and deployment as separate decisions.

**Do not convert pending human, legal, provider, or device gates into a percentage-based pass.** A defensible 100% means every agreed acceptance gate has evidence or an explicitly accepted deferral, not that every checklist box has been cosmetically changed to green.
