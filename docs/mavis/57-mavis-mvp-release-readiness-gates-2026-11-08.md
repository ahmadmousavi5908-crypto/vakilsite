# MAVIS MVP release-readiness gates

**Snapshot:** 2026-11-08  
**Purpose:** Define what “100% complete” means for the first production-capable MAVIS release. This is an acceptance contract, not a claim that production is ready.

## 1. Definition of 100%

MAVIS is 100% complete for the MVP only when every mandatory gate below has:
- an identified owner and environment;
- reproducible test evidence;
- a recorded result and timestamp;
- no unresolved critical/high security or data-integrity issue;
- a documented rollback path.

A green GitHub workflow alone is not production readiness. CI, local integration, staging verification, production configuration, and user acceptance are separate gates.

## 2. Current remote evidence

| Workstream | Current evidence | Remaining gate |
|---|---|---|
| Database/security (PR #18) | Isolated Supabase CI applied migrations 004–006 and passed 115 pgTAP assertions across four test files | Repeat after final CI log-redaction change; review live project schema/grants before any staging migration |
| Deterministic retrieval (PR #17) | Latest known head passed dataset validation, tests, lint and production build | Verify combined branch after controlled integration and local Mother Two reconciliation |
| Public Intake and Growth (PR #23) | Latest known CI passed tests, lint and production build after fixing admin API import paths | New official integration contract document must pass latest CI; configure no external provider until owner authorizes it |
| Legal evidence and dossier (PR #24) | Latest known CI passed legal evidence, dossier, lint and production build | Populate only lawyer-verified primary evidence; verify complete combined integration |
| Offline assistant (PR #19) | Latest known CI passed offline bundle, search, answer, syntax, lint and production build | Cold-online first visit followed by airplane-mode browser/device test |
| Master documentation (PR #16) | Draft documentation PR; no merge | Reconcile and approve documentation against the final integrated implementation |

All PRs remain Draft and unmerged. The CI database is ephemeral and isolated. No production migration, live OAuth connection, production deployment, or production activation is recorded as complete.

## 3. Mandatory release gates

### Gate A — Mother Two and source reconciliation

- Retrieve the approved Mother Two archive and verify its recorded SHA-256.
- Compare the local workspace, remote integration branch, and every feature branch.
- Produce a complete manifest of files, hashes, branch heads, and intended changes.
- Preserve the approved public website appearance and existing legal-library datasets.
- No broad reset, overwrite, rebase, or merge without an explicit backup and reviewed diff.

**Pass evidence:** verified archive hash, manifest, clean working tree, documented integration map.

### Gate B — Unified code integration

Required order:
1. Database/security migrations and tests (PR #18).
2. Deterministic retrieval and admin workspace (PR #17).
3. Public Intake and Growth foundations (PR #23).
4. Legal evidence provenance and dossier (PR #24).
5. Offline public knowledge assistant (PR #19).
6. Documentation reconciliation (PR #16).

- Resolve workflow-file overlaps deliberately; do not merge multiple independent workflow edits blindly.
- Run one combined CI pipeline on the exact integration commit.
- Run full production build, all MAVIS unit tests, lint, dataset validation and database tests.
- Verify route inventory and confirm that existing public routes and styles have not regressed.

**Pass evidence:** one integration commit SHA, all PRs reviewed, combined CI green, no unresolved conflicts.

### Gate C — Database and authorization

- Review migration order, SQL function signatures, owner/security-definer behavior, empty search_path, grants, RLS and exposed-schema configuration.
- Confirm `mavis_intake_private` is not exposed through Supabase Data API.
- Confirm anon/authenticated cannot directly read or write intake, audit or rate-limit tables.
- Confirm server-only service credentials are not imported into client bundles.
- Verify admin authorization in the route and again inside database RPCs.
- Verify rate limits fail closed, counters are atomic, and audit events do not contain names, phone numbers, case summaries, tokens or raw IP addresses.
- Confirm retention periods and audit-retention rules have explicit approval before enabling intake.
- Apply migrations only to a verified staging project after backup and approval; never use production as the first test target.

**Pass evidence:** staging migration log, role/privilege matrix, RLS tests, negative access tests, backup/rollback proof.

### Gate D — Public Intake safety and usability

- Keep the route disabled by default until all configuration gates pass.
- Verify trusted reverse-proxy IP handling and HMAC secret rotation.
- Verify explicit consent version, retention period, phone normalization, payload allowlist and request-size limit.
- Verify no false success when database/rate-limit services fail.
- Verify tracking code, admin inbox, pagination, status update and audit event end to end.
- Confirm sensitive data is never persisted in browser storage or exposed in public responses.
- Obtain explicit approval for retention duration and consent wording.

**Pass evidence:** staging end-to-end test with synthetic data, failure-mode tests, approved consent/retention policy, no sensitive logs.

### Gate E — Lawyer Copilot evidence quality

- Keep retrieval, evidence classification, and legal answer generation as separate stages.
- Verify primary sources from official publication/legislation portals and record exact citations, access dates, amendments, repeals and current validity.
- Do not promote a source because its domain looks official or a secondary source links to it.
- Distinguish law text, amendments/repeals, executive regulations, unifying opinions, published judgments, Administrative Justice Court decisions, advisory opinions, judicial sessions, academic commentary and official guidance.
- Surface “not found in the current library” without claiming that a source does not exist.
- Do not enable legal answer generation until evidence sufficiency, citation traceability, freshness and lawyer review gates are satisfied.

**Pass evidence:** lawyer-reviewed gold dataset, source-by-source provenance audit, citation correctness test set, zero invented citations, human-review workflow.

### Gate F — Growth Intelligence provider integrations

- Keep current Search Console adapter deterministic and fixture-driven until OAuth credentials are explicitly approved.
- Use the minimum Google scope `webmasters.readonly` for analytics.
- Respect Search Analytics date semantics, aggregation, pagination, incomplete-data metadata and provider quotas.
- Implement Bing against current REST documentation only; do not build legacy SOAP/POX integrations (Microsoft's documented retirement date was 2026-08-31).
- Treat IndexNow as a URL notification, not proof of crawl, indexing or ranking.
- Submit only approved canonical article URLs; store provider responses and retry with bounded, idempotent jobs.
- Keep every external refresh request-driven by an administrator.

**Pass evidence:** authorized live read-only requests, verified property ownership, quota/error tests, privacy review, source timestamps and disconnect/revocation test.

### Gate G — Offline assistant

- Validate the bundle and source provenance at build time.
- Open the offline route once while online; wait for service worker activation and cache completion.
- Switch the actual Android and desktop browser to airplane mode and test search, answer composition, missing-result state and source warnings.
- Confirm the offline route never claims the rest of the site, intake, WhatsApp or live source verification is offline.

**Pass evidence:** recorded cold-online-to-offline browser test on target devices.

### Gate H — UX, accessibility and regression

- Preserve the approved public website appearance.
- Test desktop, Android mobile and narrow screens.
- Verify RTL layout, keyboard access, focus visibility, labels, error messages, contrast and screen-reader semantics.
- Verify public Intake remains noindex until intentionally released.
- Test admin search, dossier, intake inbox and article-management workflows without leaking private data.

**Pass evidence:** screenshot comparison, responsive test matrix, accessibility review, no critical visual regression.

### Gate I — Production operations

- Configure production secrets through the hosting secret manager only.
- Verify domain, canonical URL, HTTPS, redirects, robots/sitemap, CSP/security headers and error monitoring.
- Set per-arm budgets, bounded retries, idempotency keys, job checkpoints and alert thresholds.
- Verify backups, restore drill, incident response, secret rotation/revocation and rollback.
- Deploy first to staging, run smoke tests, then obtain explicit production deployment approval.
- Monitor request success, database errors, rate limiting, indexing notifications, observed indexing and provider quota separately.

**Pass evidence:** staging sign-off, production change approval, successful deployment SHA, smoke tests, monitoring and rollback drill.

## 4. Non-negotiable stop conditions

Stop release if any of the following is true:
- a private schema/table is exposed to public or ordinary authenticated clients;
- a service secret or personal intake value appears in browser assets or logs;
- intake returns success without a committed database receipt;
- legal citations or current validity are inferred rather than verified;
- a failed provider refresh blocks deterministic/local features;
- production migration is attempted without a verified backup and staging result;
- public-site appearance changes without approval.

## 5. Progress reporting rule

Report separate percentages for:
1. code and automated tests;
2. branch integration;
3. local Mother Two verification;
4. staging and security acceptance;
5. legal evidence quality;
6. external provider activation;
7. UX/offline verification;
8. production operations.

Do not collapse these into one optimistic number. The overall percentage is 100 only when every mandatory release gate is passed. Future optional features beyond the agreed MVP are tracked separately and do not distort the MVP completion score.

## 6. Official integration references

- Google Search Analytics query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google OAuth authorization: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- Google Search Console quotas: https://developers.google.com/webmaster-tools/limits
- Bing Webmaster REST/API transition: https://learn.microsoft.com/en-us/bingwebmaster/
- Bing Webmaster access and OAuth/API key: https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- IndexNow protocol: https://www.indexnow.org/documentation


---

## 7. Remote verification update — 2026-11-08

The following evidence supersedes earlier provisional status notes:

| PR | Exact head | Workflow run | Result |
|---|---|---:|---|
| #18 Database/security | `a47e0caad0716c712fda40c11165e2906db4e796` | `42496732466` | Success; 4 pgTAP files, 115 assertions |
| #17 Deterministic retrieval | `dd7869c1b554df4fb0160f57f2de144b6f1af5a9` | `42495442900` | Success |
| #23 Intake and Growth | `174025a236ca7527d62e614fa6cfa97d3aad1e85` | `42495814700` | Success |
| #24 Legal evidence, stacked on #23 | `57e099bf48d9f610e927858519de5dbc7e5e57e4` | `42497020788` | Success; evidence, intake, growth, lint and build |
| #19 Offline assistant, stacked on #24 | `c0695c0b32acdb8bc27fa4d3913e5dc4b2f26d44` | `42497156039` | Success; offline, evidence, intake, growth, lint and build |

### Confirmed corrections

- The database workflow initially failed because an unused local email-testing service attempted to bind host port 54324. The CI startup command now excludes the unused service. The latest run completed migration application and all 115 pgTAP assertions successfully.
- The CI startup log is filtered for credential-bearing lines on failure; local Supabase demo credentials are not needed by the tests.
- PR #24 and PR #19 were converted into explicit two-parent stack commits so their PR bases now contain the preceding feature branch changes. Both PRs are GitHub-mergeable and their latest stack CI runs passed.
- PR #19's workflow now includes the legal-evidence tests and the intake/growth checks, in addition to offline tests and the production build.

### Remaining integration boundary

These green workflows are separate branch-level checks. There is not yet one final integration commit that runs the database migration suite and every application suite against the exact same combined tree. That combined verification remains a required gate before any merge or release.

All PRs #16, #17, #18, #19, #23 and #24 remain Draft and unmerged. No production migration, OAuth connection, deployment, or public Intake activation has occurred. The Mother Two archive and approved public-site appearance remain protected.


## 8. Full integration candidate verification — 2026-11-08

A dedicated Draft integration PR was created to test the application stack and database/security migrations against the same exact commit.

- PR #25: https://github.com/ahmadmousavi5908-crypto/vakilsite/pull/25
- Candidate branch: `integration/mavis-mvp-candidate-20261108`
- Exact integration commit: `6d7bf677b757e445f6c3be9ab7cea88b240af1e9`
- GitHub reports the PR as `clean` and mergeable; it remains Draft and unmerged.

**Application workflow:** run `42497516988` — success.
- Existing legal-library validation
- Deterministic retrieval
- Offline syntax, bundle provenance, Persian search, cache/shell and answer tests
- Legal evidence provenance and dossier tests
- Intake validation, admin, triage and Growth metrics tests
- Lint for retrieval, intake/growth and legal evidence
- Production build

**Database workflow:** run `42497516835` — success.
- Isolated Supabase startup
- Migrations 004, 005 and 006
- Four pgTAP files
- 115 assertions; result PASS
- Local stack stopped successfully

This is the first verified same-commit run of the full application workflow and database migration/security workflow. It closes the prior gap between separate green PR checks.

**Still not complete:** Mother Two local reconciliation, local Termux build/regression, staging authorization and end-to-end acceptance, lawyer review of primary-source evidence, external provider activation, and production deployment/rollback approval. No production action has been taken.


## 9. Final expanded same-commit verification — 2026-11-08

After the first integrated pass, a coverage audit found four unit-test files that were present in the repository but not explicitly included in the combined workflow. The candidate workflow was expanded to include them:

- `intake-admin.test.mjs`
- `intake-request.test.mjs`
- `public-intake-copy.test.mjs`
- `search-console-adapter.test.mjs`

The expanded workflow passed on the new exact candidate commit:

- **Commit:** `827728e0f86813ba4741d151fb5520e1a220b14e`
- **Application CI:** run `42497741526` — success, including all four added suites, lint and production build.
- **Database CI:** run `42497741482` — success, migrations 004–006, 4 pgTAP files, 115 assertions, PASS.
- Both workflows tested the same exact commit.
- PR #25 remains Draft, unmerged, and GitHub reports it clean/mergeable.

This closes the remote combined-CI gate for the current candidate. It does not close local Mother Two reconciliation, local device/browser checks, staging, lawyer validation of primary-source legal evidence, provider activation, or production operations.
