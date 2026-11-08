# MAVIS Client Authentication — Supabase Configuration Audit

**Research date:** 2026-11-09  
**Status:** Configuration research only. No hosted Auth settings were read or changed; no client login, OTP delivery, password signup, or MFA factor was activated.

## 1. Existing repository evidence

- `src/lib/supabase/service.js` already expects `SUPABASE_SECRET_KEY` with the `sb_secret_` prefix and creates the service client server-side.
- `.env.example` previously documented the public URL and publishable key but omitted the required server-only secret-key variable. This branch adds the blank variable and an explicit non-public warning.
- The public intake remains passwordless. No client portal route or client account activation is implemented.

## 2. Supabase Auth capabilities and constraints

### Password configuration
The current Supabase Auth Management API exposes:
- `password_min_length`;
- `password_required_characters`;
- `password_hibp_enabled`.

The current Supabase Password Security guide says the built-in leaked-password protection uses HaveIBeenPwned Pwned Passwords and is available on Pro and above. The guide recommends a large minimum password length and discusses composition rules, but MAVIS follows NIST SP 800-63B-4 instead: no arbitrary composition rules and no routine forced rotation.

**Release gate:** if a password is used as a single factor, configure and verify at least 15 characters. Verify the actual project's plan and effective HIBP blocklist setting. If the blocklist is unavailable, do not activate password login until an equivalent approved control exists.

The current Supabase CLI config reference does not list `password_min_length` or `password_hibp_enabled` as local `config.toml` settings. Do not invent unsupported TOML keys. Verify hosted Auth configuration through the supported Auth settings/Management API, with explicit operator authorization and no secrets in source control.

### Email and phone channels
- Supabase email confirmation/invitation and recovery require an SMTP delivery path; the platform's default email service is best-effort and rate-limited. Production use should have verified custom SMTP.
- Supabase phone authentication depends on a configured supported SMS provider. The documented provider list includes MessageBird, Twilio, and Vonage. This does not establish deliverability, lawful use, or sender availability for Iranian mobile networks.
- Supabase documentation warns that phone numbers are recycled and recommends MFA when phone is used as an account identifier.
- Email/phone OTPs have provider and project rate limits. Do not rely on default limits alone; test resend, verification, abuse and recovery paths.

### MFA and passkeys
- Supabase Auth supports TOTP MFA configuration. This is a viable candidate for the second factor after recovery and enrollment UX are reviewed.
- Phone MFA still depends on SMS delivery and must not be treated as a universally available second factor.
- Passkeys remain outside the first release until their maturity, SDK compatibility, recovery and production support are separately confirmed.

### Database authorization
Supabase secret keys bypass RLS. The client portal must never expose this key. Server endpoints using it must perform explicit user, matter, role, and assurance-level authorization before any privileged operation. The existing private intake schema and narrow RPC pattern must be preserved; do not grant clients direct access to private intake tables.

## 3. Recommended decision sequence

1. Keep anonymous intake passwordless and keep client self-signup disabled.
2. After office approval and identity verification, select a verified invitation channel based on real delivery tests and Iranian legal/provider review.
3. Prefer a verified email invitation plus client-chosen password only if SMTP and blocklist requirements are met; require TOTP MFA for sensitive case access. Keep a phone-based path optional until local SMS delivery is proven.
4. If the selected channel or plan cannot satisfy the required assurance, do not activate the portal. Keep the human-assisted workflow.
5. Before enabling any client account, complete RLS tests for user A/user B, matter-level access, lawyer-only notes, storage ACL, MFA assurance, session revocation, account recovery, audit and rate limits.

## 4. No-activation boundary

This audit does not:
- read or modify a hosted Supabase project;
- configure a provider, SMTP, MFA, OTP expiry or password policy;
- create client accounts or enable self-signup;
- activate client portal pages or uploads;
- store client passwords, OTPs, or recovery codes in MAVIS;
- authorize production migrations or deployment.

## 5. Official documentation reviewed

- Supabase Password Security (updated 2026-10-01): https://supabase.com/docs/guides/auth/password-security
- Supabase Auth Management API — update Auth service config: https://supabase.com/docs/reference/api/v1-update-auth-service-config
- Supabase Password-based Auth (updated 2026-10-26): https://supabase.com/docs/guides/auth/passwords
- Supabase Production Security Checklist: https://supabase.com/docs/guides/security/production-checklist
- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Supabase CLI config reference: https://supabase.com/docs/guides/local-development/cli/config
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html
