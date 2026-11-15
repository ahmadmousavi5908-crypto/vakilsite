# MAVIS Editorial Studio Activation Runbook

**Target:** MAVIS third arm, editorial operations and search intelligence  
**Application routes:** `/admin/mavis/editorial` and `/admin/mavis#growth-intelligence`  
**Worker:** `vakilahmadmousavi-ir`  
**Production status:** Not deployed by this runbook

## 1. What is already implemented

- Spreadsheet-style article inventory with full-text search, status filters, sorting and CSV export.
- Structured editor, readable preview, source registry and SEO metadata.
- Separate draft and published snapshots. Saving a draft does not replace the public snapshot.
- Manual publication gate requiring an administrator, author, reviewer, legal-review confirmation and at least one HTTPS source.
- Public article pages and sitemap consume published snapshots; draft-only records are not public.
- Read-only Google Search Console client using the `webmasters.readonly` OAuth scope.
- Per-article Search Console filtering constrained to the configured property.
- No automatic article publication, indexing submission or case-file access.

## 2. Database activation

The repository contains migrations `001`, `002`, `003`, `005` and `006`. Migration `006_mavis_editorial_articles.sql` depends on `public.is_site_admin()`, created by migration `001_social_links.sql`.

1. Create or select a dedicated Supabase staging project. Do not use Production as the first test target.
2. Confirm the staging database is disposable or backed up, and confirm its Postgres major version.
3. Authenticate the Supabase CLI locally and target only the staging project.
4. Review the pending migration list with the current CLI's dry-run command before applying anything:
   `supabase db push --dry-run --remote=<STAGING_PROJECT_REF>`
5. Apply migrations only after reviewing the dry-run output and confirming the target is Staging:
   `supabase db push --yes --remote=<STAGING_PROJECT_REF>`
6. Run the database tests against the isolated local stack in CI with `supabase test db`. The test suite includes structural grants checks and role-based behavior tests for anonymous and authenticated non-admin users.
7. Before Production, compare the full existing Production schema and migration history with this repository. Do not infer that the repository's migration sequence is a complete historical baseline merely because local tests pass.

Never use `db reset --remote` against Production. Never paste database URLs, passwords, access tokens or service-role keys into chat or source control.

## 3. Google Search Console activation

The code intentionally reports the provider as not connected until a real authenticated request succeeds.

Create or select a Google Cloud project, enable the Search Console API, configure an OAuth consent screen, and create an OAuth client. The Google account used for authorization must have permission to the exact verified Search Console property for `vakilahmadmousavi.ir`.

Authorize only this scope:

`https://www.googleapis.com/auth/webmasters.readonly`

Set these server-side Worker secrets/variables for the `vakilahmadmousavi-ir` Worker:

| Name | Purpose |
| --- | --- |
| `MAVIS_GSC_CLIENT_ID` | Google OAuth client ID |
| `MAVIS_GSC_CLIENT_SECRET` | Google OAuth client secret |
| `MAVIS_GSC_REFRESH_TOKEN` | Refresh token authorized with the read-only scope |
| `MAVIS_GSC_SITE_URL` | Exact Search Console property, either `https://vakilahmadmousavi.ir/` or the verified `sc-domain:vakilahmadmousavi.ir` property |
| `MAVIS_GSC_TIMEOUT_MS` | Optional request timeout; defaults to 20000 ms |

Keep all four required values in Cloudflare Worker secrets/environment configuration, not in GitHub source, `wrangler.jsonc`, `.env.example`, or client-side `NEXT_PUBLIC_*` variables. Do not put the refresh token in the browser.

After configuring the Worker, verify the connection from the admin Search Console panel using a bounded date range and the exact property. The connection is accepted only after the API returns a successful response for that property. A missing value, invalid token, missing property permission or failed API response must remain visibly disconnected; it must never be represented as zero impressions or zero clicks.

## 4. Acceptance checklist

- [ ] Staging migrations applied after a reviewed dry run.
- [ ] Database security workflow passes all pgTAP tests.
- [ ] Admin can read and save a draft.
- [ ] Non-admin and anonymous users cannot read or mutate draft records.
- [ ] Public RPC returns only published snapshots.
- [ ] A draft edit leaves the previously published snapshot unchanged.
- [ ] A new article appears publicly only after manual publication.
- [ ] Non-indexable published content is excluded from the sitemap and carries noindex metadata.
- [ ] Search Console returns live metrics for the verified property and a selected article URL.
- [ ] Existing public site appearance and URLs remain unchanged.
- [ ] Production migration and deployment are separately reviewed and explicitly approved by the owner.

## 5. External requirements

The following cannot be created or inferred from repository code:

- A dedicated Supabase Staging project and its database credentials.
- A Google Cloud OAuth client and refresh token with the read-only Search Console scope.
- Search Console permission for the verified domain property.

These are external account-level prerequisites. They must be configured by the account owner in the relevant provider dashboards; secrets must not be sent through chat.
