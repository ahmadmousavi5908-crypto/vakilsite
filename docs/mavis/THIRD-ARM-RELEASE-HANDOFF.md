# MAVIS Third-Arm Release Handoff

Last verified: 2026-11-16
Repository: `ahmadmousavi5908-crypto/vakilsite`
Production site: `https://vakilahmadmousavi.ir`
Current main after release-workflow hardening: `0c2d59dfab5350e1f07b4243c8fb95a00d1cab6e`

## Delivered

- PR #137 is merged into `main`.
- Editorial CMS: `/admin/mavis/articles`.
- Public article library: `/articles/library`.
- Editorial workflow includes Crossref, Semantic Scholar and OpenAlex discovery; source candidate queues; versioned drafts; review and approval; manual publication; archive and restore.
- The approved public-site appearance was not redesigned.
- Production deployment remains manual-only.

## Production Worker deployment evidence

- Cloudflare deployment succeeded in run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43775079360.
- Deployed source commit: `3da6654661787722074f91eea7bc6d42870964b0`.
- Worker: `vakilahmadmousavi-ir`.
- Cloudflare version: `b70c6256-b33c-40ee-8396-89b026694441`.
- Compressed Worker bundle: 1.51 MiB, below the 3 MiB Free limit.
- The subsequent main commits only hardened deployment secret propagation and this handoff record; they did not change the approved site presentation.
- Live browser verification of `/`, `/articles/library`, `/admin/login` and authenticated `/admin/mavis/articles` is still outstanding.

## Database status: NOT RELEASED

- Production migration run https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43869600250 failed at credential validation.
- Its log shows `SUPABASE_PRODUCTION_DB_URL` was empty in the `production` GitHub Environment. The CLI, remote history check, dry-run and apply steps were all skipped. No migration was applied by that run.
- Required secret scope: GitHub Actions Environment `production`, secret `SUPABASE_PRODUCTION_DB_URL`.
- The workflow is intentionally restricted to the expected production Supabase project and permits only Migration 019 after history and SQL parity checks.
- Do not enable `apply_migrations` until the dry-run confirms exactly Migration 019 and a current recoverable backup has been independently confirmed.

## Staging database findings

Read-only inspection run: https://github.com/ahmadmousavi5908-crypto/vakilsite/actions/runs/43774988242

- The Staging database responded successfully.
- Its migration history was empty.
- Existing objects included `profiles`, `social_links`, `site_settings`, and `mavis_private.knowledge_search_rate_limits`, all with RLS enabled.
- `mavis_editorial_articles` was absent.
- The branch inspected by that workflow previewed migrations 001, 002, 003, 005 and 006. This is a baseline/history mismatch, not permission to apply those migrations blindly.
- The inspected branch predates Migration 019 and must not be treated as the production release source.

## Runtime secret propagation

The manual Cloudflare deployment workflow now supports syncing optional runtime secrets from GitHub Actions repository secrets to the Worker during the same deployment:

- `MAVIS_OPENAI_API_KEY`
- `MAVIS_IRAN_SOURCE_SEARCH_API_KEY`
- `MAVIS_GSC_CLIENT_ID`
- `MAVIS_GSC_CLIENT_SECRET`
- `MAVIS_GSC_REFRESH_TOKEN`
- `MAVIS_GSC_SITE_URL`

The four Search Console credentials are validated as an all-or-none group. Missing optional secrets are omitted, not deleted from the existing Worker. Values are written to a temporary mode-0600 JSON file and are not printed to logs. This change has been committed but has not yet been exercised by a new deployment.

## Remaining release gates

1. Confirm and, if needed, add `production / SUPABASE_PRODUCTION_DB_URL`; never paste its value into chat.
2. Confirm a current recoverable Production backup.
3. Run the Production migration workflow with both booleans false and review its complete dry-run.
4. Apply Migration 019 only after the dry-run and backup checks pass; verify remote migration history afterward.
5. Configure optional runtime secrets in GitHub repository Actions secrets, then run the manual Cloudflare deployment to sync them.
6. Verify live public routes, admin login, authenticated CMS access, source discovery, AI drafting, Search Console read-only analytics, and manual article lifecycle.
7. Confirm there is no visual regression.

## Guardrails

- Do not merge historical PR #119.
- Do not enable automatic Production deployment on push.
- Do not apply migrations based on the Staging baseline report without a reviewed reconciliation.
- Do not claim end-to-end Production completion until the database migration, runtime integration tests, and live route/admin checks are all evidenced.
