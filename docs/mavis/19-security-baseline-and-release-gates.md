# MAVIS / Vakilsite — Security Baseline and Release Gate

**Assessment date:** 2026-11-04  
**Baseline:** OWASP ASVS 5.0.0, with a practical Level 2 target for the public web application.  
**Status:** Assessment and requirements only. This document does not certify the application as secure or production-ready.

## 1. Current verified findings

- The repository is public. Treat every committed file, workflow, issue, and build artifact as public information. Never commit credentials, private client data, production exports, or unredacted logs.
- The inspected feature branches report branch protection disabled. Required reviews and required status checks are therefore not enforced by GitHub branch rules at the time of assessment.
- `next.config.mjs` currently sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`; `poweredByHeader` is disabled.
- A Content Security Policy, Permissions Policy, HSTS policy, and explicit frame-ancestors policy were not present in the inspected Next.js config. Add them only after inventorying required script, image, font, frame, analytics, and external service origins; start with report-only CSP to avoid breaking production.
- Supabase server/client helpers use the publishable key. No service-role/secret key was found in the inspected helper. This does not prove that no secret exists elsewhere in the repository or deployment environment.
- Supabase session refresh proxy calls `auth.getClaims()`; authorization must still be enforced at every protected server action, route, and data access. A valid session is not proof of permission.
- MAVIS public core remains disabled by default, has no public chat Route Handler, and has no live provider. Do not expose it until distributed abuse controls, budget limits, privacy controls, and integration tests exist.
- The prior UI workflow run for an older SHA was cancelled, but a separate pull-request run on the current UI head completed successfully. Keep evidence tied to exact commit SHA.

## 2. Required controls before production

### Identity and access
- Enforce MFA for GitHub, hosting, DNS, registrar, Supabase, and any production provider accounts.
- Use least-privilege team membership and short-lived credentials where available.
- Protect `main` and release branches with pull-request review, required CI checks, no force pushes, and no deletion.
- Use separate development, staging, and production projects and credentials.
- Re-authenticate for sensitive admin operations; use secure, HttpOnly, SameSite cookies and appropriate session expiry.
- Deny by default. Check authorization server-side on every request and object access; never trust client-supplied role, owner, tenant, or case identifiers.

### Application and browser
- Maintain a reviewed security-header policy: CSP (initially report-only), HSTS after HTTPS is confirmed, frame-ancestors, X-Content-Type-Options, Referrer-Policy, and a restrictive Permissions-Policy.
- Avoid unsafe HTML rendering. Validate schemas and bounds at every public boundary; encode output by context.
- Protect state-changing cookie-authenticated endpoints against CSRF and validate Origin/Host where appropriate.
- Apply request size limits, method allowlists, timeouts, concurrency limits, and safe error responses.
- Rate-limit login, contact/intake, search, and AI endpoints at a shared atomic backend, not process memory alone.
- Prevent open redirects, SSRF, path traversal, unsafe file uploads, and unrestricted external URL fetching.
- Keep public forms free of unnecessary sensitive information. Define retention, deletion, consent, and access procedures before collecting personal or case data.

### Supabase and data
- Enable RLS on every exposed table and verify grants as well as policies. RLS policies do not automatically remove broad SQL grants.
- Test cross-user and cross-case isolation with positive and negative database tests.
- Never expose Supabase secret/service-role keys in browser bundles, public variables, Git, logs, or client-visible errors.
- Restrict Storage buckets and object paths by ownership and purpose; validate content type and size server-side.
- Minimize data, encrypt transport, define backup retention, and rehearse restoration.
- Keep privileged database operations behind narrow server-only modules.

### MAVIS / AI-specific
- Do not send confidential client matter, identity documents, or privileged communications to an unapproved model provider.
- Treat user input, retrieved documents, web pages, and model output as untrusted data. Prompt injection is a policy and authorization problem, not something a system prompt alone can solve.
- Do not allow the model to choose authorization, access private records, or execute external actions without deterministic server-side policy and explicit human approval.
- Use an atomic distributed rate limiter, per-IP/session/account quotas, concurrency caps, token ceilings, daily/monthly budgets, and an immediate kill switch before a public endpoint exists.
- Keep logs metadata-only by default; redact personal data and never log secrets or full legal conversations by default.
- Verify every legal citation against an authoritative source and effective date; the model must not invent citations or claim verification it did not perform.

### Supply chain and CI/CD
- Set workflow and job permissions explicitly to the minimum required; read-only `contents: read` for build/test jobs.
- Pin third-party GitHub Actions to full commit SHAs and document the upstream release tag.
- Set `persist-credentials: false` for checkout jobs that do not need authenticated Git operations.
- Use Dependabot or an equivalent reviewed update process for npm and GitHub Actions.
- Run lockfile-based clean installs, lint, unit/contract tests, production build, dataset validation, and HTTP smoke tests.
- Add secret scanning, dependency vulnerability scanning, CodeQL/static analysis, and artifact retention rules. Review alerts; do not suppress findings without a documented reason.
- Never run untrusted pull-request code in privileged `pull_request_target` or `workflow_run` contexts.

## 3. Security test matrix

| Area | Minimum test evidence |
|---|---|
| Authentication | MFA enabled for operators; session rotation, expiry, logout, and invalid-token tests |
| Authorization | Unauthenticated denial; role denial; cross-user/case access denial |
| Input handling | Invalid schema, oversized body, malformed JSON, Unicode edge cases |
| XSS | Stored/reflected payloads render as text; no unsafe HTML sink |
| CSRF | Cross-origin state-changing request rejected |
| Rate limiting | Concurrent requests across instances cannot exceed configured quota |
| Secrets | Repository scan and built client bundle scan contain no credentials |
| Headers | Production HTTPS response headers checked against approved policy |
| Database | RLS enabled; grants reviewed; negative isolation tests pass |
| Uploads | Type/size/path checks; executable content rejected or safely quarantined |
| AI | Prompt injection, forged history, tool authorization, output bounds, provider timeout |
| Recovery | Backup restore drill with measured recovery point and recovery time |

## 4. Release gates

A release is blocked if any of the following is true:
- A high/critical exploitable vulnerability is open without an approved mitigation.
- A secret or private client record is present in repository history or build artifacts.
- RLS, authorization, or cross-tenant isolation is untested.
- Required CI is missing, stale, cancelled, or tied to a different commit than the release candidate.
- HTTPS/domain, canonical URL, CSP/HSTS, backup/restore, or monitoring is unverified.
- Public MAVIS endpoint is enabled without atomic rate limiting, quotas, kill switch, privacy notice, and approved provider eligibility.
- Android/mobile and desktop smoke tests have not been completed for changed interactive UI.

## 5. Operational boundaries and limitations

A code review cannot verify hosting firewall rules, DNS, TLS certificates, CDN/WAF settings, production secrets, Supabase dashboard settings, account MFA, or backup execution unless access and evidence are provided. These are explicit external verification items, not assumed controls.

No automated scanner or checklist can guarantee immunity from compromise. The objective is defense in depth, early detection, least privilege, tested recovery, and reducing the impact of inevitable mistakes.
