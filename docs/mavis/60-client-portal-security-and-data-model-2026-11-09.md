# MAVIS Client Portal — Security and Data Model

**Status:** Architecture proposal for implementation review. This document does not create client accounts, enable self-signup, configure authentication providers, or activate a client portal.
**Scope:** Authenticated client workspace after human intake approval and identity verification.
**Non-goal:** Replacing or duplicating the existing legal knowledge registry. Client/matter data and legal research content remain separate domains.

## 1. Decision and alternatives

Two approaches were considered:

### Option A — Extend public intake into a full case form
Add every case-specific field to the anonymous form and persist it on the existing intake submission.

**Rejected:** it collects sensitive facts before conflict screening and engagement, mixes preliminary inquiries with accepted matters, and creates an unnecessarily broad public attack surface.

### Option B — Separate post-approval client workspace
Keep the anonymous form minimal. After office approval and verified identity, invite the client to an authenticated workspace. Show only the supplementary questionnaire relevant to the approved matter.

**Selected:** it matches the existing staged intake contract, minimizes anonymous collection, and allows authorization to be enforced against an explicit client-to-matter relationship.

## 2. Lifecycle

1. Anonymous visitor submits only the existing allowlisted initial-intake fields.
2. Staff reviews the request, checks conflicts, confirms scope and decides whether to proceed.
3. Staff records approval and verifies the client's identity through an approved process outside the public form.
4. An authorized operator sends a one-time invitation through a verified delivery channel.
5. The client accepts the invitation, completes authentication and enrolls the required second factor.
6. The server links the authenticated user to the approved client profile and only the explicitly assigned matter(s).
7. The client sees a minimal profile, client-visible matter status and any supplementary questionnaire required for that matter.
8. Staff can suspend or revoke access immediately; the next request must fail closed.
9. Matter closure and retention follow a written owner/legal-approved policy.

No step may infer identity or authorization from a tracking code, idempotency UUID, phone number typed into the public form, cached page, or possession of a document link.

## 3. Proposed private relational model

Keep these tables in a non-exposed private schema, separate from the existing legal knowledge tables and the existing anonymous-intake submission schema.

### client_profiles
- `id` UUID primary key.
- `auth_user_id` UUID unique foreign key to `auth.users`, nullable until invitation acceptance.
- `display_name` text, minimum necessary.
- `verified_email_at` and/or `verified_phone_at` timestamps, populated only after provider verification.
- `account_state`: invited, active, suspended, closed.
- `approved_by`, `approved_at`, `created_at`, `updated_at`.
- No password, OTP, recovery secret, or provider token columns.

### matters
- `id` UUID primary key.
- `internal_reference` unique random reference; not an authentication secret.
- `matter_type` from the existing allowlist.
- `client_visible_title` and `client_visible_status` only.
- `assigned_office_contact` or staff role reference.
- `created_at`, `updated_at`, `closed_at`.
- Internal strategy, conflict results, privileged notes, and risk scores do not belong in this table.

### matter_access
- `matter_id`, `client_profile_id`, `access_role`, `granted_by`, `granted_at`, `revoked_at`.
- Unique active relationship per client/matter/role.
- Every read of a matter, questionnaire, message or document must resolve through this relationship.
- Access revocation must take effect on the next server request; do not rely on hiding navigation items.

### client_matter_questionnaires
- `id`, `matter_id`, `client_profile_id`, `schema_id`, `schema_version`, `answers` JSONB, `submitted_at`, `updated_at`.
- Store only fields required for the approved matter and stage.
- JSONB is acceptable only with a versioned schema, strict server-side allowlist, per-category validation, bounded field sizes, and matching database-level structural checks.
- Do not store unrestricted attachments or credentials inside JSONB.
- Questionnaire schema changes must be versioned; old answers must remain interpretable.

### client_messages and client_documents
- Messages are client-visible communications only; internal staff notes use a separate private table and API.
- Document metadata includes matter relationship, uploader, classification, explicit client visibility, object path, content type, byte size, hash, scan state and timestamps.
- Private storage objects must not be addressable through predictable public URLs.
- Signed download URLs must be short-lived and generated only after current matter authorization.

