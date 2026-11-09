# MAVIS 90%+ Gap-Closure Execution Plan — 2026-11-08

**Status:** Approved engineering direction; execution plan only. This document does not approve production deployment, migrations, publication, or legal retention periods.
**Base candidate:** `1307624d120f3fff99c94bf4d4bf1c30e883dd15`
**Working branch:** `docs/mavis-90-percent-gap-closure-20261108`
**Principles:** small batches, official interfaces first, reuse existing assets, measurable acceptance, no parallel knowledge base, no UI redesign, no secrets in Git.

## 1. What “above 90%” means

A workstream is not 90% complete because code or documentation exists. It reaches the 90% gate only when:
- at least 90% of its defined acceptance checks pass with retained evidence;
- all critical security, privacy, legal-validity and data-loss checks pass (these are 100% gates, not 90% averages);
- remaining exceptions are enumerated, quarantined, assigned and have a safe fallback;
- the exact candidate commit has green application and database CI;
- required human/device/staging evidence is attached to the acceptance record.

A blocked external dependency is not silently counted as complete. It is either completed with authorized access or explicitly isolated behind a tested adapter and a safe degraded mode.

## 2. Current baseline and hard blockers

The current candidate has successful application and database workflows on commit `1307624d120f3fff99c94bf4d4bf1c30e883dd15`. The previous database acceptance covered migrations 001–011 and 167 pgTAP assertions. This proves only the automated checks that ran.

The legal review queue contains 175 records. Current evidence audit: 0 fully primary-source verified, 144 require legal review, 31 are secondary-source-only, only 10 records have a source connected and 165 have no source attached. These records must not be presented as verified legal authority.

Still requiring owner/device/provider action:
- local Termux verification and true airplane-mode test;
- staging database failure-injection and backup/restore drill;
- owner-approved submission/audit retention horizons;
- authorized Search Console and Bing Webmaster access;
- legal reviewer sign-off for exact primary documents;
- production approval, which remains outside this plan.

## 3. Parallel workstreams and lowest-friction route

### A. Reliability, security and operations

**Preferred route:** reuse the current Supabase/Postgres RPCs, existing RLS/grants and current local verification helper. Do not add a new queue platform or monitoring vendor before proving a need.

1. Add deterministic staging scenarios for database outage/recovery, duplicate retry, conflicting idempotency-key reuse, rate-limit boundary, unauthorized admin, malformed payload and provider/LLM outage.
2. Add a documented operational status contract: last successful purge, last failure, job duration, affected row count, correlation ID and alert state. Never log intake PII.
3. After owner/legal retention approval, use Supabase Cron/pg_cron to invoke the existing private retention function. Keep the job disabled until the policy is approved and seeded.
4. Read job execution history from `cron.job_run_details`; add a bounded alert for missing/failed runs. Keep the monitor separate from the purge itself.
5. Run restore/rollback only against disposable staging data. Verify counts, checksums, access policies and application recovery before marking the drill passed.

**Acceptance:** all critical negative tests pass; a staging failure produces an explicit error and no false success; purge is disabled by default and only becomes schedulable after approved policy; one intentional failure creates an observable alert; restore drill is reproducible.

**Research note:** Supabase Cron is built on `pg_cron`; jobs and run history are available in `cron.job` and `cron.job_run_details`. Current documentation recommends no more than eight concurrent jobs and no more than ten minutes per job. Confirm project support and permissions before enabling anything. See https://supabase.com/docs/guides/cron and https://supabase.com/docs/guides/cron/quickstart.

### B. Legal knowledge and research quality

**Preferred route:** improve the existing legal-library corpus and source registry. Do not build a second corpus, scrape around access controls, or mark records verified from search snippets.

1. Partition the 175-row review queue into small batches by legal domain and risk (start with high-frequency, high-impact statutes already represented in the library).
2. For each record, retrieve the exact official document from the issuing authority or official publication. Capture instrument identifier, authority, official publication reference/date, approval/notification/effective dates, amendment/repeal chain, transitional provisions, retrieval timestamp, SHA-256, reviewer and review timestamp.
3. Cross-check with a second official source where feasible. Secondary sources may help discover documents but cannot establish current validity.
4. If the official document is unavailable or ambiguous, mark the record `unverified`/quarantined and exclude it from authoritative answer retrieval. Do not guess.
5. Use a fixed reviewer checklist and a two-person review for high-risk/current-validity decisions. Keep the document snapshot and provenance linked to the existing record.
6. Build a regression set of representative legal questions. Require citation completeness, exact article matching, current-validity disclosure and abstention when evidence is missing.

**Acceptance:** every answer-eligible record has complete provenance and legal sign-off; unverified records cannot enter authoritative retrieval; at least 90% of the active, answer-eligible corpus passes the review rubric; no unsupported legal citation is emitted in the regression set.

**Important distinction:** the goal is not to falsely “verify 90% of all 175 rows.” It is to create a trustworthy active corpus and quarantine the rest until verified.

