# MAVIS Staging Integration Activation

## Scope

This checklist activates external integrations only on the isolated Cloudflare Worker:

- Worker: `vakilahmadmousavi-ir-staging`
- Origin: `https://vakilahmadmousavi-ir-staging.ahmadmousavi5908.workers.dev`
- Supabase project: `srbwniqhaxwaoepjfizf`

Do not add these credentials to Production during this phase. Do not place secret values in Git, pull requests, terminal transcripts, or chat.

## Current verified state

The read-only Staging integration audit currently reports:

- Search Console storage table exists, but no connection record is stored.
- Required secret names for Search Console OAuth, Iranian legal source search, competitor research, and editorial AI are absent from the Staging Worker secret inventory.
- Crossref live metadata discovery returned candidates.
- Semantic Scholar returned HTTP 429 during the last live smoke test; this is an upstream rate-limit response, not a parser failure.

The audit lists secret names only. It never requests or prints secret values.

## Existing static article import

The administrator's current-site article catalog remains read-only until an individual article is imported.

- **ورود به پیش‌نویس** creates a separate versioned CMS draft with the same slug.
- The public static article remains unchanged. Import never publishes, approves, or changes indexability.
- Only HTTPS source links are attached as manual research-background metadata. Their legal authority and reuse rights remain unverified until a human reviews them.
- Invalid, non-HTTPS, or duplicate source links are reported as skipped for manual review.
- Repeating the import opens the existing editable draft and reconciles its source links instead of creating a duplicate.
- Publication remains a separate version-specific administrator approval and publish action.

## Staging Worker secrets

Add these under Cloudflare Dashboard → Workers & Pages → `vakilahmadmousavi-ir-staging` → Settings → Variables and Secrets. Use **Secret** for every credential and encryption key.

| Secret name | Required for | Notes |
| --- | --- | --- |
| `MAVIS_OPENAI_API_KEY` | Editorial AI | Server-side OpenAI API key. The default model is `gpt-6-astra`; `MAVIS_EDITORIAL_MODEL` can override it. |
| `MAVIS_GSC_CLIENT_ID` | Search Console | Google OAuth Web application client ID. |
| `MAVIS_GSC_CLIENT_SECRET` | Search Console | Google OAuth Web application client secret. |
| `MAVIS_GSC_TOKEN_ENCRYPTION_KEY` | Search Console | 32 random bytes encoded as exactly 64 hexadecimal characters. Generate locally with `openssl rand -hex 32`. Keep it stable after connecting. |
| `MAVIS_GSC_SITE_URL` | Search Console | The verified Production Search Console property: `https://vakilahmadmousavi.ir/` or `sc-domain:vakilahmadmousavi.ir`. Do not set this to the Staging Worker hostname. |
| `MAVIS_IRAN_SOURCE_SEARCH_API_KEY` | Iranian legal source search | Tavily API key. Results are restricted to the configured Iranian legal and academic domain allowlist. |
| `MAVIS_GROWTH_SEARCH_API_KEY` | Competitor research | Optional separate Tavily key. If omitted, competitor research falls back to `MAVIS_IRAN_SOURCE_SEARCH_API_KEY`. |

Optional non-secret settings:

- `MAVIS_EDITORIAL_MODEL`: defaults to `gpt-6-astra`.
- `MAVIS_CROSSREF_MAILTO`: contact email for Crossref's polite pool.
- `SEMANTIC_SCHOLAR_API_KEY`: optional provider key to reduce anonymous rate limiting.
- `OPENALEX_API_KEY`: optional; OpenAlex calls remain protected by the Staging daily usage-budget RPC.
- `MAVIS_GSC_TIMEOUT_MS` and `MAVIS_IRAN_SOURCE_SEARCH_TIMEOUT_MS`: optional bounded timeout overrides.

Do not use browser-exposed `NEXT_PUBLIC_*` variables for any provider credential.

## Google OAuth configuration

Use a dedicated Google Cloud OAuth Web application for MAVIS. Enable the Google Search Console API and grant only the read-only `webmasters.readonly` scope.

Add this exact Staging redirect URI to the OAuth client:

`https://vakilahmadmousavi-ir-staging.ahmadmousavi5908.workers.dev/api/admin/mavis/search-console/callback`

The Production redirect URI is separate:

`https://vakilahmadmousavi.ir/api/admin/mavis/search-console/callback`

The Search Console property itself remains the verified Production property. The redirect URI identifies the Staging callback; it does not change which property is queried.

After adding the four Search Console settings:

1. Sign in to the Staging administrator panel.
2. Open `/admin/mavis/growth`.
3. Start **اتصال امن حساب گوگل** and approve the read-only scope with the Google account that owns or can access the Production property.
4. Confirm the panel reports an active connection.
5. Verify Search Analytics, sitemap inventory, and URL Inspection against a Production URL.
6. Confirm the encrypted refresh token is stored in the Staging Supabase connection table.

The OAuth callback and stored token must be tested on Staging before any Production setup is considered.

## Post-configuration verification

Run the read-only integration audit workflow again. Expected outcomes:

- Search Console OAuth secret names are present.
- The Staging connection record is present only after the administrator completes OAuth consent.
- Iranian source search and editorial AI secret names are present.
- Crossref and Semantic Scholar live discovery are tested independently; an upstream 429 is reported as a provider warning.
- No secret value appears in workflow output.

Then run the authenticated administrator smoke tests and verify:

- Iranian legal source search returns only allowlisted HTTPS source metadata.
- Competitor research excludes the firm's own domain.
- AI produces an editable draft suggestion, reports evidence gaps, and does not save, approve, or publish automatically.
- Search Console returns real data for the configured Production property.
- Rate limits remain enforced.

## Operational note

Cloudflare's Wrangler secret commands create a new Worker version and deploy it immediately. Make secret changes only against the Staging Worker in this phase. See the [Cloudflare Workers secrets documentation](https://developers.cloudflare.com/workers/configuration/secrets/) and [Wrangler secret commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/).
