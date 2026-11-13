# MAVIS Offline Intake — Public MVP

## Goal
After a visitor searches the downloaded public legal library, provide a compact, topic-aware intake form that turns the visitor's own answers into a structured message for the lawyer.

## Delivered flow
1. Visitor searches the offline knowledge library.
2. Visitor opens the conditional intake form from the knowledge page.
3. The form asks for contact details, city, topic, role, current stage, urgency, relevant dates, topic-specific details, narrative, requested help and available-document checklist.
4. The visitor separately confirms consent to initial case review and awareness of third-party information. Marketing consent is independent and optional.
5. The browser validates the answers and builds a faithful report with a local reference code.
6. The visitor reviews the draft, clicks to copy it and open the office WhatsApp chat, pastes it, and manually presses Send.

## Offline and privacy boundary
- Form shell, topic-specific questions, validation and message generation work offline after the first successful cache installation.
- No intake data is posted to an API, database, analytics provider, or browser storage.
- The generated reference code exists only in the message. It is not a server-side tracking ID and cannot be used for status lookup.
- WhatsApp delivery requires connectivity and the visitor's explicit manual send action.
- No files or attachments are uploaded in this MVP.
- The WhatsApp phone number currently reuses the existing public assistant fallback 989169165902; deployment owner must verify it in production configuration.
- No national ID, password, banking data, or unnecessary third-party personal information should be collected.
- The applicant's narrative and requested outcome are reproduced as supplied, with basic control-character sanitization. The output must not add legal analysis, merits assessment, or a promise to accept representation.

## Questions and branching
- Common: applicant name, contact number, city, topic, role, procedural stage, urgency, upcoming deadline/hearing, optional file/branch reference, narrative, requested help, document checklist.
- Property: document type, property city, transaction/document date, registry/dispute status.
- Contract: contract type/date, unperformed obligation, notice status.
- Cheque/promissory note: instrument type, issue/due date, non-payment certificate/protest status, approximate amount without bank account details.
- Family: type of claim, prior judgment/agreement, notification/request date, relevant child/custody context.
- Criminal: role, authority/branch, allegation/complaint, summons/hearing date.
- Labor: work relationship, duration, dispute, Labor Office/Social Security status.
- Administrative: agency, challenged act, notification date, prior request/judgment.
- Other: short matter description and relevant parties/authorities.

## Consent separation
- Case-review consent: required.
- Third-party information awareness: required.
- Marketing/educational messages: optional and independent.

## Known limits and next secure phase
This MVP is a client-side message-preparation flow, not secure intake storage or a true tracking system. A later server-backed phase requires confirmed Supabase project configuration, schema and migration-history reconciliation, private schema/table design, RLS, retention policy, admin-only access, rate limiting, backup and real staging tests. Do not claim a request is received by the office until server-side persistence and delivery have been verified.