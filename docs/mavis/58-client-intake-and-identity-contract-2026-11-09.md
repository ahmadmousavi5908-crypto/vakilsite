# MAVIS Client Intake, Case Fields and Identity Contract — 2026-11-09

**Status:** Product/security specification for implementation review. This document does not activate public intake, client accounts, SMS delivery, or case-file uploads.
**Design rule:** Ask only what is needed at the current stage. Keep public intake separate from authenticated client workspace and internal lawyer-only records.

## 1. Client journey and data boundaries

1. **Public discovery:** anonymous visitor reads general content. No account, password, or case data is required.
2. **Initial intake:** visitor submits a small, allowlisted set of contact and matter facts. Submission is not acceptance of representation and does not create a lawyer-client relationship.
3. **Conflict check and human screening:** authorized office staff checks parties, urgency, jurisdiction, scope, and whether the office can consider the matter. The system must not expose conflict-check results to the visitor.
4. **Engagement:** only after the lawyer approves the matter and the engagement/identity process is completed may the office invite the person to a private client workspace.
5. **Client workspace:** authenticated client sees only matters explicitly linked to their verified account and permitted role. Lawyer-only notes, internal triage, other clients, and conflict records are never exposed.
6. **Closure/retention:** matter status, access revocation, retention and deletion follow owner/legal-approved policy; do not infer periods in code.

## 2. Public initial-intake fields

### Required, low-friction fields

| Field key | Persian label | Validation / purpose |
|---|---|---|
| fullName | نام و نام خانوادگی | 3–100 characters; claimant contact name |
| phone | شماره همراه | normalized Iranian or explicitly supported international format; verify later before account activation |
| caseType | موضوع درخواست | civil, criminal, family, property, commercial, labor, administrative, other |
| urgency | فوریت اعلام‌شده | routine, soon, urgent; self-reported, not a legal deadline calculation |
| summary | شرح اولیه موضوع | 30–6000 characters; timeline, key event and current stage |
| consent | رضایت برای بررسی اولیه | explicit, versioned, timestamped, purpose-limited |

### Optional at initial intake

| Field key | Persian label | Notes |
|---|---|---|
| opposingParty | نام طرف مقابل | Ask only to support conflict screening; explain why it is requested |
| preferredContactMethod | روش تماس ترجیحی | phone / SMS / email only after the office supports and validates the channel |
| preferredContactTime | زمان مناسب تماس | broad time window, not precise location tracking |
| cityOrJurisdiction | شهر یا حوزه قضایی | useful for jurisdiction and office coverage; do not infer from IP |
| noticeDate | تاریخ ابلاغ یا اطلاع | optional; store calendar type and normalized date separately if collected |
| nextKnownDeadline | نزدیک‌ترین موعد اعلام‌شده | date + source/type + user confidence; never calculate or guarantee a legal deadline from this field |
| priorCounsel | آیا قبلاً وکیل داشته‌اید؟ | yes/no/unknown; no names unless needed |
| requestedOutcome | خواسته یا نتیجه مورد انتظار | optional free text with a short length limit |

**Do not collect at public intake:** passwords, OTPs, national ID scans, bank/card details, authentication secrets, full case files, medical records, unrelated third-party data, or unrestricted attachments. The current form correctly warns against these. Do not weaken that boundary to make the form look comprehensive.

## 3. Conditional matter fields after the initial screen

Show only the section relevant to the selected matter type. These are optional until a human reviewer confirms necessity.

### Civil and contract
- contract/document type and execution date;
- parties' roles and essential obligations;
- alleged breach and date discovered;
- amount claimed and currency, if relevant;
- payments/receipts and prior notices;
- court/authority, case stage and next known hearing, if a case already exists.

### Criminal
- person's role: complainant, accused, witness, victim/representative, other;
- alleged event date and place at city level;
- police/prosecutor/court authority and branch, if known;
- summons/notice type, issue date, service date and attendance date;
- custody or immediate safety concern (yes/no/prefer human contact);
- never ask the public form to decide guilt, legal classification, or calculate a limitation/deadline.

### Family
- request type: divorce, dowry, maintenance, custody, visitation, marital property, other;
- existence of prior judgment/agreement and its date;
- children involved: yes/no and age bands only when relevant;
- urgent safety concern: optional, with safe-contact preference;
- avoid collecting detailed sensitive family narratives before secure review.

### Property and land
- city and property type;
- registered deed / ordinary contract / inheritance / possession / other;
- transaction or deed date;
- registry identifier only at the secure-document stage when necessary;
- known registration, cadastral or court status.

### Commercial and company
- organization type and user's role/authority;
- contract/instrument type and date;
- amount/currency, counterparties for conflict screening;
- company registration details only when required and in a secure stage.

### Labor and social security
- worker/employer/representative role;
- employment start/end or dismissal date;
- contract and insurance status;
- wage/benefit category and approximate amount;
- labor authority/branch and notice dates, if any.

### Administrative
- issuing body and decision/notice type;
- date of issue and date of notification;
- requested review/appeal route as stated by the user, not inferred;
- authority/branch and case reference only when necessary.

## 4. Separate consent and notice controls

- Initial-review consent: required, purpose-specific, versioned, timestamped.
- Privacy notice acknowledgement: separate from consent where applicable; record notice version.
- Third-party data notice: explain minimization and request only essential opposing-party details.
- Marketing consent: optional, unchecked by default, independent of legal intake; refusal must not block submission.
- Secure upload notice: separate acceptance at the time the authenticated upload feature is used.
- Contact-channel permission: record channel and purpose; do not bundle marketing with case communication.
- Withdrawal/contact preference: provide a human route; explain limits where processing is legally required.

