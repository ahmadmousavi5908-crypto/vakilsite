# MAVIS Editorial Staging Deployment

This deployment path is deliberately separate from the production Worker and production database.

## Confirmed staging resources

- Supabase project: `vakilsite-staging`
- Supabase project reference: `srbwniqhaxwaoepjfizf`
- Production Supabase project reference (for exclusion): `jroflcmiczfwtmiaxmpd`
- Staging Worker: `vakilahmadmousavi-ir-staging`
- Wrangler config: `wrangler.staging.jsonc`

The staging Supabase project was created separately from Production. The deployment workflow accepts only the exact staging Supabase hostname and rejects other Supabase projects, including the known Production project.

## GitHub environment configuration

Create or open the GitHub Actions environment named `staging`.

Add these environment variables:

| Variable | Required value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `NEXT_PUBLIC_SITE_URL` | Dedicated HTTPS staging origin, either `https://staging.<your-domain>` or `https://vakilahmadmousavi-ir-staging.<account-subdomain>.workers.dev` |
| `STAGING_SUPABASE_URL` | `https://srbwniqhaxwaoepjfizf.supabase.co` |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Publishable key from `vakilsite-staging` |

Add these environment secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_STAGING_API_TOKEN` | Dedicated, scoped token permitted to deploy Workers |
| `SUPABASE_STAGING_ACCESS_TOKEN` | Supabase personal access token used by the CLI |
| `SUPABASE_STAGING_DB_PASSWORD` | Database password for the staging project only |

Never place secrets in repository files, workflow variables, or chat messages. Do not reuse Production Supabase credentials or a Production Cloudflare token.

## Database migration workflow

The workflow `Migrate MAVIS staging database` is manual-only and is hard-locked to project reference `srbwniqhaxwaoepjfizf`.

- Default run: dry-run only. It prints the migrations that would be applied.
- Apply run: requires explicitly checking `apply_migrations` when starting the workflow.
- After applying, it lists the remote migration history.
- It cannot accept a project reference as user input and refuses the known Production project reference.

The current repository migration chain contains `001_social_links.sql`, `002_office_location.sql`, `003_social_link_types.sql`, `005_mavis_knowledge_search_rate_limit.sql`, and `006_mavis_editorial_articles.sql`. Migration 005 depends on `public.is_site_admin()` created in migration 001. The numbering gap at 004 is intentional in the current repository history; do not invent or add an empty migration to fill it.

Use the default dry-run first. Review the exact migration list and only then run the workflow again with `apply_migrations=true`. Do not use the Production database or the Production migration workflow.

The repository uses Supabase CLI v3 semantics: hosted database commands must specify `--remote=<project-ref>`; unattended hosted mutations require `--yes`. See the official [CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3).

## Worker deployment

1. Configure the `staging` environment variables and secrets above.
2. Confirm `NEXT_PUBLIC_SITE_URL` is the dedicated staging origin.
3. Run `Migrate MAVIS staging database` with the default dry-run.
4. Review the output, then explicitly run with `apply_migrations=true`.
5. Run **Deploy MAVIS editorial staging** manually from the approved work branch.
6. Verify the deployment URL, noindex metadata, staging canonical, admin authentication and database isolation before owner testing.

The deployment workflow rejects any Supabase URL except `https://srbwniqhaxwaoepjfizf.supabase.co`. Staging metadata is noindex/nofollow, its robots file does not advertise a sitemap, and its sitemap contains no indexable URLs.

Google Search Console credentials are not required to deploy. If connected later, use a separate staging property and server-side Worker secrets. Never copy Production OAuth refresh tokens into staging.

## Explicit non-goals

- No Production database migration.
- No Production Worker deployment.
- No changes to the approved public-site appearance.
- No automatic publication or indexing.
