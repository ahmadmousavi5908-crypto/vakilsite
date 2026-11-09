# MAVIS Operational Runbook Addendum — 2026-11-09

**Status:** Operational design; no secrets, provider credentials, cron jobs, or production settings are changed by this document.

## 1. Idempotency HMAC secret: stability and rotation

The public intake endpoint uses `MAVIS_INTAKE_IDEMPOTENCY_SECRET` to calculate a keyed HMAC-SHA256 fingerprint of the canonical validated request and associated triage/consent/retention context. The database stores the 64-character fingerprint with the client-generated UUID and returns the original receipt only when both the key and fingerprint match.

### Current safe operating rule

- Keep the secret stable while any submission carrying a given idempotency key can still be retried or resolved.
- Do not rotate it as routine housekeeping. A new secret produces a different fingerprint for the same request. A retry using the old UUID would then be treated as conflicting key reuse and return HTTP 409 rather than the original receipt.
- A 32-character minimum is a configuration floor, not proof of sufficient entropy. Generate a cryptographically random secret with a suitable secret manager; never derive it from a password or commit it.
- Keep it separate from `MAVIS_INTAKE_RATE_LIMIT_SECRET`.
- Restrict access to the runtime identity and a small number of authorized operators. Never print it in logs, CI output, support tickets, or shell history.
- Record secret version/creation/rotation metadata, but never the secret value.

### Rotation procedure for the current implementation

1. Identify all active intake deployments and any in-flight/retry windows.
2. Confirm whether any client can still retry a previously issued idempotency UUID. Do not infer this from the age of a browser tab alone.
3. Pause new intake at the feature gate during the controlled change if uninterrupted idempotency cannot be preserved.
4. Rotate the secret in the deployment secret manager and restart/roll out all instances consistently; mixed old/new instances can produce inconsistent fingerprints.
5. Verify a fresh request, a same-key/same-payload retry, and same-key/different-payload conflict in staging.
6. Re-enable intake only after all checks pass. Keep the previous secret in a tightly restricted recovery vault only for a documented, bounded recovery need; do not leave two active keys in application configuration unless the implementation explicitly supports key IDs and overlap.
7. Record the rotation event without recording the value.

**Important:** the current database schema stores one fingerprint and has no fingerprint key-version column or multi-key lookup. Therefore seamless overlapping-key rotation is not implemented. If zero-interruption rotation is required, first design and test a versioned fingerprint migration (key ID + current/previous key verification window) with explicit retirement criteria. Do not improvise a fallback that accepts arbitrary fingerprints or weakens idempotency.

## 2. Supabase Cron: safe activation boundary

Supabase documents Cron as Beta. It uses `pg_cron`, with jobs in `cron.job` and execution records in `cron.job_run_details`. Supabase recommends no more than eight concurrent jobs and a maximum ten-minute duration per job.

Before considering a retention job:
- confirm Cron is available and enabled for the exact Supabase project and Postgres version;
- confirm the retention policy has written owner/legal approval, including distinct horizons for intake submissions and audit evidence;
- inspect the existing private purge function and its fail-closed behavior; do not create a second deletion implementation;
- test dry-run eligibility counts and boundary timestamps in staging;
- schedule only a small, bounded invocation with a stable job name and a documented disable/unschedule procedure;
- alert on missing runs, failed runs, unexpected duration and unexpected affected-row counts;
- verify least privilege for the job execution role and ensure no broad service-role table grants are introduced.

### Cron history is also data

Supabase states that `cron.job_run_details` is not cleaned automatically, including after a job is unscheduled. Do not copy a sample cleanup interval from documentation as the project's retention policy. First decide whether job history is operational evidence, how long it must be retained, and whether it must be archived. Only then add a bounded cleanup/archive process. A cleanup job must not delete its own required evidence before an operator can review it.

## 3. Search Console ingestion contract refinements

- Use the read-only OAuth scope for analytics-only access.
- Preserve the property's exact identifier, request range, dimensions, data type, aggregation mode, pagination cursor/offset, retrieval time and provider freshness.
- Interpret Search Analytics dates in Pacific Time, not the user's local timezone.
- Search Analytics may omit rows due to internal limits; store a truncation/completeness flag and never label the response a complete export.
- Treat incomplete recent data as provisional. Do not compare partial data with finalized periods without marking the difference.
- URL Inspection is a separate quota-controlled request and reports the indexed version; it is not a live fetch or a guarantee that a submitted URL will be indexed.
- Apply privacy review to query/page dimensions before storing or showing them. Avoid retaining personal/sensitive search terms unnecessarily.

## 4. Bing and Trends integration guardrails

- Do not implement the retired legacy Bing SOAP/POX interface. Use current documented REST contracts only.
- Prefer OAuth for Bing. If an API key is selected, document that it is user-level and that revocation can disable all applications tied to it.
- Do not activate a Bing adapter until the exact site is verified and a live authorized request passes.
- Treat Google Trends API as optional alpha access, not a required dependency. Keep the manual Trends research workflow available.

## 5. Operational evidence template

For every staging drill or scheduled job, record:
- environment and exact commit SHA;
- operator and UTC timestamp;
- scenario and expected result;
- correlation ID (never personal intake content);
- sanitized request/result metadata;
- observed duration and affected-row count where relevant;
- pass/fail and linked logs;
- rollback/recovery action;
- unresolved risk and owner.

Never paste real client submissions, raw IP addresses, tokens, HMAC secrets, or unredacted provider payloads into the evidence record.

## Official references

- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase Cron quickstart and job history behavior: https://supabase.com/docs/guides/cron/quickstart
- Google Search Analytics query and limitations: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google Search Console usage limits: https://developers.google.com/webmaster-tools/limits
- Google URL Inspection: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Bing Webmaster API: https://learn.microsoft.com/en-us/bingwebmaster/
- Bing OAuth: https://learn.microsoft.com/en-us/bingwebmaster/oauth2
- Google Trends API alpha: https://developers.google.com/search/apis/trends