The exact lawful basis, notice text, retention periods, and cross-border hosting implications require review by the responsible Iranian legal/privacy reviewer and hosting provider before activation.

## 5. Client workspace fields (after engagement and identity verification)

### Client-visible profile
- verified display/legal name;
- verified phone and optional verified email;
- preferred contact channel and accessibility/language preference;
- active sessions/devices and security settings;
- account recovery and notification settings.

### Client-visible matter summary
- matter reference (not an authentication secret);
- assigned office contact/role;
- matter title/category and current client-visible status;
- next scheduled appointment or hearing only when confirmed by staff;
- client-visible action checklist with owner and due date;
- documents uploaded by the client and documents explicitly shared by the office;
- message thread with sent/delivered/received timestamps;
- payment/invoice data only if a separately approved billing workflow exists;
- consent/notice history relevant to the account.

### Lawyer-only data (never returned by default)
- conflict-check matches and internal rationale;
- internal risk/triage score and staff-only notes;
- draft legal strategy, privileged internal comments, internal source annotations;
- other clients' data, staff credentials, audit internals and secret configuration.

Enforce this boundary at the database/RLS and server authorization layers, not only by hiding UI fields.

## 6. Client authentication and passwords

### Recommended first release
- Do not create a client account at anonymous intake.
- After human approval and identity confirmation, send a one-time invitation through a verified channel.
- Use a server-verified phone OTP or email magic link only if the selected provider, delivery route, local legal requirements, and abuse controls are configured.
- For sensitive matter access, require a second factor or a stronger bound authenticator; phone number alone is not sufficient because phone numbers can be recycled or SIM-swapped.
- Never send a permanent initial password in SMS, email, WhatsApp, or a staff message.
- Never ask clients to send passwords or OTPs to the lawyer's office or MAVIS chat.
- Tracking codes and idempotency UUIDs are references, not passwords and not proof of identity.

### If a password is required
- The client chooses it during verified account activation; the office never chooses or sees it.
- Follow current NIST SP 800-63B-4: minimum 15 characters when password is the sole factor; permit at least 64 characters; block common/compromised passwords; no arbitrary character-class rules; no routine forced rotation; force change only after compromise evidence.
- Use the identity provider's maintained password verifier. Never store plaintext or reversible passwords in MAVIS.
- Require MFA for sensitive case access and high-risk account changes.
- Use generic login/recovery errors to avoid account enumeration, bounded attempts, server-side session expiry, secure HttpOnly/Secure/SameSite cookies, session rotation after authentication/privilege change, and immediate revocation on account compromise.
- Recovery must use a previously verified factor or manual human identity review; never use security questions or case facts as password-reset answers.

### Passkeys
Supabase documents passkeys as experimental as of its 2026 documentation and requires a recent JS SDK. Do not make this experimental feature the only production login path. Keep it as a future optional enhancement after the API is stable and the installed package version is confirmed.

## 7. Credential and reference lifecycle

| Item | Purpose | May authenticate? | Storage / handling |
|---|---|---|---|
| tracking code | lets a caller refer to an intake | No | show once; do not reveal private details from it |
| idempotency UUID | prevents duplicate submission on retry | No | sessionStorage only; already implemented |
| OTP | proves possession of verified channel for one login | Yes, one-time | short TTL, single use, attempt limit, never logged |
| password | client-chosen account secret if enabled | Yes | identity provider only; never visible to MAVIS staff |
| passkey | device-bound public-key authentication | Yes | public key registered server-side; private key remains with authenticator |
| recovery code | fallback after MFA loss | Yes, one-time | show once, client stores securely, store only verifier/hash server-side |

For OTPs: use a cryptographically secure generator, short expiry (target 5 minutes subject to provider support), single use, resend invalidates the previous code, strict per-account and per-IP limits, and no OTP in logs. Do not invent a fixed SMS provider or send credentials before provider/legal review.

## 8. Explicit non-goals for the first release

- no password field in public intake;
- no client login before office approval;
- no private matter data in the public offline bundle or service-worker cache;
- no localStorage/sessionStorage of case narrative, identity documents, access tokens, OTPs or passwords;
- no account recovery through tracking code alone;
- no autonomous legal advice, deadline calculation or conflict-check disclosure.

## 9. Acceptance tests before activation

- public intake never accepts password/OTP/secret fields (unknown fields rejected);
- marketing consent is optional and independent;
- all case-specific fields are conditionally rendered and server-allowlisted;
- user A cannot read user B's matters or lawyer-only notes;
- tracking code alone cannot authenticate or retrieve a matter;
- OTP is single-use, expires, resend invalidates prior code, and brute-force limits work;
- account recovery requires verified factor or documented human review;
- session expires and revokes as specified;
- no credential, PII, or case data appears in public bundle, browser storage, analytics, or logs;
- offline mode cannot create a new authenticated session or bypass revocation.

## 10. Research references

- NIST SP 800-63B-4, final July 2025: https://pages.nist.gov/800-63-4/sp800-63b.html
- NIST SP 800-63B-4 FAQ on 15-character single-factor passwords and no composition/periodic rotation: https://pages.nist.gov/800-63-4-Implementation-Resources/faqs/
- Supabase phone OTP: https://supabase.com/docs/guides/auth/phone-login
- Supabase passkeys (experimental): https://supabase.com/docs/guides/auth/passkeys
- OWASP Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP MFA/OTP handling: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
