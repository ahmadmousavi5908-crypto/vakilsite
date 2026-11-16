# MAVIS Staging external integration activation

**Scope:** isolated Staging Worker only. This checklist does not authorize Production changes, public publishing, or a merge of PR #119.

## Verified Staging baseline

- Staging Worker: `vakilahmadmousavi-ir-staging`
- Staging origin: `https://vakilahmadmousavi-ir-staging.ahmadmousavi5908.workers.dev`
- Staging Supabase project: `srbwniqhaxwaoepjfizf`
- Migration 019: applied and verified on Staging
- Editorial E2E: passed, including publish/unpublish/archive/restore and cleanup
- Public routes and anonymous access boundaries: passed
- Crossref and OpenAlex: live metadata requests passed; Semantic Scholar may return provider rate limits
- External credential audit: the following optional provider secrets are currently absent from the Staging Worker

## Required Staging Worker secrets

Set secrets only in Cloudflare Dashboard → Workers & Pages → `vakilahmadmousavi-ir-staging` → Settings → Variables and Secrets. Use **Secret** values, not plaintext variables, for credentials. Never put secret values in Git, workflow files, terminal command arguments, issue comments, or chat.

| Secret name | Purpose | Required for |
| --- | --- | --- |
| `MAVIS_GSC_CLIENT_ID` | Google OAuth Web client ID | Search Console |
| `MAVIS_GSC_CLIENT_SECRET` | Google OAuth Web client secret | Search Console |
| `MAVIS_GSC_TOKEN_ENCRYPTION_KEY` | 32 random bytes as 64 hex characters | Search Console token encryption |
| `MAVIS_GSC_SITE_URL` | Exact verified property, e.g. `https://vakilahmadmousavi.ir/` or `sc-domain:vakilahmadmousavi.ir` | Search Console |
| `MAVIS_IRAN_SOURCE_SEARCH_API_KEY` | Tavily API key | Iranian legal-source search and fallback competitor search |
| `MAVIS_GROWTH_SEARCH_API_KEY` | Optional dedicated Tavily key | Separate competitor-search quota |
| `MAVIS_OPENAI_API_KEY` | OpenAI API key | Editorial AI draft assistance |

The competitor search adapter falls back to `MAVIS_IRAN_SOURCE_SEARCH_API_KEY` when `MAVIS_GROWTH_SEARCH_API_KEY` is not set. A separate key is optional.

The model defaults to `gpt-6-astra`. An optional non-secret Worker variable `MAVIS_EDITORIAL_MODEL` may select another model available to the API project.

## Google Search Console OAuth setup

1. Create a dedicated **Staging-only** Google Cloud project for MAVIS Search Console and enable the Search Console API. Do not reuse a project that hosts other OAuth integrations or scopes.
2. Create a Web application OAuth client for Staging and register **only** this authorized redirect URI:
   `https://vakilahmadmousavi-ir-staging.ahmadmousavi5908.workers.dev/api/admin/mavis/search-console/callback`
   Do not add the Production callback or configure Production OAuth credentials in this Staging setup. A future Production rollout requires a separate Google Cloud project and OAuth client after explicit approval.
3. Add the administrator Google account as a test user if the Staging consent screen is in testing.
4. Grant only the read-only `webmasters.readonly` scope. The account must already have access to the selected Search Console property.
5. Generate the encryption key locally with `openssl rand -hex 32`; paste it directly into the Cloudflare Secret field. Do not send it to anyone.
6. Set the four `MAVIS_GSC_*` secrets on the Staging Worker only.
7. Sign in to the Staging admin panel, open the Search Console connection section, complete Google consent, then verify the connection status and request a bounded report.

The Staging database stores only the encrypted refresh token. Do not insert tokens manually.

## AI and research setup

1. Set `MAVIS_OPENAI_API_KEY` in the Staging Worker Secret store to enable draft suggestions. The feature sends only the supplied article fields and selected source metadata, requests a structured draft, and never saves or publishes it automatically.
2. Set `MAVIS_IRAN_SOURCE_SEARCH_API_KEY` to enable the Iranian allowlisted source-search provider.
3. Optionally set `MAVIS_GROWTH_SEARCH_API_KEY` to separate competitor-research quota from legal-source research.
4. Do not put provider keys into GitHub Actions or client-side `NEXT_PUBLIC_*` variables.

## Verification after secrets are configured

Run the existing read-only integration inspection and Staging smoke workflows, then verify manually as the administrator:

- Search Console: OAuth connect → status shows connected → bounded Search Analytics report returns provider data → disconnect removes the stored encrypted token.
- Iranian legal sources: search a query and confirm results are restricted to the approved source registry; review metadata and import only deliberately.
- Competitor research: run one location-specific SERP observation and confirm it is labeled as a time-sensitive public search observation, not a ranking guarantee.
- Editorial AI: generate one draft from a supplied topic and sources; verify evidence gaps and source IDs; confirm no article is auto-saved or published.
- Repeat the secret-name audit. It must report the configured groups without printing secret values.

## Release boundary

PR #119 remains Draft until all code checks and available Staging integrations are verified. Do not merge, change Production secrets, run Production migrations, connect the Production OAuth callback, or publish public content as part of this Staging checklist.
