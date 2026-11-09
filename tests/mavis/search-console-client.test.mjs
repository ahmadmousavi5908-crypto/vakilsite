import test from "node:test";
import assert from "node:assert/strict";
import {
  createSearchConsoleClient,
  createSearchConsoleClientFromEnv,
} from "../../src/lib/mavis/search-console-client.mjs";

const config = {
  clientId: "oauth-client-id",
  clientSecret: "oauth-client-secret",
  refreshToken: "refresh-token-secret",
  siteUrl: "https://vakilahmadmousavi.ir/",
};

const request = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  dimensions: ["query", "page"],
  type: "web",
  dataState: "final",
  rowLimit: 1000,
  startRow: 0,
};

function jsonResponse(payload, ok = true) {
  return { ok, async json() { return payload; } };
}

test("requires complete OAuth credentials and a secure Search Console property", () => {
  assert.throws(() => createSearchConsoleClient({ ...config, clientSecret: "" }));
  assert.throws(() => createSearchConsoleClient({ ...config, siteUrl: "http://vakilahmadmousavi.ir/" }));
  assert.throws(() => createSearchConsoleClient({ ...config, siteUrl: "https://user:pass@vakilahmadmousavi.ir/" }));
  assert.equal(createSearchConsoleClientFromEnv({}), null);
  assert.equal(createSearchConsoleClientFromEnv({
    MAVIS_GSC_CLIENT_ID: "id",
    MAVIS_GSC_CLIENT_SECRET: "secret",
    MAVIS_GSC_REFRESH_TOKEN: "refresh",
    MAVIS_GSC_SITE_URL: "https://vakilahmadmousavi.ir/",
  }).source, "google_search_console");
});

test("refreshes OAuth credentials and queries Search Analytics with read-only access", async () => {
  const calls = [];
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === "https://oauth2.googleapis.com/token") {
        return jsonResponse({ access_token: "short-lived-access-token", expires_in: 3600 });
      }
      return jsonResponse({
        responseAggregationType: "byPage",
        rows: [
          { keys: ["راهنمای قرارداد", "https://vakilahmadmousavi.ir/articles/contract-guide"], clicks: 12, impressions: 240, ctr: 0.05, position: 4.2 },
          { keys: ["09123456789", "https://vakilahmadmousavi.ir/articles/contact"], clicks: 1, impressions: 10, ctr: 0.1, position: 8.1 },
          { keys: ["person@example.com", "https://vakilahmadmousavi.ir/articles/privacy"], clicks: 0, impressions: 4, ctr: 0, position: 12 },
        ],
      });
    },
  });

  const result = await client.querySearchAnalytics(request);
  assert.equal(result.ok, true);
  assert.equal(result.source, "google_search_console_search_analytics");
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].dimensions.query, "راهنمای قرارداد");
  assert.equal(result.rows[0].privacyReviewRequired, false);
  assert.equal(result.rows[1].dimensions.query, null);
  assert.equal(result.rows[1].privacyReviewRequired, true);
  assert.equal(result.rows[2].dimensions.query, null);
  assert.equal(result.rows[2].privacyReviewRequired, true);
  assert.equal(result.coverage.apiCompletenessGuaranteed, false);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://oauth2.googleapis.com/token");
  assert.match(calls[0].options.body, /grant_type=refresh_token/);
  assert.match(calls[0].options.body, /client_secret=oauth-client-secret/);
  assert.equal(calls[1].options.method, "POST");
  assert.match(calls[1].url, /webmasters\\/v3\\/sites\\/https%3A%2F%2Fvakilahmadmousavi\\.ir%2F\\/searchAnalytics\\/query/);
  assert.equal(calls[1].options.headers.Authorization, "Bearer short-lived-access-token");
  const body = JSON.parse(calls[1].options.body);
  assert.deepEqual(body.dimensions, ["query", "page"]);
  assert.equal(body.rowLimit, 1000);
  assert.equal(body.aggregationType, "auto");
  assert.equal(client.scope, "https://www.googleapis.com/auth/webmasters.readonly");
});

test("reuses a short-lived access token in memory without persisting credentials", async () => {
  let tokenCalls = 0;
  let apiCalls = 0;
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        tokenCalls += 1;
        return jsonResponse({ access_token: "temporary-token", expires_in: 3600 });
      }
      apiCalls += 1;
      return jsonResponse({ rows: [] });
    },
  });

  await client.querySearchAnalytics(request);
  await client.querySearchAnalytics(request);
  assert.equal(tokenCalls, 1);
  assert.equal(apiCalls, 2);
});

test("rejects invalid analytics requests before any external call", async () => {
  let called = false;
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async () => { called = true; return jsonResponse({ rows: [] }); },
  });

  const result = await client.querySearchAnalytics({ ...request, rowLimit: 25001 });
  assert.deepEqual(result, { ok: false, reason: "invalid_pagination" });
  assert.equal(called, false);
});

test("returns an empty result for a valid API response without rows", async () => {
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async (url) => url === "https://oauth2.googleapis.com/token"
      ? jsonResponse({ access_token: "temporary-token", expires_in: 3600 })
      : jsonResponse({}),
  });

  const result = await client.querySearchAnalytics(request);
  assert.equal(result.ok, true);
  assert.deepEqual(result.rows, []);
});

test("does not expose OAuth or upstream response secrets in failures", async () => {
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async () => ({
      ok: false,
      async json() { return { error: "sensitive-upstream-detail" }; },
    }),
  });

  await assert.rejects(
    () => client.querySearchAnalytics(request),
    (error) => error.message === "Search Console OAuth token refresh failed." &&
      !error.message.includes("oauth-client-secret") &&
      !error.message.includes("refresh-token-secret"),
  );
});