### C. Growth intelligence and external integrations

**Preferred route:** activate the lowest-dependency official channels first. Existing IndexNow support is a better first step than building several fragile submission adapters.

1. Verify the site's Search Console property and OAuth consent/scopes with the owner. Store tokens server-side only; implement least-privilege scopes, refresh, revocation, expiry and secret rotation.
2. Start with read-only Search Analytics and sitemap status. Add URL Inspection as a separate observation, not a guarantee of indexing.
3. Use IndexNow for publication/update/deletion notifications where supported; store submission response, timestamp and URL hash. Keep “submitted”, “observed indexed” and “ranking” as separate states.
4. Add Bing Webmaster REST API only after site verification and authorized OAuth/API access. Do not build against legacy SOAP/POX APIs: Microsoft documentation says they retire on 2026-08-31.
5. Do not make Google Trends API a launch dependency: current Google documentation still describes limited alpha access. Use the public Trends UI/manual research workflow until access is granted.
6. Every provider adapter must have fixtures for empty, stale, partial, quota-exceeded, unauthorized, timeout and malformed responses. No provider failure may block public intake or legal-library search.

**Acceptance:** official read-only Search Console data can be fetched and reconciled; IndexNow events are auditable; Bing integration uses supported REST/OAuth only if authorized; provider failure is visible and non-blocking; no indexing/ranking promise is made.

**Official references:**
- Search Console API services: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Search Console quotas: https://developers.google.com/webmaster-tools/limits
- Bing Webmaster API and access: https://learn.microsoft.com/en-us/bingwebmaster/ and https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- Bing URL submission and IndexNow guidance: https://www.bing.com/webmasters/help/?topicid=62f2860b
- Google Trends API alpha status: https://developers.google.com/search/apis/trends

## 4. Execution sequence (small batches)

| Batch | Work | Parallel track | Exit evidence |
|---|---|---|---|
| 0 | Freeze candidate SHA, verify CI and branch diff | All | exact SHA + green workflows |
| 1 | Add operational runbook and secret-rotation rules; prepare staging test matrix | Reliability | reviewed runbook + test cases |
| 2 | Review first legal batch from exact official documents | Legal | provenance package + reviewer decision |
| 3 | Confirm Search Console property/scopes and IndexNow status | Growth | authorized connection test or explicit blocked status |
| 4 | Run fresh Termux verification and offline-device test | Reliability | complete terminal log + device evidence |
| 5 | Run staging failure injection and restore drill | Reliability | logs, checksums, recovery evidence |
| 6 | Expand legal batches and regression corpus | Legal | coverage dashboard + zero unsupported citations |
| 7 | Complete provider fixtures, quotas, retries and observability | Growth | integration test report |
| 8 | Re-score every workstream against the acceptance matrix | All | evidence-linked scorecard; no critical gate waived |

Do not start more than two or three tightly related tasks in one batch. If a batch fails, stop, identify root cause and revise the plan before adding more work.

## 5. Human approvals and explicit dependencies

| Dependency | Needed from owner/reviewer | Safe state until received |
|---|---|---|
| Retention | Minimum submission and audit retention periods, approval reference | Purge disabled; no invented duration |
| Google | Search Console property ownership and OAuth consent | Fixture-only adapter |
| Bing | Verified site and authorized API access | IndexNow only where already configured; no guessed credentials |
| Legal corpus | Exact official documents and named legal reviewer | Unverified records quarantined |
| Device | Termux command output and airplane-mode evidence | Device gate remains pending |
| Production | Explicit merge/deploy/migration approval | PR remains draft/open; no production change |

## 6. Scorecard rules

Report a separate percentage for:
- implementation completeness;
- automated test pass rate;
- operational evidence coverage;
- legal evidence coverage;
- external integration readiness.

Do not average these into one flattering number. Overall readiness is capped by the lowest critical gate. Security/privacy/legal validity and data integrity must be 100% for the relevant production path. A workstream may be called “90%+” only when the acceptance checks and evidence above are satisfied.

## 7. Immediate next actions

1. Keep this branch documentation-only and review the plan before implementation changes.
2. Run the exact fresh Termux verification command from the acceptance matrix in a new clone; never reuse or overwrite the Mother Two backup.
3. Obtain the retention decision and authorized Search Console/Bing access while legal review starts with a small, high-value batch.
4. Do not merge, deploy, activate retention jobs or publish generated legal content as part of this work.


## 8. Iranian primary-source discovery map (research update)

Use these official destinations as a discovery and verification map, not as proof that every endpoint is currently reachable or that every page is complete:

