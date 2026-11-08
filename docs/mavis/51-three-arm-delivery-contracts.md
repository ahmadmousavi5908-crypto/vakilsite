# MAVIS Three-Arm Delivery Contracts

## Shared core
The three arms use one versioned knowledge registry and one provenance model. No parallel legal corpus. The shared core exposes only the minimum public retrieval interface to public surfaces; confidential intake records are never part of the public knowledge index.

## Arm A — Public Intake and Client Guidance
### Responsibilities
- Explain the firm's services and intake process.
- Ask structured, conditional questions and collect only the information necessary for triage.
- Keep all client answers private and separate from public legal knowledge.
- Create a durable case-intake record only after authenticated server-side validation and database success.
- Provide a receipt/tracking reference only after the database confirms persistence.
- Provide a clear offline state: the visitor may read public knowledge offline, but cannot submit an intake or upload documents offline.

### Non-goals
- No legal advice or case assessment in the public intake form.
- No public-browser localStorage/IndexedDB persistence for sensitive answers.
- No silent WhatsApp-only success claim.
- No Growth or public search access to private intake.

### Required gates
Consent separation, data minimization, retention/deletion policy, RLS, object-storage authorization, server-side role checks, audit events, idempotent submission, rate limiting, CSRF/origin checks, duplicate submission protection, outage-safe error handling, and end-to-end database tests.

## Arm B — Lawyer Copilot
### Responsibilities
- Search existing legal-library records deterministically without LLM.
- Present exact provenance, source type, review status, dates, legal instrument metadata and relationships.
- Retrieve statutes, amendments, repeal/supersession, unifying opinions, published judgments, advisory opinions and scholarly commentary as distinct source classes.
- Generate a research memo only when a model is available; every proposition must remain linked to evidence and human review.
- Keep deadline computation disabled until a separately tested rules engine and date/fact validation exist.

### Required gates
Primary-source ingestion, deduplication, version history, amendment graph, effective-date/commencement tracking, source snapshots/hashes, citation validation, conflict handling, retrieval evaluation set, access control, audit, and lawyer approval.

## Arm C — Growth and Content Intelligence
### Responsibilities
- On-demand research using approved Google Search Console, Search/News, Trends, Bing Webmaster and site analytics interfaces.
- Cluster queries by intent, geography, service and funnel stage.
- Recommend content gaps and article briefs with evidence and cannibalization checks.
- Evaluate SEO/AEO/GEO, technical indexability, structured data, conversion and contact journeys.
- Prepare proposals only; publishing and external submission require human approval.

### Required gates
Connector/API access and quotas, least-privilege OAuth, source timestamps, privacy filters, query and page provenance, experiment baselines, conversion measurement, content quality/legal review, duplicate/cannibalization checks, human approval, and rollback.

## Cross-arm failure policy
- LLM quota/outage: deterministic retrieval, static FAQs, form guidance and local validation continue.
- Database outage: no intake receipt or claim of successful submission; local public knowledge remains usable.
- Network outage: only the downloaded offline knowledge surface remains guaranteed.
- Search-source outage: show stale/partial status and last successful sync; never fabricate freshness.
- Secret-provider outage: fail closed for protected actions; never log credentials.

## Release gates
No merge, migration application, production deployment, public intake activation, or external publication until the Mother Two workspace is reconciled, live Supabase schema/auth/RLS/storage settings are inspected, required integration tests pass, and the user explicitly approves the operational change.
