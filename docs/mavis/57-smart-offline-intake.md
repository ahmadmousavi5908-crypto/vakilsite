# MAVIS Smart Offline Intake — Phase 2

## Purpose

Turn the existing offline intake MVP into a guided reception workflow that collects a structured account from a prospective client and prepares it for human review by the office. This phase remains fully local and does not depend on an LLM, API provider, external database, or server-side runtime.

## User flow

1. The applicant selects one of the eight existing legal subject areas.
2. The role and procedural-stage choices adapt to that subject.
3. Topic questions adapt further to the selected role and stage.
4. A four-step compact flow collects contact details, urgency and matter-specific details, the applicant's narrative and requested help, and separate consents.
5. The applicant reviews a locally generated report before choosing to copy it or open WhatsApp.
6. The report separates the applicant's own account from the office-facing intake summary.

## Local triage rules

- Priority labels are based only on the applicant's explicit urgency, requested contact window, and selected immediate-situation flags.
- The rules do not calculate statutory or procedural deadlines, infer legal risk, assess the merits, or decide whether representation should be accepted.
- Priority means a suggested human-review queue only. It is not a confirmed appointment, case registration, or lawyer assignment.
- The report lists missing optional information and unanswered required topic questions for follow-up.

## Privacy and operational boundary

- No intake answers are sent to an API, database, analytics service, or browser storage.
- No documents are uploaded.
- The local reference string identifies only the generated draft; it is not a server-side tracking number.
- WhatsApp opening and message transfer require an explicit user action and connectivity.
- The office WhatsApp destination must be verified against the actual office contact before production publication.
- The report clearly states that it has not yet been delivered to the office.

## Next phase gates

1. Test the four-step form on mobile and desktop, including keyboard navigation and screen-reader labels.
2. Verify service-worker cold caching and a real offline reload on a browser/device.
3. Confirm the official office WhatsApp number.
4. Only after Supabase migration history, private schema, RLS, retention, and admin access are reconciled, design a secure server-backed intake and genuine tracking status.
5. Keep public legal-library retrieval separate from private intake records. No client information may enter public knowledge indexes.

## Acceptance criteria

- All eight subject areas expose topic-appropriate roles and procedural stages.
- Role/stage changes update follow-up questions without losing answers that remain relevant.
- Required questions are validated before generating the report.
- Urgency summary uses only explicit applicant selections.
- Consent for case review and third-party information awareness is required; marketing consent remains optional.
- Existing offline library and search tests continue to pass.
- No false success state, automatic message sending, or claim of lawyer-client relationship is introduced.
