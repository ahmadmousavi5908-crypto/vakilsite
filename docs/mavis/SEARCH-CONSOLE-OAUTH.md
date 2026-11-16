# MAVIS Google Search Console OAuth

## Runtime model

MAVIS connects to Google Search Console using the official OAuth 2.0 web-server flow and the exact `webmasters.readonly` scope. The administrator initiates consent from the private MAVIS panel.

The authorization code is exchanged server-side. Only the refresh token is retained, encrypted with AES-256-GCM before it is sent to the database. The browser never receives the refresh token or encryption key. The database exposes connection state and encrypted credentials only through administrator-checked RPC functions from migration 014.

## Required Worker secrets

Configure these four secrets together in the relevant Cloudflare Worker and GitHub Actions environment:

- `MAVIS_GSC_CLIENT_ID`
- `MAVIS_GSC_CLIENT_SECRET`
- `MAVIS_GSC_TOKEN_ENCRYPTION_KEY`
- `MAVIS_GSC_SITE_URL`

Generate a 256-bit encryption key locally with:

```bash
openssl rand -hex 32
```

Store the resulting 64-character hexadecimal value directly as `MAVIS_GSC_TOKEN_ENCRYPTION_KEY`. Never commit it or paste it into chat. Keep a protected backup of this key: losing it makes previously stored refresh-token ciphertext unrecoverable.

`MAVIS_GSC_SITE_URL` must identify the verified property, for example `https://vakilahmadmousavi.ir/` or `sc-domain:vakilahmadmousavi.ir`.

A separate static `MAVIS_GSC_REFRESH_TOKEN` secret is not required. The refresh token is issued after administrator consent and stored encrypted in the Staging or Production database.

## Google Cloud OAuth client

Create an OAuth 2.0 Client ID of type Web application. Add the exact authorized redirect URI:

```
https://vakilahmadmousavi.ir/api/admin/mavis/search-console/callback
```

For isolated Staging consent, also add the exact Staging Worker callback URI. Do not use wildcard redirect URIs. Enable the Google Search Console API and ensure the Google account completing consent has access to the configured Search Console property.

## Available read-only tools

- Search Analytics reports with privacy filtering and bounded pagination.
- URL Inspection for URLs that belong to the configured verified property.
- Search Console sitemap inventory and processing status.
- Local CSV import remains available when OAuth is not configured or Google is unavailable.

Disconnecting attempts to revoke the Google refresh token and always removes the encrypted local connection record. If Google's revocation endpoint is unavailable, the panel reports that the administrator should also revoke the app from the Google Account security settings.

## Security and testing

- OAuth state is signed and bound to a short-lived HttpOnly, Secure, SameSite=Lax cookie.
- Redirect URIs are derived from the canonical site origin.
- The callback accepts only the exact read-only scope and requires an offline refresh token.
- Stored refresh tokens use AES-256-GCM authenticated encryption.
- API routes require an authenticated site administrator, same-origin requests where applicable, bounded JSON bodies, and database rate limiting.
- URL Inspection rejects URLs outside the configured property.
- All Search Console tools are read-only; no indexing or sitemap submission action is performed.

Run the automated suite:

```bash
npm run test:mavis-search-console
```