### audit_events
- Append-only records for invitation, activation, MFA changes, matter access grants/revocations, document upload/share/download, message events, status changes and administrative access.
- Store actor, action code, target identifiers and timestamp.
- Never store passwords, OTP values, recovery codes, access tokens, full request bodies or raw document contents in audit events.

## 4. Authorization architecture

- Keep the private schema unexposed to the browser Data API.
- Enable RLS on every table that can be reached through Supabase APIs; explicitly revoke default grants and grant only required privileges.
- Client reads require both an authenticated identity and an active row in `matter_access`.
- Use a narrow database function or carefully scoped query to resolve access; never rely on a client-supplied matter ID alone.
- Separate client-visible records from lawyer-only records at the schema/API boundary, not only by filtering fields in React.
- Require MFA assurance level AAL2 for sensitive documents, messages and high-risk account changes.
- A service/secret key bypasses RLS. Keep it server-only and require explicit authorization in every privileged server route before using it.
- Never expose service-role/secret keys or use them in browser code.

## 5. Authentication and recovery

- Disable public client self-signup. Account creation is invitation-only after staff approval.
- Select the verified delivery channel only after real provider tests, Iranian legal review, and delivery/recovery review.
- TOTP MFA is the first candidate for sensitive case access. Phone-based MFA is optional only if delivery and SIM-swap/recycling risk are addressed.
- If password login is enabled, the client chooses the password. The office never sees or sets it.
- Enforce the NIST single-factor 15-character minimum, compromised-password blocklist, no composition rules, and no arbitrary periodic rotation.
- Verify Supabase Auth plan/configuration supports the blocklist before enabling password login. If not, keep that login path disabled until an equivalent approved control exists.
- Recovery uses a verified factor or documented human identity review. Tracking codes, matter references, case facts and security questions are never recovery credentials.
- Use secure, HttpOnly, SameSite cookies; rotate sessions after authentication/privilege changes; bound session lifetime and inactivity; revoke on compromise or account closure.

## 6. Conditional field presentation

The public form must remain minimal. Matter-specific questions appear only after:
- staff approval;
- account invitation acceptance;
- identity verification;
- active matter access;
- a server-issued questionnaire schema for that matter.

The questionnaire must show only the selected category's relevant fields. Do not request national ID, bank information, full medical records, unrestricted documents or unrelated third-party information by default. Date fields must preserve the user's calendar context and must never be treated as an automatically calculated legal deadline.

## 7. Storage and offline boundary

- No private client profile, matter, message, questionnaire answer, document, token or session is stored in the public service-worker cache, IndexedDB, localStorage or sessionStorage.
- Client portal pages and APIs remain network-only and require a fresh server-side authorization check.
- Offline mode exposes only the public legal knowledge bundle and public contact information.
- After reconnection, the server must revalidate session, MFA assurance and current matter access before returning private data.

## 8. Implementation order and gates

1. Approve the threat model, identity proofing procedure, privacy notice and retention policy.
2. Choose an invitation channel and verify provider availability, domain ownership, deliverability, quotas, recovery and local legal requirements.
3. Configure password policy, compromised-password blocklist, TOTP MFA, session limits and auth rate limits in a disposable project.
4. Implement invitation lifecycle and profile linking with one-time, expiring, hashed invitation tokens.
5. Add the private relational model and narrow RPCs.
6. Add pgTAP allow/deny tests for anonymous, client A, client B, revoked client, admin and non-admin roles.
7. Add private Storage policies and tests for cross-matter and revoked-user access.
8. Add client portal read-only screens and the first approved questionnaire.
9. Add message and upload workflows only after storage, scanning, retention and audit controls pass.
10. Run disposable staging failure injection, revocation, recovery and backup/restore tests before any activation.

## 9. Explicitly deferred

- No schema migration is included in this design document.
- No client accounts or portal routes are activated.
- No SMS/email provider is selected or configured.
- No password, OTP, TOTP seed or recovery secret is stored by MAVIS.
- No retention horizon is invented.
- No private data is made available offline.
- No production migration, activation or deployment is authorized.

## 10. References

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API keys and secret-key handling: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Password Security: https://supabase.com/docs/guides/auth/password-security
- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Supabase Auth MFA: https://supabase.com/docs/guides/auth/auth-mfa
- NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
