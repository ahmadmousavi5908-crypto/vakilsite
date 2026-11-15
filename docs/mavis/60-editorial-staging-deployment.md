# MAVIS Editorial Staging Deployment

This deployment path is deliberately separate from the production Worker and production database.

## Isolation

- Worker name: `vakilahmadmousavi-ir-staging`
- Wrangler config: `wrangler.staging.jsonc`
- Deployment workflow: `.github/workflows/deploy-mavis-editorial-staging.yml`
- Trigger: manual `workflow_dispatch` only
- GitHub environment: `staging`
- The workflow checks out the exact revision selected for the manual run.
- Production Worker config and production deployment workflow are not modified.

## GitHub environment configuration

Create a GitHub Actions environment named `staging`. Add these environment variables:

| Variable | Required value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `NEXT_PUBLIC_SITE_URL` | Dedicated HTTPS staging origin, either `https://staging.<your-domain>` or `https://vakilahmadmousavi-ir-staging.<account-subdomain>.workers.dev` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL of the dedicated Supabase Staging project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key belonging to that Staging project |

Add this environment secret:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped token permitted to deploy Workers in this account |

The workflow validates HTTPS origins and the expected staging hostname shape. Do not reuse the production Supabase URL or key. The Staging Supabase project must be separate from Production.

## Database

Do not run the production migration workflow for staging. First create a separate Supabase Staging project and verify its project reference. Review the target and migration history, then use the current Supabase CLI:

```sh
supabase db push --dry-run --remote=<STAGING_PROJECT_REF>
```

Only after confirming that the target is the dedicated Staging project and reviewing the migration list:

```sh
supabase db push --yes --remote=<STAGING_PROJECT_REF>
```

The repository's migration history is not assumed to be a complete Production baseline. Never point this first activation at Production.

## Deploy and verify

1. Configure the GitHub `staging` environment values above.
2. Confirm the Supabase URL and publishable key belong to the Staging project.
3. Configure the dedicated staging hostname in DNS/Cloudflare when using a custom domain.
4. Run **Deploy MAVIS editorial staging** manually from the approved work branch.
5. Verify the deployment URL, canonical metadata, robots/noindex behavior, admin authentication and database isolation before owner testing.

The pull-request Cloudflare compatibility workflow performs an OpenNext build and a Wrangler dry run against the staging config. Neither action deploys a Worker.

Google Search Console credentials are not required to deploy. If connected later, use a separate staging property and server-side Worker secrets. Never copy production OAuth refresh tokens into staging.

## Explicit non-goals

- No Production database migration.
- No Production Worker deployment.
- No changes to the approved public-site appearance.
- No automatic publication or indexing.
