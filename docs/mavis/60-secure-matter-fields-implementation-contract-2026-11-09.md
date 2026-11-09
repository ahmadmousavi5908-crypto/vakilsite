# Secure Matter-Specific Fields — Implementation Contract

**Status:** Versioned immutable schema v1 and pure validation contract only. No client portal, public form, database persistence, upload, authentication, or production endpoint is activated.

## Boundary

- Public initial intake remains unchanged and keeps its strict existing allowlist.
- These optional fields are intended only for a future authenticated client workspace after human review and verified matter access.
- This module validates data shape only. It is not authentication or authorization; every future API must independently verify the session, matter relationship, role, and RLS policy before reading or writing.
- All fields are optional. An authorized reviewer decides which fields are necessary for a specific matter.
- Dates retain their original calendar (`gregorian` or `jalali`) and are not converted here. Gregorian dates are checked against actual month lengths and leap years. Jalali dates are validated with the runtime Persian calendar only within years 1179–1634 (Gregorian 1800–2256), where it agrees with the Borkowski Jalaali algorithm; dates outside that verified range are rejected rather than guessed. This does not calculate legal deadlines.
- The canonical schema is versioned as `mavis-matter-{caseType}-v1`; the existing `secure-matter-fields.mjs` remains the single source of field definitions. No parallel questionnaire schema is introduced.
- Successful validation explicitly returns `collectionStage: post_approval`, `requiresHumanApproval: true`, and `deadlineCalculated: false`.
- Amounts remain decimal strings to avoid floating-point rounding. Currency is a three-letter code.

## Category coverage

- Civil/contract: instrument, party role, obligations, breach, amount/currency, payments/notices, authority and hearing.
- Criminal: procedural role, event city/date, authority, notice/service/attendance dates, and minimal safety-contact preference. No guilt classification or deadline calculation.
- Family: request type, prior judgment/agreement, child age bands only, safety concern and safe-contact preference. No detailed child profiles.
- Property: city, property type, basis of title/possession, transaction date and known registration status.
- Commercial: organization type, user's role/authority, instrument, amount/currency and counterparty role.
- Labor: party role, employment/dismissal dates, contract/insurance status, benefit category, amount/currency and authority.
- Administrative: issuing body, decision type, issue/notification dates, requested review route, authority, branch and case reference.

## Explicit exclusions

Passwords, OTPs, national identifiers, bank/card data, access/refresh tokens, private keys, file uploads and attachments are rejected. No client password is created or handled by this module. Client credentials belong in a future identity-provider flow; office staff must never see a client's password.

## Activation gates

1. Implement the authenticated invitation and identity-verification lifecycle.
2. Verify provider configuration, MFA, session revocation and account recovery.
3. Add server-side matter-level authorization and RLS tests for cross-client isolation.
4. Define approved retention and legal/privacy basis.
5. Add encrypted private storage and document-specific ACLs only after threat modeling.
6. Build a compact, accessible, RTL follow-up form only after the above gates.
7. Run integration, abuse, authorization and restore tests before any production activation.
