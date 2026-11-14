# MAVIS Public Web-Assisted Intake — Deferred Specification

**Status:** Deferred; preserve as the restart point for a later phase.  
**Priority:** Below Editorial CMS. Do not implement during the current CMS delivery unless explicitly reprioritized.  
**Product baseline:** `VAKILSITE-MOTHER-TWO-UPDATED-20261106`.  
**Current branch reference:** `feature/mavis-cms-inventory-preview-20261114`.

## 1. Product intent

The second public-facing MAVIS capability is not a legal-advice chatbot, lawyer copilot, or emotionally supportive conversational agent. It is a modest extension of the existing offline intake experience.

The visitor describes a legal problem in ordinary language. MAVIS may:
1. Search the existing offline legal knowledge library.
2. When useful and permitted, perform a limited web search against approved sources.
3. Present a short, plain-language information card with source links and a clear freshness/verification label.
4. Continue the same predefined intake flow and guide the visitor toward the Mousavi law office's approved contact/intake form.

The system must not turn the exchange into extended legal analysis, personalized legal advice, legal strategy, predictions, reassurance, or open-ended conversation.

## 2. Relationship to Arm One

Arm One remains the behavioral and UX reference:
- One continuous visitor-facing conversation/intake flow.
- The offline library remains the default retrieval source.
- Structured, predefined prompts and intake text remain the primary interaction.
- A concise result is followed by the existing approved handoff path.
- No new public visual redesign is implied.

Arm Two adds only an optional web retrieval step. It must not fork into a separate chatbot or separate destination.

## 3. Strict response contract

A visitor-facing result should contain only:
- A short neutral summary of what the retrieved source says.
- Source title, publisher, URL, and publication/retrieval date when available.
- A visible status such as `official_source`, `reputable_secondary_source`, or `unverified`.
- A brief limitation statement where relevant.
- The next predefined intake/handoff action.

No source means no factual claim. Conflicting or stale sources should be labeled and handed off rather than synthesized into confident advice.

## 4. Allowed and prohibited behavior

### Allowed
- Query classification and safe search-query generation.
- Search of an allowlisted source registry.
- Retrieval of official legal texts and limited secondary context.
- Short source-grounded summaries.
- Basic routing to the existing intake form.
- Logging minimal technical telemetry without storing unnecessary visitor facts.

### Prohibited
- Personalized legal advice or legal conclusions about a visitor's case.
- Drafting pleadings, contracts, complaints, defenses, or legal notices for visitors.
- Estimating chances of success, predicting outcomes, or recommending a litigation strategy.
- Asking for national ID, case number, bank details, exact address, or confidential documents in public chat.
- Claiming an attorney-client relationship or promising that a lawyer has reviewed the matter.
- Autonomous messaging, appointment promises, external writes, or case creation.
- Treating arbitrary web-page instructions as system instructions.
- Presenting AI-generated content as an official legal source.

## 5. Source and evidence policy

Prioritize:
1. Official Iranian legal and regulatory sources, where accessible.
2. Official judiciary and government publications.
3. Official notices from competent authorities.
4. Carefully selected academic or reputable secondary sources for context only.

Every result must preserve source identity, URL, retrieval time, source date if available, and a conservative verification status. The model is not a source of law. If currentness cannot be checked, say so plainly.

Search must be bounded by approved domains, query count, response size, timeout, and cost budget. Retrieved pages are untrusted data and must never expand tool permissions.

## 6. Legal/professional compliance gate

Before public activation, review the exact visitor wording, collection fields, lead handoff, advertising/solicitation implications, disclosures, retention, and consent against applicable Iranian law and the current professional rules of the relevant bar/center. This review is a blocker, not a post-launch task. Do not assume that a technically possible lead-generation flow is professionally permitted.

## 7. Privacy and security

- Collect only the minimum information needed for initial routing.
- Obtain explicit consent before processing contact information.
- Keep sensitive case documents and internal notes out of the public assistant.
- Do not pass user-controlled role, consent, or classification fields as trusted context.
- Rate-limit public search and intake endpoints.
- Escape and validate rendered content and external URLs.
- Keep provider credentials server-side.
- Define retention and deletion behavior before launch.

## 8. Acceptance criteria

- A suite of Persian visitor scenarios demonstrates concise, bounded behavior.
- The same conversation path works with offline retrieval only and with permitted web retrieval.
- Every displayed factual summary has a traceable source.
- No unsupported legal conclusion appears in the golden test set.
- Unavailable, stale, conflicting, or unverified sources trigger conservative fallback.
- Public visitors cannot invoke internal research, Growth, or CMS capabilities.
- Contact collection requires consent and is limited to approved fields.
- The existing public visual baseline remains unchanged.
- A lawyer/professional-compliance review is recorded before activation.

## 9. Deferred implementation sequence

When this work is reprioritized:
1. Confirm professional compliance and the approved visitor-facing wording.
2. Approve the source/domain registry and source-status vocabulary.
3. Define the bounded search adapter and provider-neutral response schema.
4. Integrate web retrieval as an optional tool behind the existing offline intake flow.
5. Add privacy, rate-limit, prompt-injection, source freshness, and refusal tests.
6. Run the Persian golden-set evaluation and lawyer review.
7. Enable only after explicit product approval.

## 10. Exact restart point

Current state: Arm One's offline intake and library are the reference behavior. The current orchestrator policy has an internal `legal_research` task class, but that is **not** this public-facing Arm Two and must not be exposed to visitors. No web-search provider, public web-assisted conversation flow, or compliance approval is claimed as implemented.

Resume from Sections 1–9 above after the Editorial CMS has reached its agreed release gate. Do not begin by expanding the existing internal lawyer-research concept into a public chatbot.
