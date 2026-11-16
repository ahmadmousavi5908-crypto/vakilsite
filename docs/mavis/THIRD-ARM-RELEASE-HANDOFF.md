# MAVIS Third-Arm Release Handoff

Last verified: 2026-11-16
Repository: `ahmadmousavi5908-crypto/vakilsite`
Production site: `https://vakilahmadmousavi.ir`
Current main after handoff reconciliation: `8616f1e6e88b74a6d71299b927580bada2baa985`

## Delivered

- PR #137 is merged into `main`.
- Editorial CMS: `/admin/mavis/articles`.
- Public article library: `/articles/library`.
- Editorial workflow includes Crossref, Semantic Scholar and OpenAlex discovery; source candidate queues; versioned drafts; review and approval; manual publication; archive and restore.
- The approved public-site appearance was not redesigned.
- Production deployment remains manual-only.
- Full current-main site quality checks passed on handoff commit `8616f1e`: lint, production build, legal-library HTTP routes, and the MAVIS offline, intake, Search Console, Iranian legal-source search, editorial-core and knowledge-retrieval test suites. Run: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43874513389.

## Production Worker deployment evidence

- A Cloudflare deployment succeeded in run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43872348677, but it checked out the older commit `f05197780a993babaa99fc2c04179260e5e8b7d8`.
- Previously verified deployed source commit: `3da6654661787722074f91eea7bc6d42870964b0`.
- Worker: `vakilahmadmousavi-ir`.
- Previously verified Cloudflare version: `b70c6256-b33c-40ee-8396-89b026694441`.
- Previously measured compressed Worker bundle: 1.51 MiB, below the 3 MiB Free limit.
- The latest deployment workflow changes on current main have NOT yet been exercised by a deployment from current main. The successful run above predates the runtime-secret propagation commits.
- The current workflow uses Wrangler's documented `wrangler deploy --secrets-file` option. Cloudflare documents JSON and dotenv input formats and confirms that secrets omitted from the file are preserved from the previous Worker version: https://developers.cloudflare.com/workers/wrangler/commands/workers/ and https://developers.cloudflare.com/workers/configuration/secrets/.
- Live browser verification of `/`, `/articles/library`, `/admin/login` and authenticated `/admin/mavis/articles` is still outstanding.

## Database status: PRODUCTION NOT RELEASED

- Production migration run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43869600250 failed at credential validation, including its third attempt.
- Its latest job log shows `SUPABASE_PRODUCTION_DB_URL` empty in the `production` GitHub Environment. The CLI, remote history check, dry-run and apply steps were all skipped. No migration was applied by that run.
- Required secret scope: GitHub Actions Environment `production`, secret `SUPABASE_PRODUCTION_DB_URL`. Never paste its value into chat.
- The workflow is intentionally restricted to the expected production Supabase project and permits only Migration 019 after history and SQL parity checks.
- Do not enable `apply_migrations` until the dry-run confirms exactly Migration 019 and a current recoverable backup has been independently confirmed.

## Staging database: VERIFIED CURRENT BASELINE

- Latest Staging migration verification: run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43866673822.
- Staging remote history contains 18 applied migrations; all 18 local SQL files match the applied history after comment and whitespace normalization.
- Supabase CLI dry-run reported: `Remote database is up to date.`
- The migration Apply and post-apply steps were skipped intentionally; no new migration was applied in this verification.
- Earlier read-only inspection run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43774988242 reported an empty history and missing editorial table. That is historical evidence from an older branch/baseline, not the current Staging state. Do not use that older report as a reason to repair history or apply migrations.
- Authenticated editorial E2E passed in run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43864813095:
  - Authenticated Staging administrator successfully.
  - Versioned static draft and HTTPS manual research source accepted without authority claim.
  - Existing static article imported as a versioned draft and hidden from anonymous readers.
  - Full lifecycle passed: draft → review → approval → publish → public read → unpublish → archive → restore → republish → unpublish.
  - Anonymous readers saw only published rows and approved public columns; private draft fields remained denied.
  - All temporary E2E records and identity were removed.
- The E2E runner's configured Staging database URI failed authentication once, then its password-based Staging fallback authenticated successfully. The test completed and cleaned up; keep this fallback detail visible for future credential hygiene.

## Runtime secret propagation

The manual Cloudflare deployment workflow on current main supports syncing optional runtime secrets from GitHub Actions repository secrets to the Worker during the same deployment:

- `MAVIS_OPENAI_API_KEY`
- `MAVIS_IRAN_SOURCE_SEARCH_API_KEY`
- `MAVIS_GSC_CLIENT_ID`
- `MAVIS_GSC_CLIENT_SECRET`
- `MAVIS_GSC_REFRESH_TOKEN`
- `MAVIS_GSC_SITE_URL`

The four Search Console credentials are validated as an all-or-none group. Missing optional secrets are omitted, not deleted from the existing Worker. Values are written to a temporary mode-0600 JSON file and are not printed to logs. This current-main workflow has not yet been exercised by a deployment.

## Remaining release gates

1. Confirm and, if needed, add `production / SUPABASE_PRODUCTION_DB_URL`; never paste its value into chat.
2. Confirm a current recoverable Production backup.
3. Dispatch the Production migration workflow from current main with both booleans false; inspect the full history, SQL parity and dry-run output.
4. Apply Migration 019 only after the dry-run confirms it is the sole pending migration and the backup is independently confirmed; verify remote migration history afterward.
5. Configure optional runtime secrets in GitHub repository Actions secrets, then dispatch the Cloudflare deployment workflow from current main to sync them.
6. Verify live public routes, admin login, authenticated CMS access, source discovery, AI drafting, Search Console read-only analytics, and manual article lifecycle.
7. Confirm there is no visual regression.

## Guardrails

- Do not merge historical PR #119.
- Do not enable automatic Production deployment on push.
- Do not repair migration history or apply migrations based on the superseded Staging baseline report.
- Do not claim end-to-end Production completion until the Production migration, current-main Worker deployment, runtime integration tests, and live route/admin checks are all evidenced.
