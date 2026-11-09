# Vakilsite and MAVIS repository instructions

- Read the relevant existing source, tests, and project documents before proposing or editing code.
- Preserve the approved Vakilsite visual design, navigation, existing content, and mobile behavior. No visual redesign without explicit approval.
- Project stack currently pins Next.js 16.4.3 and React 19.3.0. Read the installed Next.js documentation under node_modules/next/dist/docs before using or changing framework APIs.
- In Termux, run Next.js with Webpack; do not switch the Android workflow to Turbopack.
- Keep MAVIS modular within the existing application until a measured operational or security reason justifies service separation.
- Reuse the existing canonical legal-library datasets and registry. Do not create a parallel legal corpus.
- Keep Public Legal Chat disabled unless product, provider eligibility, privacy, and security gates are explicitly passed.
- Client/case data must never enter public retrieval, growth analytics, public prompts, logs, or unreviewed exports.
- No automatic publication, production deployment, live database migration, or destructive data operation without explicit approval.
- Legal claims require primary-source verification, jurisdiction, version/effective date, provenance, and human review. Never fabricate citations.
- Prefer deterministic, bounded, auditable code over extra agents, frameworks, dependencies, or background automation.
- Every change must include focused tests. Run lint, relevant unit/integration tests, and production build where applicable; report exact evidence and skipped gates.
- Pin new dependencies and GitHub Actions to reviewed versions/SHAs where feasible. Check license, maintenance, security advisories, runtime compatibility, and bundle impact before adoption.
- Update docs/PROJECT-CONTINUITY-2026-11-09.md after each meaningful milestone with branch, commit, PR, CI run IDs, outcomes, limitations, and the next exact action.
