# MAVIS Third-Arm Release Handoff

Last verified: 2026-11-16
Repository: `ahmadmousavi5908-crypto/vakilsite`
Production site: `https://vakilahmadmousavi.ir`
Main commit: `7a74ca4ca6a3cb571dd050d178ed9142f8463d7c`

## Delivered to main

- PR #137 was squash-merged into `main`.
- The MAVIS editorial CMS is available in the application source at `/admin/mavis/articles`.
- The public article library route is `/articles/library`.
- The editorial workflow includes multi-provider metadata discovery (Crossref, Semantic Scholar, OpenAlex), source candidate management, draft/version/review/approval, manual publication, archive and restore.
- Existing public articles were not overwritten by the CMS import workflow.
- Existing approved site appearance was not intentionally redesigned.
- Production Cloudflare deployment is now manual-only. A push to `main` does not automatically deploy the Worker.

## Verified evidence

- Site quality and production build passed on main: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43866674077
- Staging migration history parity and dry-run passed: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43866673822
- PR database tests passed: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43866380484
- PR Cloudflare compatibility audit passed: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43866380189
- Earlier authenticated Staging editorial E2E completed the draft/review/approve/publish/public-read/unpublish/archive/restore/republish lifecycle: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43864813095
- Earlier Staging integration inspection returned metadata from Crossref, Semantic Scholar and OpenAlex: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43864813193

## Not yet deployed to production

No Production database migration or Cloudflare Worker deployment has been run. Do not describe the live site as updated until the manual deployment and live route checks pass.

### Required credentials

1. GitHub Actions repository secret `CLOUDFLARE_API_TOKEN` for the Cloudflare production deploy workflow.
2. GitHub Actions environment secret `production / SUPABASE_PRODUCTION_DB_URL` for the guarded Production migration workflow.
3. Optional deploy-time verification secrets: `INDEXNOW_KEY`, `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`.
4. Runtime integration credentials are separate from deployment credentials. Configure only the provider credentials actually used by the runtime: OpenAI, Iranian source search, growth search and Google Search Console. Never commit values to this repository or paste secrets into chat.

## Safe release order

1. Confirm a current, recoverable Supabase Production backup exists.
2. Add the two required GitHub secrets in their specified scopes. Never disclose secret values in logs or chat.
3. Run GitHub Actions workflow **Migrate MAVIS production database** from `main` with `apply_migrations=false` first. Review the production migration history, SQL parity and dry-run output.
4. Only after confirming the dry-run contains exactly the intended Migration 019 and the backup is recoverable, run the same workflow with `apply_migrations=true` and `backup_confirmed=true`.
5. Confirm the post-migration history includes Migration 019.
6. Run GitHub Actions workflow **Deploy Vakilsite to Cloudflare Workers** manually from `main`.
7. Verify the production home page, `/articles`, `/articles/library`, `/admin/login`, and authenticated `/admin/mavis/articles`. Confirm no visual regression and no runtime errors.
8. Configure and independently test provider integrations. A successful site deployment does not imply OpenAI, Iranian search, growth search or Search Console credentials are configured.

## Operational guardrails

- Do not merge the historical oversized PR #119.
- Do not enable automatic Production deployment on push.
- Do not run Production migrations without the backup confirmation and a reviewed dry-run.
- Do not claim the public site displays the new routes until the Worker deployment and live HTTP/browser checks are observed.
- Continue from the current `main` commit above; do not recreate PR #137 or repeat its completed implementation.
