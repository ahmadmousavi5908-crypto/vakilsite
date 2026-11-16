# MAVIS Production Cutover

## Current release model

The Production migration workflow is the single guarded release entry point. Its defaults are dry-run only. It checks the configured database project reference, compares every already-applied SQL migration with the repository, and permits only migration 019 to be pending.

After migration 019 is applied and the remote history is verified, an optional explicit input can dispatch the existing Cloudflare Production Worker deployment and wait for that deployment to finish.

## One-time prerequisite

In GitHub repository Settings → Environments → production → Environment secrets, configure:

- `SUPABASE_PRODUCTION_DB_URL`: the PostgreSQL connection URI for the production Supabase project `jroflcmiczfwtmiaxmpd`.

Do not put this URI in repository files, commits, workflow inputs, or chat.

## Backup requirement

Before applying migration 019, create a current recoverable Production database backup using the Supabase project backup facility or an independently verified database dump. A backup must be restorable, not merely a screenshot that a backup schedule exists.

The workflow's `backup_confirmed` input is an explicit operator attestation. It does not create or verify the backup itself.

## Release procedure

Run GitHub Actions → **Migrate MAVIS production database** on `main`.

- For a safe preview, leave all inputs false. The workflow validates the target and SQL parity, then runs Supabase dry-run only.
- For the complete cutover, set `apply_migrations=true`, `backup_confirmed=true`, and `deploy_production=true` only after the backup has been verified.

The workflow then:

1. Confirms the production database URL belongs to the expected project.
2. Compares remote migration history and SQL parity.
3. Requires migration 019 to be the only pending migration.
4. Runs the migration plan preview.
5. Applies migration 019 only with explicit apply and backup confirmations.
6. Verifies remote migration history after apply.
7. Confirms `main` has not changed during the migration.
8. Dispatches the Production Worker deployment and waits for its result.

If any validation fails, the deployment step is not reached.

## Optional live Search Console

The public site and editorial AI do not require Google OAuth secrets: Cloudflare Workers AI and Browser Run are configured as Worker bindings, and Search Console CSV import remains available.

To enable live Google Search Console, configure the four secrets documented in [SEARCH-CONSOLE-OAUTH.md](./SEARCH-CONSOLE-OAUTH.md). The administrator must then complete OAuth consent from the MAVIS admin panel.

## Operational boundaries

- No Production migration or deployment is performed by CI on ordinary pushes.
- No secret values are printed.
- Editorial AI produces drafts only; human approval and publication remain separate steps.
- Search Console access is read-only.