| Material | Primary destination | Use and caution |
|---|---|---|
| Official publication of laws, regulations and mandatory notices | https://rrk.ir/ | Capture exact issue number, publication date and document. The older root has had URL/availability changes; verify the current document route and do not treat a homepage response as a retrieved instrument. |
| National laws and regulations | https://qavanin.ir/ and https://dotic.ir/ | Discover law text, metadata, status and amendment history. Confirm the exact law/document page and cross-check its official publication. |
| Judiciary portal | https://eadl.ir/ | Navigation point for official judiciary circulars, advisory opinions, unifying decisions and linked judiciary systems. |
| National judicial decisions repository | https://ara.jri.ac.ir/ | Discover published trial/appellate and higher-court decisions. Record court, branch, decision number/date and publication status. Do not label an ordinary published judgment as generally binding. |
| Parliament and legislative history | https://www.parliran.ir/ and https://rc.majlis.ir/ | Identify bills, enacted text, parliamentary history and research commentary; research reports are not statutes. |
| Guardian Council | https://www.shora-gc.ir/ and https://nazarat.ccri.ac.ir/ | Check review opinions and constitutional interpretations relevant to enactment history. |
| Government resolutions | https://cabinetoffice.ir/ | Discover cabinet resolutions, bylaws and executive decisions; check publication and effective dates. |
| Administrative Court | https://divan-edalat.ir/ | Check General Board decisions, especially annulment of administrative rules and circulars. |

The current official judiciary portal search result lists the National Judicial Decisions System, advisory opinions, unifying decisions and administrative-court decisions. The portal itself returned a gateway error during this research session, so reachability remains unverified. The National Judicial Decisions System is identified at `ara.jri.ac.ir`; its exact document pages must be checked individually.

A secondary legal-platform source map identifies the official destinations above and distinguishes published judgments from binding unifying decisions. Use it only for discovery; the official issuing body/document remains the evidence source. The Library of Congress guide also lists the Iranian Official Gazette as an official-gazette destination, while the ecoi guide explicitly warns that its research guide does not replace independent verification of currency, validity and accuracy.

**Research references checked 2026-11-08:**
- Law Library of Congress, Iran Guide: https://wwws.loc.gov/law/help/guide/nations/iran.php
- ecoi, Iran Law Guide: https://www.ecoi.net/en/countries/islamic-republic-of-iran/law-guide/
- Judiciary portal: https://www.eadil.com/
- Official-source directory (discovery only): https://loyadesk.com/laws/official-sources

**Access status:** this research did not retrieve a specific official legal instrument and did not verify live access to RRK, Qavanin, Dotic or Ara document endpoints. No legal record status is changed by this source map.


## 8. Fresh official-documentation corrections (reviewed 2026-11-08)

- Supabase currently labels Cron as **Beta**. Availability and permissions must be checked in the actual project before selecting it as an operational dependency. Supabase recommends at most eight concurrent jobs and a maximum ten-minute duration per job. Job execution history is stored in `cron.job_run_details`, and that history is not automatically cleaned when a job is unscheduled. Do not copy the documentation's seven-day cleanup example as MAVIS policy; any history cleanup/archive window requires the same owner-approved retention decision and must preserve required audit evidence.
- Google Search Console Search Analytics is not a guaranteed complete export: Google documents internal row/data limitations and possible omitted rows. Store pagination/truncation and query semantics; never label results as exhaustive. Search Analytics date boundaries use Pacific Time, and URL Inspection is a distinct quota-limited endpoint that reports the indexed version, not a live-page test.
- Bing's legacy SOAP/POX retirement date (2026-08-31) has passed. Only current REST endpoints are acceptable. OAuth 2.0 is the recommended access method; API-key revocation disables applications using that user's key, so avoid making a shared user API key an untracked single point of failure.
- Google Trends API remains an alpha program with limited early access. It is not a required production dependency; use the Trends UI and documented manual research until explicit alpha access is granted.

Sources:
- Supabase Cron stage and operating limits: https://supabase.com/docs/guides/cron and https://supabase.com/features/supabase-cron
- Supabase job history behavior: https://supabase.com/docs/guides/cron/quickstart
- Search Analytics limitations and PT date semantics: https://developers.google.com/webmaster-tools/v1/searchanalytics and https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Search Console URL Inspection scope: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Bing API and OAuth: https://learn.microsoft.com/en-us/bingwebmaster/ and https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- Google Trends alpha: https://developers.google.com/search/apis/trends


## 11. Execution update — 2026-11-09

The candidate has since added a provider-independent public-chat core, deterministic urgent/priority human-review routing, and a fail-closed evidence gate. Generated answers require a retriever result whose record-level review status, current-validity packet and primary-source citation meet the server contract; claims must cite retrieved record IDs and citations are reconstructed by the server. The current corpus still has zero fully verified primary-source records, so generated legal answers remain unavailable by design. Public chat and real providers remain disabled by default.

The legal review queue validator and its unit tests are already integrated into the candidate. A follow-up guard is under review to reject impossible dates, malformed timestamps, reversed effective periods and records linked only to secondary sources before any future primary-source promotion. CI success is evidence for automated checks only; Termux, device/offline, staging restore, owner-approved retention policy, real provider integrations and production deployment remain separate acceptance gates.
