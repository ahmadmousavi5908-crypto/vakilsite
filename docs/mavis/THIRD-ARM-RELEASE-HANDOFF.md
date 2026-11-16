# MAVIS Third-Arm Release Handoff

Last verified: 2026-11-16
Repository: `ahmadmousavi5908-crypto/vakilsite`
Production site: `https://vakilahmadmousavi.ir`

## Delivered

- PR #137 is merged into `main`.
- Editorial CMS: `/admin/mavis/articles`.
- Public article library: `/articles/library`.
- Editorial workflow includes Crossref, Semantic Scholar and OpenAlex discovery; source candidate queues; versioned drafts; review and approval; manual publication; archive and restore.
- The approved public-site appearance was not redesigned.
- Production deployment remains manual-only.
- Duplicate legacy workflow `.github/workflows/deploy-cloudflare-production.yml` was identified as pinning an obsolete branch and was disabled on current main. Only `.github/workflows/deploy-cloudflare.yml` is the active production deployment workflow.
- Full current-main site quality checks passed on handoff commit `8616f1e`: lint, production build, legal-library HTTP routes, and the MAVIS offline, intake, Search Console, Iranian legal-source search, editorial-core and knowledge-retrieval test suites. Run: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43874513389.

## Production Worker deployment evidence

- A Cloudflare deployment succeeded in run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43872348677, but it checked out the older commit `f05197780a993babaa99fc2c04179260e5e8b7d8`.
- Previously verified deployed source commit: `3da6654661787722074f91eea7bc6d42870964b0`.
- Worker: `vakilahmadmousavi-ir`.
- Previously verified Cloudflare version: `b70c6256-b33c-40ee-8396-89b026694441`.
- Previously measured compressed Worker bundle: 1.51 MiB, below the 3 MiB Free limit.
- The latest deployment workflow changes on current main have NOT yet been exercised by a deployment from current main. The successful run above predates the runtime-secret propagation commits.
- The current workflow uses Wrangler's documented `wrangler deploy --secrets-file` option. Cloudflare documents JSON and dotenv input formats and confirms that secrets omitted from the file are preserved from the previous Worker version: https://developers.cloudflare.com/workers/wrangler/commands/workers/ and https://developers.cloudflare.com/workers/configuration/secrets/.
- Read-only Production Worker secret inventory succeeded in run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43875499167. The Worker currently has 0/4 Google Search Console secrets, 0/1 Iranian source-search key and 0/1 Editorial AI key. The local growth audit requires no external secret. This reports Worker state only; it does not reveal whether the corresponding GitHub repository secrets are already configured.
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

## Staging runtime integration audit

Read-only inspection run: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43875193634

- The Staging Worker secret-name inspection completed successfully without reading or printing secret values.
- The Staging Worker reported no configured candidates for Google Search Console OAuth (0/4), Iranian legal source search (0/1), or Editorial AI (0/1). The local growth audit correctly reported `LOCAL_ONLY`; it requires no external provider key.
- Staging database inspection confirmed the Search Console connection table and editorial AI rate-limit table exist, but no Search Console connection record is configured.
- Aggregate CMS inventory was empty at inspection time (0 editorial articles, 0 legacy articles, 0 sources, 0 source candidates, 0 versions, 0 approvals); all temporary E2E article, source and identity counts were zero.
- Live metadata-only discovery passed for Crossref (5 candidates) and OpenAlex (5 candidates). Semantic Scholar was rate-limited and reported a warning; it is optional in this smoke test.
- These findings apply to the Staging Worker only. They do not establish whether the Production Worker has runtime secrets configured.

## Runtime secret propagation

The manual Cloudflare deployment workflow on current main supports syncing optional runtime secrets from GitHub Actions repository secrets to the Worker during the same deployment:

- `MAVIS_OPENAI_API_KEY`
- `MAVIS_IRAN_SOURCE_SEARCH_API_KEY`
- `MAVIS_GSC_CLIENT_ID`
- `MAVIS_GSC_CLIENT_SECRET`
- `MAVIS_GSC_REFRESH_TOKEN`
- `MAVIS_GSC_SITE_URL`

The four Search Console credentials are validated as an all-or-none group. Missing optional secrets are omitted, not deleted from the existing Worker. Values are written to a temporary mode-0600 JSON file and are not printed to logs. This current-main workflow has not yet been exercised by a deployment. The duplicate legacy workflow is disabled to prevent accidental deployment of the obsolete branch.

## Staging deployment secret synchronization

- The isolated Staging deploy workflow now prepares the same optional MAVIS runtime secret set in a mode-0600 temporary JSON file and deploys it with Wrangler's documented `--secrets-file` option.
- It validates the four Google Search Console values as an all-or-none group and never prints secret values.
- Site quality checks passed after the Staging deploy workflow, Production read-only inventory workflow, and their trigger were committed: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43875499254.
- The workflow is manual-only and has not yet been dispatched after this change. Before dispatch, configure the required Staging environment secrets if the corresponding integrations are to be enabled.

## Production secret inventory

- A new read-only workflow inventories the Production Worker's secret names without exposing values or changing Worker state.
- Run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43875499167 succeeded and confirmed all optional MAVIS runtime secret groups are currently absent from the Production Worker.
- The active Production deployment workflow reads these optional values from GitHub repository Actions secrets. The next manual deployment from current main will synchronize any values that are configured there.

## Remaining release gates

1. Confirm and, if needed, add `production / SUPABASE_PRODUCTION_DB_URL`; the latest Production migration log showed it empty. Never paste its value into chat.
2. Confirm a current recoverable Production backup.
3. Dispatch the Production migration workflow from current main with both booleans false; inspect the full history, SQL parity and dry-run output.
4. Apply Migration 019 only after the dry-run confirms it is the sole pending migration and the backup is independently confirmed; verify remote migration history afterward.
5. Configure the optional runtime secrets as GitHub repository Actions secrets, then dispatch the Cloudflare deployment workflow from current main to sync them. The Worker currently has none of these secrets.
6. Verify live public routes, admin login, authenticated CMS access, source discovery, AI drafting, Search Console read-only analytics, and manual article lifecycle.
7. Confirm there is no visual regression.

## Guardrails

- Do not merge historical PR #119.
- Do not enable automatic Production deployment on push.
- Do not repair migration history or apply migrations based on the superseded Staging baseline report.
- Do not claim end-to-end Production completion until the Production migration, current-main Worker deployment, runtime integration tests, and live route/admin checks are all evidenced.
