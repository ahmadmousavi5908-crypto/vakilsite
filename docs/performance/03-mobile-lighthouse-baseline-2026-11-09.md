# Project Continuity Checkpoint — 2026-11-09

**Purpose:** Durable handoff for future sessions. This file is a navigation index, not a substitute for checking live Git refs and CI.

## Repository and active work

- Repository: `ahmadmousavi5908-crypto/vakilsite`
- Active branch: `feature/mavis-final-verification-20261109`
- PR: [#76](https://github.com/ahmadmousavi5908-crypto/vakilsite/pull/76)
- PR base: `integration/mavis-mvp-candidate-20261108`
- PR state at checkpoint: open, Draft, not merged.
- Latest fully checked code head before this reconciliation commit: `b18b32ad776253960a884fa0567ee24638539770`; this commit records the candidate base as an additional parent and includes the next verification fixes. Always query the live branch head before resuming.
- No production deployment, live database migration, public chat activation, automatic publication, or visual redesign is authorized by this work.

## Immediate technical status

### Mother Two ingestion

- Read-only inventory and quarantine staging scripts exist.
- Docling Slim parser and bounded JSON parser exist.
- L0 staging remains isolated from L1 parsing and L2 human approval/search indexing.
- The real local Mother Two archive has not been inventoried or ingested in this environment.
- OCR is optional and must run in an isolated offline-capable worker; no original archive is modified.

### OCR verification — synthetic Persian and English smoke test

- Historical OCR failure was caused by the missing Docling `convert-core` extra; that dependency was added and the native parser smoke test passed.
- Synthetic image-only PDF OCR run `42659774023` passed with local Docling artifacts and Tesseract `fas+eng`; native Docling runtime run `42659763701` also passed.
- The previous OCR assertion only required one character from the Arabic Unicode block. This reconciliation strengthens the test to require the meaningful Persian tokens `قانون` and `ماویس` after normalizing Arabic/Persian yeh and kaf. The strengthened assertion requires a new green OCR workflow before claiming Persian text recognition is adequately validated.
- No real Mother Two document has been OCR-processed in this environment.

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

- Termux handoff corrected: inventory CLI emits a fixed non-sensitive completion line, so the procedure now discovers the latest private report and verifies its SHA-256 instead of parsing stdout as JSON.
- The default archive path in the Termux procedure is the saved full archive `$HOME/downloads/vakilsite-backups/VAKILSITE-MOTHER-TWO-UPDATED-20261106-full.tar.gz`; `MOTHER_TWO_ARCHIVE` may override it only after local path verification. The inventory CLI now requires explicit `--archive` and refuses a symlink output directory.
- The actual archive remains local to Termux. No inventory, staging, restore, or real-document OCR has been performed here.
- On `b18b32a...`, Site Quality passed (run `42673106356`), CodeQL passed all three language jobs (run `42673106580`), and the CodeQL meta-check reported “No new alerts in code changed by this pull request.” This is not a full open-alert inventory.
- Production performance baseline passed (run `42673106331`, artifact `13698433416`). Three-pass mobile medians are recorded in `docs/performance/03-mobile-lighthouse-baseline-2026-11-09.md`. Font resource hints reduced legal-library CLS from 0.145 to 0.001 and raised its Performance score from 92 to 100.
- The same Lighthouse trace identified the home and about attorney images as LCP elements while their HTML still used `loading="lazy"` despite high fetch priority. This checkpoint adds eager loading and mandatory HTML assertions; a new performance run must confirm the result.
- MAVIS deterministic workflow run `42673106618` ended as failure with zero jobs and zero check-runs; its failed-job rerun was rejected because no failed job exists. This is not evidence of a test assertion failure. The Site Quality workflow is expanded to run the MAVIS Node/Python regression suites as a reliable parallel gate; the dedicated MAVIS workflow still needs a manual workflow dispatch if it again creates no job.
- The candidate base commit `60a5e2e...` touched 53 files that overlap the feature branch. All 53 paths were compared; the feature branch contains the newer/superset implementation in the security-sensitive areas (personal-path redaction, no metadata in stdout, archive mutation checks, richer tests, and Search Console aggregation). This reconciliation commit records the candidate base as a second parent while preserving the reviewed feature tree; verify the live PR mergeability after the ref update.
- PR #76 remains open and Draft. Before this reconciliation commit, live API reported 264 commits ahead, 1 behind, and `mergeable_state=dirty`. Do not merge the PR; verify the new ahead/behind and mergeability values after the update.
- Both `integration/mavis-mvp-candidate-20261108` and `main` report branch protection disabled. Required checks are therefore not enforced; branch protection/rulesets require repository-owner approval and configuration.

## Agent and skill inventory

- Existing `.agents/skills/dignified-python` upstream Python standards.
- Existing `.agents/skills/mavis-docling-ingestion` quarantine/parser workflow.
- The Vercel React Best Practices vendor copy was removed on 2026-11-10 because the pinned upstream repository lacks a standalone LICENSE file and clear copyright-holder notice. Only `.agents/skills/vercel-react-best-practices/UPSTREAM.md` remains as a licensing audit record; the skill is not registered or used.
- Three skills are routed in `.agents/skills/skill-router.json`: `dignified-python`, `mavis-docling-ingestion`, and `vakilsite-search-quality`.
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

1. Poll the new reconciliation commit's Site Quality, CodeQL, Persian OCR, Docling runtime and performance workflows. Site Quality now runs the MAVIS deterministic, provider, Search Console, growth, legal-review, Docling-ingestion, matter-field, inventory and staging regression suites.
2. Inspect the strengthened Persian OCR assertion. If it fails, fix OCR language/model/image preprocessing rather than weakening the assertion.
3. Review the new Lighthouse reports. Confirm home/about LCP improves after eager image loading without changing image quality, crop, layout or appearance.
4. Recheck PR #76 live base/head, behind count, mergeability and changed-file scope. Keep it Draft and unmerged until every check and owner approval is complete.
5. Run the explicit Termux inventory against the verified full Mother Two archive; check archive hash, private report checksum, symlink handling and redacted client paths. Then run staging dry-run and review every selected file before actual staging.
6. Run real-document OCR only on approved staged copies. Keep all outputs L0/L1 review-only, non-indexed and non-retrievable until legal rights, confidentiality, provenance and human approval are complete.
7. Confirm repository branch protection/rulesets with the owner; no production deployment, public chat activation, external provider activation or automatic publication without explicit release approval.

