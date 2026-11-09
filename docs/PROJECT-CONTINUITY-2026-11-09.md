# Project Continuity Checkpoint — 2026-11-09

**Purpose:** Durable handoff for future sessions. This file is a navigation index, not a substitute for checking live Git refs and CI.

## Repository and active work

- Repository: `ahmadmousavi5908-crypto/vakilsite`
- Active branch: `feature/mavis-final-verification-20261109`
- PR: [#76](https://github.com/ahmadmousavi5908-crypto/vakilsite/pull/76)
- PR base: `integration/mavis-mvp-candidate-20261108`
- PR state at checkpoint: open, Draft, not merged.
- Latest code/test commit: `817a1cc9b502a0e5a898aed68b837623aac29b55`. Docs-only checkpoint commits followed (`0627134...`, `a2ecf19...`, `5673b8e...`); always query the live branch head before resuming.
- No production deployment, live database migration, public chat activation, automatic publication, or visual redesign is authorized by this work.

## Immediate technical status

### Mother Two ingestion

- Read-only inventory and quarantine staging scripts exist.
- Docling Slim parser and bounded JSON parser exist.
- L0 staging remains isolated from L1 parsing and L2 human approval/search indexing.
- The real local Mother Two archive has not been inventoried or ingested in this environment.
- OCR is optional and must run in an isolated offline-capable worker; no original archive is modified.

### OCR verification — known failure and corrective change

- Latest OCR workflow before corrective change: run `42657899405`, failed on commit `9a59d4b825b9e466033c7d9f295d17fa69bd04c0`.
- Root cause from job log: Docling OCR bitmap-area detection imports SciPy, but `requirements-mavis-docling-ocr.txt` included only `models-local`.
- Corrective change committed: add Docling `convert-core` extra alongside `models-local`; improve OCR test diagnostics to report parser status rather than masking conversion failure with KeyError.
- Corrective commit: `8900316788cc015cb183bc3c71397eb6336eea62` (requirements) and `b72e0b5d691e0bc1a0058d1d8abc2e3b11b730cb` (test).
- Next action: inspect the newest OCR workflow on the current branch. Do not claim OCR works until a green end-to-end run proves Persian and English text extraction from the synthetic image-only PDF.

### Latest verification work — 2026-11-09

- Commit `f6283dae71f84410916d222bdf566980d2880b66` changed the Mother Two inventory CLI to emit only a fixed completion message, keeping archive-derived metadata in the private report. This addresses terminal-log exposure; it does not establish archive content safety by itself.
- Added a CLI regression test in commit `9638fe06e1c9dd6b3bc81a3dc4b91b1c939c4225`.
- That test run failed because its expected output encoded a literal `\\n` rather than a newline. The failure was isolated to the test assertion, not the inventory implementation.
- Corrected the assertion in commit `817a1cc9b502a0e5a898aed68b837623aac29b55`. Latest check runs for this exact SHA were queued when this checkpoint was written; do not report them as passed until completed.
- On parent commit `9638fe06e1c9dd6b3bc81a3dc4b91b1c939c4225`, Site Quality and CodeQL completed successfully; MAVIS Knowledge Search failed at the CLI regression test. These are historical results for the parent SHA, not current-head validation.

## Existing CI evidence

- Deterministic knowledge search workflow run `42657899417` on `9a59d4b8`: success.
- Main verification workflow run `42657422693` on `0013bdad`: success.
- Docling native runtime run `42657138833` on `1abc07a4`: success.
- The above are historical run IDs; always inspect current head and newest run before citing them as current validation.

## Follow-up verification and operational handoff — 2026-11-09

- Latest branch head before this checkpoint refresh: `5673b8e238e9f8d1df54e811cbb1adcc944c60c2`; the Termux handoff in `docs/mavis/62-mother-two-quarantine-staging-contract-2026-11-09.md` was corrected because the CLI intentionally emits a fixed non-sensitive line, not JSON or a report path. The updated procedure now discovers the newest private report and verifies its SHA-256 without printing the report path.
- OCR synthetic image-only PDF test passed in run `42659774023`, including Persian-script and English-text assertions. Docling native runtime smoke test passed in run `42659763701`. Neither run proves OCR quality on real Mother Two documents.
- Site performance baseline run `42663947951` passed and uploaded 24 Lighthouse report files for home, about, articles and legal-library routes. Per-route scores and budget thresholds still need extraction and review.
- CodeQL meta-check on commit `9638fe06e1c9dd6b3bc81a3dc4b91b1c939c4225` passed with “No new alerts in code changed by this pull request”; the earlier high alert on `e80a33f...` was not reproduced as a new alert on that later commit. This does not prove there are no open repository alerts; the code-scanning alerts collection could not be read through the available connector.
- On commit `817a1cc...`, Site Quality passed; MAVIS and CodeQL runs were cancelled by later pushes before completion. On docs-only commit `a2ecf19...`, workflow runs ended with failure but exposed zero jobs/check-runs, so treat that SHA as unvalidated. Latest runs for `5673b8e...` were queued at checkpoint time; poll them before claiming success.
- PR #76 is open and Draft, not merged. Live API reports base `integration/mavis-mvp-candidate-20261108`, 260 commits ahead, 1 behind, 128 changed files, +15,518/-67 lines, and mergeable=false / dirty. Do not retarget or merge without reviewing the intended base and full diff.
- Both PR base branch `integration/mavis-mvp-candidate-20261108` and `main` currently report branch protection disabled with no required status checks. Do not treat green CI as an enforced merge gate; protection policy needs owner approval and configuration.
- Local Termux and the actual Mother Two archive remain inaccessible from this environment. The exact local archive path must be confirmed before inventory; no local inventory, staging, restore or real-document OCR has been performed.

## Agent and skill inventory

- Existing `.agents/skills/dignified-python` upstream Python standards.
- Existing `.agents/skills/mavis-docling-ingestion` quarantine/parser workflow.
- Added `.agents/skills/vercel-react-best-practices` from `vercel-labs/agent-skills`, upstream commit `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`; upstream skill declares MIT. Includes the skill, complete AGENTS rulebook, README, metadata, and selected critical rule references.
- Four skills are routed in `.agents/skills/skill-router.json`: `dignified-python`, `mavis-docling-ingestion`, `vercel-react-best-practices`, and `vakilsite-search-quality`.
- Seven repository-level Copilot agent profiles exist under `.github/agents`: search growth, performance, legal evidence, continuity, retrieval, security/privacy, and design guard.
- Read-only reviewers are explicitly restricted to `read` and `search`; the continuity agent is limited to documentation-oriented tools. These are repository definitions, not proof that Copilot seats, CLI, or cloud-agent execution are enabled for the account.
- Do not install a large SEO desktop application into the Next.js runtime. Scrawly crawler is a separate MIT desktop project and should be evaluated in an isolated audit environment before adoption.

## Search / SEO research decisions

- Google's official 2026 AI Search guidance says ordinary SEO fundamentals remain the basis for AI Overviews and AI Mode; no special GEO schema or llms.txt is required.
- Google News sitemap is only for genuine news publishers and recent articles (last 48 hours); evergreen legal explainers do not automatically qualify.
- Do not chase fake AI citation metrics, fabricated mentions, doorway pages, or unsupported schema.
- Official sources are linked in `docs/seo/09-google-search-generative-ai-and-news-2026-11-09.md` and the `vakilsite-search-quality` skill.

## Project safety and design constraints

- Preserve the approved Mother Two site appearance and existing content.
- Reuse the canonical legal library; do not create a parallel corpus.
- Public Legal Chat remains disabled unless provider eligibility, privacy, legal, and security gates pass.
- Client and case data never enter public or growth retrieval.
- No secrets in Git, docs, prompts, logs, manifests, or generated knowledge.
- Termux is the final integration/verification stage, not the first development environment.
- User may close the chat at any time; all meaningful state must be committed and reflected here.

## Next exact actions

1. Inspect all checks for exact head `817a1cc9b502a0e5a898aed68b837623aac29b55`; resolve any new failure from logs before proceeding.
2. Re-run only failed jobs when appropriate; do not rerun successful jobs unnecessarily.
3. Resolve the OCR workflow failure; require a green Persian OCR end-to-end test.
4. Audit current site metadata, sitemap, robots, JSON-LD, page templates, and route performance before changing application code.
5. Establish Lighthouse and bundle baselines on production build; only then select optimizations.
6. Inspect Scrawly source/license/security/dependencies and determine whether its crawl engine can be run safely as an isolated audit tool. Do not install its desktop UI as a runtime dependency.
7. Prepare the single safe Termux Mother Two inventory/staging procedure; user runs it locally because the archive is not accessible in this environment.
8. Update this checkpoint after every milestone with exact commit and CI evidence.

## Status reporting contract

Report separate completion percentages for implementation, automated validation, real-data integration, security review, and production readiness. Never combine them into one inflated completion number. Mark unavailable credentials, unrun tests, and user-local steps explicitly.
