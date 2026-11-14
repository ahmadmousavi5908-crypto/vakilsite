# MAVIS Google Search Console connection

## Purpose

This integration connects the administrator's Google Search Console property to MAVIS using Google's server-side OAuth 2.0 authorization-code flow. It is read-only and request-driven. Search Analytics data is fetched only when an administrator requests a report; it is not fabricated, automatically published, or used to edit site content.

## Implemented behavior

- Admin-only OAuth start and callback routes.
- OAuth state is random, signed, short-lived, and stored in an HttpOnly, Secure, SameSite=Lax cookie.
- The only requested Google scope is `https://www.googleapis.com/auth/webmasters.readonly`.
- Offline access is requested so the server can refresh short-lived access tokens.
- Refresh tokens are encrypted with AES-256-GCM before storage.
- The encrypted token is stored in a singleton Supabase table with no direct table grants or browser policies. Admin-only SECURITY DEFINER RPCs provide store/read/disconnect operations.
- The raw refresh token is never returned to the browser, included in logs, or committed to the repository.
- Disconnect first revokes the Google token, then removes the local encrypted credential.
- Search Analytics requests continue to use the existing bounded, privacy-filtering adapter and admin rate limit.
- Search Console data is not persisted as a user profile or legal case record.

## Google Cloud setup

1. In Google Cloud Console, create or select a project.
2. Enable **Google Search Console API** for that project.
3. Configure the OAuth consent screen and add the administrator account as a test user while the application is in testing.
4. Create an OAuth client with application type **Web application**.
5. Add this exact authorized redirect URI:

   `https://vakilahmadmousavi.ir/api/admin/mavis/search-console/callback`

6. Confirm that the Google account used for consent has access to the Search Console property. Prefer Owner permission for initial setup.
7. Copy the OAuth Client ID and Client Secret into the hosting provider's encrypted environment-variable settings. Do not put either value in GitHub, source code, chat, or a committed `.env` file.

## Required server environment

| Variable | Value |
| --- | --- |
| `MAVIS_GSC_CLIENT_ID` | OAuth Web application client ID |
| `MAVIS_GSC_CLIENT_SECRET` | OAuth Web application client secret |
| `MAVIS_GSC_SITE_URL` | Exact Search Console property, e.g. `https://vakilahmadmousavi.ir/` or `sc-domain:vakilahmadmousavi.ir` |
| `MAVIS_GSC_TOKEN_ENCRYPTION_KEY` | 32 cryptographically random bytes encoded as 64 hexadecimal characters |
| `NEXT_PUBLIC_SITE_URL` | `https://vakilahmadmousavi.ir` |

Generate the encryption key on a trusted local device:

```sh
openssl rand -hex 32
```

Set the resulting value directly in the hosting provider's secret/environment settings. Do not send it in chat or commit it. Keep it stable: changing it makes the stored encrypted refresh token unreadable and requires reconnecting the Google account.

The database migration `014_mavis_search_console_oauth_storage.sql` must be applied before the OAuth callback can save credentials. Apply migrations only through the approved deployment process; this pull request does not apply production migrations.

## Connect and verify

1. Deploy the reviewed code and the approved database migration.
2. Sign in to the site administrator panel.
3. Open **مرکز دانش MAVIS**.
4. In **گزارش عملکرد Google Search Console**, select **اتصال امن حساب گوگل**.
5. Sign in to the Google account that can access the configured property and approve the read-only permission.
6. Confirm that the panel reports an active connection.
7. Request a bounded date-range report. Verify that clicks, impressions, CTR, average position, and the privacy-redaction count are returned from the API.

If Google reports an unverified OAuth application during private testing, keep the consent screen restricted to the configured test users. Public OAuth verification requirements depend on the app's user type and requested scopes. Google documents that refresh tokens for an external OAuth consent screen left in **Testing** can expire after seven days for scopes beyond basic identity scopes; for durable operation, complete the appropriate app publishing and verification steps rather than relying on test-mode tokens.

## Security and operational limits

- No write scope, URL indexing submission, content publication, or site mutation is requested.
- The OAuth client secret and encryption key remain server-side.
- The refresh token is encrypted at rest and only exposed to an authenticated administrator through a protected RPC, for server-side decryption.
- OAuth state expires after ten minutes.
- All Search Console API requests are server-side, bounded by the existing request validation, timeout, and rate limit.
- Query and page dimensions are privacy-filtered for likely phone numbers, email addresses, and national-ID-shaped values before display.
- Search Analytics may omit low-volume or anonymized queries and may return incomplete or truncated data. MAVIS labels this limitation rather than treating the returned rows as complete.
- Google may revoke or expire refresh tokens. The administrator must reconnect when the provider rejects a token.
- Disconnect revokes the provider grant and deletes the local encrypted token.
- The integration is not a replacement for Google Search Console's own UI, indexing reports, URL Inspection, or manual ownership verification.

## Verification

The `test:mavis-search-console` suite covers API response normalization, OAuth configuration/state, encryption and tamper detection, authorization-code exchange, token revocation, stored credential loading, admin-only request handling, privacy redaction, and deterministic opportunity metrics. The database test for migration 014 verifies RLS, table privileges, function ACLs, SECURITY DEFINER/search_path properties, admin authorization, ciphertext-only storage, and disconnect behavior.
