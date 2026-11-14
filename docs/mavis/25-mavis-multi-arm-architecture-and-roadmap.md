# MAVIS Multi-Arm Architecture and Engineering Roadmap

**Date:** 2026-11-14  
**Baseline:** `VAKILSITE-MOTHER-TWO-UPDATED-20261106`  
**Implementation branch:** `feature/mavis-cms-inventory-preview-20261114`  
**Status:** Architecture specification; not a claim that every arm is implemented.

## 1. Non-negotiable preservation boundary

The approved updated mother-two baseline is the only product baseline. The plain/older "mother two" snapshot is not an implementation target.

Existing public-site presentation and approved refinements are protected: homepage composition, typography, colors, header and mobile menu, buttons, floating docks, MAVIS launcher/avatar, contact dock, animations, profile/publication sections, and existing responsive behavior. No agent-engine task may alter those surfaces. New capabilities must first be implemented behind existing server boundaries or as isolated admin capabilities. Any future public UI change requires a separate explicit request and visual regression review.

## 2. Product architecture

MAVIS is one orchestrated system with distinct arms, not a collection of unrelated chatbots. The orchestrator owns identity, policy, context routing, task state, model selection, evidence requirements, and audit events. Arms expose narrow capabilities and cannot bypass the shared policy layer.

### A. Public Legal Intake

Purpose: capture a visitor's initial legal question and relevant facts, provide carefully scoped general information, and prepare a structured handoff for the lawyer.

Capabilities:
- One continuous conversation flow; offline legal-library retrieval is an internal knowledge tool, not a separate destination.
- Progressive fact collection based on matter type, jurisdiction, dates, parties, procedural stage, urgency, and requested outcome.
- Explicit consent before collecting or transmitting contact details or sensitive case documents.
- Structured intake summary with unknowns, contradictions, deadlines requiring human verification, and suggested follow-up questions.
- Human handoff; never create an attorney-client relationship or promise a legal outcome through automated text.

Safety boundary: public intake cannot access private case files, internal lawyer notes, admin CMS controls, or Growth Intelligence data.

### B. Lawyer Legal Research Copilot

Purpose: support the lawyer's research and drafting work with traceable Iranian legal evidence.

Capabilities:
- Search current statutes, amendments, repeal status, binding unifying opinions, published judicial decisions, advisory opinions, official notices, and reputable academic material.
- Track source publisher, original URL, document identifier, publication date, retrieval time, effective period, jurisdiction, authority level, and integrity hash where feasible.
- Separate binding authority, persuasive authority, commentary, and unverified material.
- Detect amendments, repeal, conflicting provisions, inconsistent decisions, missing full text, and temporal validity issues.
- Produce issue trees, fact-to-rule matrices, counterarguments, evidence gaps, procedural timelines, and draft structures.
- Attach a source citation to every material legal proposition. If evidence is unavailable, explicitly abstain instead of inventing a citation.

Safety boundary: no automatic filing, sending, signature, publication, or final legal opinion. Drafts require lawyer review.

### C. Growth Intelligence

Purpose: improve qualified client acquisition and discoverability without polluting the site with thin or repetitive pages.

Capabilities:
- Combine first-party Search Console performance, crawl/index diagnostics, keyword and competitor research, content inventory, internal links, and conversion signals.
- Classify query intent and map topics to canonical pages; detect cannibalization, decay, missing coverage, and weak pages.
- Separate observed first-party metrics from third-party estimates and AI visibility observations.
- Build prioritized experiments with expected impact, confidence, effort, risk, target page, and measurement window.
- Monitor technical SEO, structured data consistency, canonical/sitemap integrity, and internal-link health.
- Recommend content briefs; never publish or modify public content autonomously.

Safety boundary: external SEO metrics are estimates. Search Console measures the site's own search performance, not competitor or universal AI visibility.

### D. Editorial CMS and Research-to-Publication

Purpose: manage a rights-aware editorial pipeline from discovery to reviewed publication.

Capabilities:
- Discover metadata from permitted scholarly/legal sources, RSS, journals, and manually supplied URLs.
- Record original author, publisher, canonical source, publication/revision dates, source rights, licence evidence, and permitted reuse scope.
- Maintain immutable article versions, reviewer comments, approvals tied to an exact version, and append-only audit events.
- Use a controlled workflow: discovered → imported → draft → in_review → approved → published, with changes_requested, rejected, archived, and needs_update states.
- Default all imports to draft. Unknown rights status blocks republication; metadata/link/limited analysis may be used only within applicable permissions.
- Server-side pagination/keyset cursors, indexed filters, duplicate detection, and no static fallback that can resurrect an unpublished article.

Safety boundary: only a separately authorized human publication action can publish. A changed article invalidates approval for the prior version.

## 3. Shared intelligence services

1. **Orchestrator and policy engine:** intent routing, role and purpose checks, capability allowlists, context boundaries, and human-approval gates.
2. **Knowledge retrieval engine:** hybrid lexical/vector retrieval where justified, Persian normalization, metadata filters, source authority ranking, deduplication, reranking, and source freshness.
3. **Evidence ledger:** immutable source snapshots/references, claims-to-evidence links, retrieval timestamp, validity status, and conflict annotations.
4. **Model gateway:** provider-independent adapters, model/task routing, structured output validation, timeout/retry budgets, fallback rules, and cost tracking. A model is never treated as a legal source.
5. **Workflow engine:** durable task state, idempotency keys, retry-safe jobs, cancellation, review queues, and explicit side-effect permissions.
6. **Security and privacy layer:** server-side authorization, RLS, least privilege, secret isolation, PII minimization, retention rules, and audit trails.
7. **Evaluation and observability:** traces, latency, token/cost, retrieval quality, citation coverage, refusal/abstention quality, user handoff, and regression dashboards.

