# MAVIS Public Intake — Security and Operational Contract

**Status:** implementation staged in a draft PR; database tests and live deployment configuration remain pending.

## Scope
This is a contact-request intake, not a public legal adviser and not a case-file upload portal. It collects only name, phone, optional email, city, broad legal area, short matter summary and independent consent flags. It does not ask for national ID, case number, exact address, bank details or documents.

## Architecture
- Public page: `/mavis-intake`.
- Privacy notice: `/mavis-intake/privacy`.
- API: `POST /api/mavis/public-intake`.
- Admin-only review: `/admin/mavis-intake`.
- Database migration: `006_mavis_public_intake.sql`.
- Database test: `006_mavis_public_intake.test.sql`.
- Public request API uses a server-only Supabase secret/service-role client. The RPC is executable by `service_role` only; `anon` and `authenticated` cannot call it directly. No service key is shipped to the browser.
- The service role has no direct table grants. The only public-facing database capability granted to it is the validated intake RPC and retention-purge RPC.
- Intake and audit tables have RLS. Only site admins can read submissions and audit events; admins can update only the status column.
- Status changes create a database audit event.
- Idempotency keys prevent duplicate records after network retries.
- Two persistent database rate limits apply: at most ten submissions per trusted IP and at most three submissions for the same normalized contact plus IP, each in a 15-minute window. Both identifiers are HMACs created server-side; the raw IP is not stored in the rate-limit table. Expired rate-limit keys are cleaned during requests.
- A daily Supabase Cron job invokes the retention purge at 02:17 UTC. Each record receives its own retention deadline at creation.

## Required server environment
All values are server-only; never use a `NEXT_PUBLIC_` prefix for secrets.

| Variable | Requirement |
|---|---|
| `MAVIS_INTAKE_ENABLED` | Must be exactly `true` to activate; otherwise API fails closed |
| `SUPABASE_SECRET_KEY` | Preferred Supabase server secret key; legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as fallback |
| `MAVIS_INTAKE_RATE_LIMIT_SECRET` | At least 32 characters; use a cryptographically random secret |
| `MAVIS_INTAKE_TRUSTED_PROXY_HEADERS` | Must be `true` only after the reverse proxy is confirmed to overwrite `x-real-ip` |
| `MAVIS_INTAKE_PRIVACY_NOTICE_VERSION` | Approved privacy notice version, max 40 characters |
| `MAVIS_INTAKE_RETENTION_DAYS` | Explicitly approved integer from 1 to 3650 |

The page remains disabled if any required configuration is absent. Do not activate the feature until the privacy notice, actual retention period, proxy header behavior, database migration and pgTAP suite are approved and tested.

## Request protections
- Same-origin validation.
- JSON content-type enforcement.
- 8 KiB streamed request-body cap.
- Strict allow-list of fields; unexpected fields are rejected.
- Server-side type, length, phone, email, consent and idempotency validation.
- HMAC rate key generated server-side.
- RPC result and reference UUID validated before returning success.
- All responses use `Cache-Control: no-store`.
- No success receipt is returned unless the database confirms persistence.
- No form answer is written to localStorage or IndexedDB; client state is memory-only.
- No file uploads or case documents.

## Consent model
Required: acknowledgement of the privacy notice and consent to be contacted about this specific request.
Optional and independent: third-party sharing for follow-up; marketing communications.
Neither optional consent is bundled with the required contact consent.

## Retention
The migration creates a daily pg_cron job that deletes submissions after the configured per-record retention deadline. Audit rows are removed with their submission. The exact retention period is a business/privacy decision and is deliberately not hard-coded. It must be approved and set in the server environment before enabling the form.

## Offline behavior
The public legal knowledge bundle may work offline after download. Intake submission never works offline. The UI must not show a tracking receipt when the database or network is unavailable.

## Required release gates
1. Apply migrations 004, 005 and 006 in a controlled Supabase database in order.
2. Run `supabase test db`; all 53 pgTAP assertions for migration 006 and all previous database tests must pass.
3. Verify the actual Supabase Exposed schemas do not include `mavis_intake_private`.
4. Verify the proxy overwrites `x-real-ip`; otherwise leave the feature disabled.
5. Verify secret key is configured server-side only.
6. Test concurrent submissions, idempotent retries, rate limiting, RLS, audit trigger, retention cron and outage behavior.
7. Approve the exact privacy notice and retention duration.
8. Keep public activation disabled until all gates pass.

## Known limitation
The PR workflow now initializes an isolated local Supabase stack, applies migrations 001–006, and runs `supabase test db` alongside JavaScript tests, lint and a production build. This is configured but not yet evidenced by a completed workflow run. No live Supabase project has been inspected or changed; a passing local CI run still does not prove production Exposed-schema, proxy or secret settings.
