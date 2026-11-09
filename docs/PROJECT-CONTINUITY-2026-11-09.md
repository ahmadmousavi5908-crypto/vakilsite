# Project Continuity Checkpoint — 2026-11-09

**Purpose:** Durable handoff for future sessions. This file is a navigation index, not a substitute for checking live Git refs and CI.

## Repository and active work

- Repository: `ahmadmousavi5908-crypto/vakilsite`
- Active branch: `feature/mavis-final-verification-20261109`
- PR: [#76](https://github.com/ahmadmousavi5908-crypto/vakilsite/pull/76)
- PR base: `integration/mavis-mvp-candidate-20261108`
- PR state at checkpoint: open, Draft, not merged.
- Last verified head before this checkpoint update: `fe0d8292caa7da254e31701416115ce3dd814b97`
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

### Existing CI evidence

- Deterministic knowledge search workflow run `42657899417` on `9a59d4b8`: success.
- Main verification workflow run `42657422693` on `0013bdad`: success.
- Docling native runtime run `42657138833` on `1abc07a4`: success.
- The above are historical run IDs; always inspect current head and newest run before citing them as current validation.

## Agent and skill inventory

- Existing `.agents/skills/dignified-python` upstream Python standards.
- Existing `.agents/skills/mavis-docling-ingestion` quarantine/parser workflow.
- Added `.agents/skills/vercel-react-best-practices` from `vercel-labs/agent-skills`, upstream commit `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`; upstream skill declares MIT. Includes the skill, complete AGENTS rulebook, README, metadata, and selected critical rule references.
- Search quality skill and specialist Copilot agents are being added in this milestone; verify exact paths and commit after this checkpoint commit.
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

1. Verify current branch head, PR #76 head/base/draft state, and newest GitHub Actions runs.
2. Resolve the OCR workflow failure; require a green Persian OCR end-to-end test.
3. Run full workflow on exact current head; inspect all failed/cancelled jobs and logs.
4. Install and validate the project-specific SEO and performance agent instructions; ensure skill router references all active skills.
5. Audit current site metadata, sitemap, robots, JSON-LD, page templates, and route performance before changing application code.
6. Establish Lighthouse and bundle baselines on production build; only then select optimizations.
7. Inspect Scrawly source/license/security/dependencies and determine whether its crawl engine can be run safely as an isolated audit tool. Do not install its desktop UI as a runtime dependency.
8. Prepare the single safe Termux Mother Two inventory/staging procedure; user runs it locally because the archive is not accessible in this environment.
9. Update this checkpoint after every milestone with exact commit and CI evidence.

## Status reporting contract

Report separate completion percentages for implementation, automated validation, real-data integration, security review, and production readiness. Never combine them into one inflated completion number. Mark unavailable credentials, unrun tests, and user-local steps explicitly.
