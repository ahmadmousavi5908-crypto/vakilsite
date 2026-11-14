# MAVIS Cloudflare production runtime configuration and activation

## Deployment target

- Production platform: Cloudflare Workers with OpenNext.
- Worker name: `vakilahmadmousavi-ir`.
- Public origin: `https://vakilahmadmousavi.ir`.
- The production domain is attached through `wrangler.jsonc`.
- The automatic production workflow is `.github/workflows/deploy-cloudflare.yml`. It deploys on pushes to `main`.
- The manual workflow `.github/workflows/deploy-cloudflare-production.yml` currently checks out the older `work/mother-two-updated-mavis-20261110` branch. Do not use that manual workflow to release the MAVIS aggregate PR; it can deploy an older application revision.

## Observed production baseline

The latest main-branch Cloudflare production deployment visible during this review was workflow run #16, for commit `4fea2058a6c521391dff3a80e72f5be84149654a`, completed successfully on 2026-11-13. Its log reported a 1.51 MiB compressed Worker bundle and a 19 ms Worker startup time.

That same deployment log showed `INDEXNOW_KEY` was empty. The build explicitly skipped generation of `/indexnow-key.txt` and reported that IndexNow URL notifications remain disabled. This is direct deployment-log evidence, not an assumption. To activate IndexNow, set the key both as a GitHub Actions repository secret for build-time verification-file generation and as a Cloudflare Worker runtime secret for server-side URL submission.

## Build-time configuration versus Worker runtime configuration

These are separate environments. A GitHub Actions secret exposed to the deployment shell is not automatically a Cloudflare Worker runtime binding.

The existing workflow uses `INDEXNOW_KEY` during the build to generate the public `/indexnow-key.txt` verification file. The server-side IndexNow client also reads `process.env.INDEXNOW_KEY` when it submits URLs. Therefore the same value must be configured as a **Cloudflare Worker runtime secret** as well as the GitHub Actions secret used by the build.

The Worker uses Node.js compatibility. Cloudflare exposes Worker environment variables and secrets through `process.env` when `nodejs_compat` is enabled and the compatibility date supports `nodejs_compat_populate_process_env`. OpenNext recommends setting production runtime variables in the Cloudflare dashboard. The deployment workflows now use `wrangler deploy --keep-vars` so dashboard-managed runtime variables are not silently discarded by a code deployment.

## Worker runtime configuration

In Cloudflare Dashboard, open **Workers & Pages → vakilahmadmousavi-ir → Settings → Variables and Secrets**.

Configure the following:

| Name | Type | Purpose |
| --- | --- | --- |
| `INDEXNOW_KEY` | Secret | Runtime key used by server-side IndexNow notifications. It must match the GitHub Actions `INDEXNOW_KEY` used to generate `/indexnow-key.txt`. |
| `MAVIS_GSC_CLIENT_ID` | Secret | Google OAuth Web application client ID. |
| `MAVIS_GSC_CLIENT_SECRET` | Secret | Google OAuth Web application client secret. |
| `MAVIS_GSC_TOKEN_ENCRYPTION_KEY` | Secret | Exactly 32 random bytes encoded as 64 hexadecimal characters. Keep stable after connecting Google; changing it makes the stored token unreadable. |
| `MAVIS_GSC_SITE_URL` | Variable | Exact Search Console property, such as `https://vakilahmadmousavi.ir/` or `sc-domain:vakilahmadmousavi.ir`. |

The following public/build configuration is already declared in `wrangler.jsonc` and should remain aligned with the production project:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not put OAuth secrets or encryption keys in `wrangler.jsonc`, Git, source files, issue comments, or chat. The publishable Supabase key is intended for browser use; it is not a service-role key.

Optional provider configuration, only when deliberately enabled later:

- `MAVIS_CROSSREF_MAILTO`: contact email for Crossref polite-pool identification.
- `SEMANTIC_SCHOLAR_API_KEY`: optional Semantic Scholar API key.

OpenAlex remains disabled until a server-enforced usage-budget ledger is implemented and reviewed. Do not configure an OpenAlex key as a workaround.

## Safe activation sequence

1. Keep PR #119 in Draft until the approved diff, CI, and production prerequisites are reviewed.
2. Verify the production Supabase migration history against the repository. Use the supported read-only migration-list operation first; do not repair migration history to make the lists look aligned.
3. Run `supabase db push --dry-run --remote` and inspect the complete pending migration set. Do not run the actual push without explicit production approval.
4. Confirm the Cloudflare Worker runtime variables and secrets above. Keep the encryption key stable.
5. Configure a dedicated Google Cloud OAuth project for MAVIS Search Console. Register the exact callback URL:
   `https://vakilahmadmousavi.ir/api/admin/mavis/search-console/callback`.
6. Deploy only after the database and Worker configuration gates are satisfied.
7. Verify public routes: `/articles`, `/articles/library`, `/sitemap.xml`, and `/indexnow-key.txt`.
8. In the admin panel, connect Google Search Console and test one bounded Search Analytics request, one URL Inspection request, and sitemap inventory.
9. Publish a test article only after explicit approval. Verify its public page, library listing, sitemap entry, and IndexNow acceptance. Then unpublish or archive the test article according to the release plan.

## Current boundaries

- GitHub Actions Site Quality and isolated Supabase database tests validate code and migrations locally; they do not prove that production secrets exist, that the production database has the expected migration history, or that the Worker has been deployed.
- No production migration, Cloudflare secret write, production deploy, Google OAuth connection, or article publication is performed by this document or PR.
- Do not use the manual production workflow while it is pinned to the older release branch for the MAVIS aggregate release.
