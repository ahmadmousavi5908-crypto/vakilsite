import test from "node:test";
import assert from "node:assert/strict";
import {
  createSearchConsoleAuthorizationUrl,
  createSearchConsoleOAuthState,
  decryptSearchConsoleRefreshToken,
  encryptSearchConsoleRefreshToken,
  exchangeSearchConsoleAuthorizationCode,
  getSearchConsoleOAuthConfig,
  SEARCH_CONSOLE_READ_ONLY_SCOPE,
  signSearchConsoleOAuthState,
  verifySearchConsoleOAuthState,
} from "../../src/lib/mavis/search-console-oauth.mjs";

const env = {
  NEXT_PUBLIC_SITE_URL: "https://vakilahmadmousavi.ir",
  MAVIS_GSC_CLIENT_ID: "google-oauth-client-id",
  MAVIS_GSC_CLIENT_SECRET: "google-oauth-client-secret",
  MAVIS_GSC_SITE_URL: "https://vakilahmadmousavi.ir/",
  MAVIS_GSC_TOKEN_ENCRYPTION_KEY: "a".repeat(64),
};

test("builds a strict web-server OAuth configuration for the configured site", () => {
  const config = getSearchConsoleOAuthConfig(env);
  assert.equal(config.siteUrl, "https://vakilahmadmousavi.ir/");
  assert.equal(config.redirectUri, "https://vakilahmadmousavi.ir/api/admin/mavis/search-console/callback");
  assert.throws(() => getSearchConsoleOAuthConfig({ ...env, MAVIS_GSC_SITE_URL: "http://example.org" }));
  assert.throws(() => getSearchConsoleOAuthConfig({ ...env, MAVIS_GSC_TOKEN_ENCRYPTION_KEY: "weak" }));
  assert.throws(() => getSearchConsoleOAuthConfig({ ...env, NEXT_PUBLIC_SITE_URL: "http://example.org" }));
});

test("requests only Search Console read-only access with offline consent", () => {
  const config = getSearchConsoleOAuthConfig(env);
  const state = createSearchConsoleOAuthState();
  const url = new URL(createSearchConsoleAuthorizationUrl(config, state));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), SEARCH_CONSOLE_READ_ONLY_SCOPE);
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(url.searchParams.get("state"), state);
});

test("signs OAuth state and rejects missing, altered, or mismatched state", () => {
  const state = createSearchConsoleOAuthState();
  const signed = signSearchConsoleOAuthState(state, env);
  assert.equal(verifySearchConsoleOAuthState(state, signed, env), true);
  assert.equal(verifySearchConsoleOAuthState(createSearchConsoleOAuthState(), signed, env), false);
  assert.equal(verifySearchConsoleOAuthState(state, signed + "x", env), false);
  assert.equal(verifySearchConsoleOAuthState(state, "invalid", env), false);
});

test("encrypts refresh tokens with authenticated encryption and rejects tampering", () => {
  const encrypted = encryptSearchConsoleRefreshToken("google-refresh-token-secret", env);
  assert.notEqual(encrypted, "google-refresh-token-secret");
  assert.equal(decryptSearchConsoleRefreshToken(encrypted, env), "google-refresh-token-secret");
  assert.throws(() => decryptSearchConsoleRefreshToken(encrypted.slice(0, -1) + "A", env));
  assert.throws(() => decryptSearchConsoleRefreshToken(encrypted, { ...env, MAVIS_GSC_TOKEN_ENCRYPTION_KEY: "b".repeat(64) }));
});

test("exchanges the authorization code and verifies the exact granted read-only scope", async () => {
  let received;
  const result = await exchangeSearchConsoleAuthorizationCode({
    code: "authorization-code-value",
    config: getSearchConsoleOAuthConfig(env),
    fetchImpl: async (url, options) => {
      received = { url, options };
      return { ok: true, async json() {
        return {
          access_token: "short-lived-access-token",
          refresh_token: "google-refresh-token-secret",
          scope: SEARCH_CONSOLE_READ_ONLY_SCOPE,
          expires_in: 3600,
        };
      } };
    },
  });
  assert.equal(received.url, "https://oauth2.googleapis.com/token");
  assert.equal(received.options.method, "POST");
  assert.match(received.options.body, /grant_type=authorization_code/);
  assert.deepEqual(result, {
    refreshToken: "google-refresh-token-secret",
    grantedScope: SEARCH_CONSOLE_READ_ONLY_SCOPE,
  });
});

test("refuses token responses without refresh token or the exact read-only scope", async () => {
  const config = getSearchConsoleOAuthConfig(env);
  await assert.rejects(exchangeSearchConsoleAuthorizationCode({
    code: "authorization-code-value",
    config,
    fetchImpl: async () => ({ ok: true, async json() {
      return { access_token: "access-token", scope: SEARCH_CONSOLE_READ_ONLY_SCOPE };
    } }),
  }));
  await assert.rejects(exchangeSearchConsoleAuthorizationCode({
    code: "authorization-code-value",
    config,
    fetchImpl: async () => ({ ok: true, async json() {
      return { access_token: "access-token", refresh_token: "refresh-token-value", scope: "openid" };
    } }),
  }));
});