## 4. Request and response contract

Every arm receives a normalized task envelope:

- `task_id`, `conversation_id`, `arm`, `actor_role`, `purpose`, `locale`, `created_at`
- `input`, `context_refs`, `consent_scope`, `data_classification`
- `allowed_tools`, `allowed_side_effects`, `deadline`, `budget`

Every arm returns a typed result:

- `status`: completed | needs_input | needs_review | abstained | failed
- `answer` or `artifact_ref`
- `claims[]` with `evidence_refs[]` and confidence/limitations
- `missing_facts[]`, `conflicts[]`, `warnings[]`
- `proposed_actions[]` (never executed unless independently authorized)
- `usage`, `trace_ref`, `version`

Untrusted retrieved text is data, never an instruction. Prompt injection in documents, websites, or uploaded files must not change tool permissions or system policy.

## 5. Model routing strategy

Do not hardwire the system to one provider or use a multi-model chain for every request. Route by task class:

- Fast/low-cost model: intent classification, query rewriting, metadata extraction, and simple summaries.
- Strong reasoning model: complex legal issue decomposition, conflicting evidence analysis, and multi-step research synthesis.
- Embedding/reranking models: retrieval only, with measured Persian-language quality.
- Deterministic code/rules: access control, date arithmetic, legal-status flags, schema validation, deduplication, and publication gates.

Model selection must be benchmark-driven. Keep provider adapters replaceable; define per-task latency/cost ceilings and fallback behavior. No provider response may bypass evidence checks or publication authorization.

## 6. Evaluation gates before release

Create versioned golden datasets for:
- Iranian legal questions with verified source answers and known abstention cases.
- Intake scenarios with missing, contradictory, and urgent facts.
- Persian spelling variants, Arabic/Persian character normalization, half-space, and long-query retrieval.
- SEO intent classification, canonical mapping, and cannibalization examples.
- CMS rights, duplicate, version, approval, and unpublish edge cases.

Release metrics:
- Citation precision and claim-level evidence coverage.
- Retrieval recall@k and ranking quality by source authority.
- Unsupported-claim and fabricated-citation rate (target: zero in release gate set).
- Correct abstention when sources are absent or contradictory.
- Authorization bypass tests for every role and route.
- p50/p95 latency, failure rate, retry rate, and cost per completed task.
- No public visual regression against the approved updated mother-two baseline.

A model or prompt change that reduces legal evidence quality or access-control safety is a release blocker, even if conversational fluency improves.

## 7. Security model

- Public intake, lawyer copilot, growth intelligence, and editorial CMS have separate data scopes.
- Server-side DAL authorization is required in every Server Action and Route Handler; layouts and hidden UI are not security controls.
- RLS is a second independent boundary. Service-role credentials must not be exposed to clients or used as a shortcut around CMS authorization.
- Sensitive file access is opt-in, purpose-limited, logged, and revocable.
- Every write, approval, publication, unpublication, and role change is attributable and auditable.
- No autonomous external side effects: no publication, email, messaging, case filing, payment, or destructive database operation without explicit authorization.
- Prompt injection and tool-output instructions are treated as untrusted content.

## 8. Delivery sequence

1. **Foundation:** authorization contract, isolated local Supabase stack, pgTAP CI, application negative tests, baseline visual protection.
2. **Knowledge engine:** source registry, normalized metadata, retrieval evaluation, evidence ledger, freshness and conflict handling.
3. **Legal Copilot:** research dossiers, source-aware synthesis, abstention, lawyer review.
4. **Public Intake:** single conversation orchestration, progressive intake, consent, structured handoff.
5. **Growth Intelligence:** first-party analytics connectors, competitor/keyword adapters, prioritized experiments.
6. **Editorial CMS:** rights-aware ingestion, immutable versions, approval and publication gates.
7. **Model gateway and operations:** provider adapters, task routing, tracing, cost budgets, evaluation and rollback.

Each phase has its own tests and feature flag. No phase is considered complete because a UI exists; it is complete only after data, security, failure, and quality tests pass.

## 9. Current implementation status

Implemented/verified in the current PR branch:
- Read-only article catalog preview and CMS data/security specification.
- Fail-closed admin helper with ten isolated unit tests.
- Admin login RPC exception handling.
- Initial profile/admin RLS pgTAP test.
- Local Supabase CLI config, local-only pgTAP seed, and database-test workflow added; workflow execution is pending.

Not yet implemented:
- Production CMS tables and controlled mutation RPCs.
- Source ingestion adapters and evidence ledger.
- Legal Copilot orchestration and model gateway.
- Public intake orchestration and structured handoff.
- Growth Intelligence data integrations and experiment engine.
- Production load, security, and model-quality evaluations.

No production migration, deployment, PR merge, or public-site visual change is authorized by this specification.
