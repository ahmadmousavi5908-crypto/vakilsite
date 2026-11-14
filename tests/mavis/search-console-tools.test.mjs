import test from "node:test";
import assert from "node:assert/strict";
import { createSearchConsoleClient } from "../../src/lib/mavis/search-console-client.mjs";
import { createSearchConsoleToolsHandler } from "../../src/lib/mavis/search-console-tools-handler.mjs";

const config = {
  clientId: "oauth-client-id",
  clientSecret: "oauth-client-secret",
  refreshToken: "refresh-token-secret",
  siteUrl: "https://vakilahmadmousavi.ir/",
};

function jsonResponse(payload, ok = true) {
  return { ok, async json() { return payload; } };
}

test("inspects only HTTPS URLs inside the configured Search Console property", async () => {
  const calls = [];
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "temporary-token", expires_in: 3600 });
      return jsonResponse({
        inspectionResult: {
          inspectionResultLink: "https://search.google.com/search-console/inspect",
          indexStatusResult: {
            verdict: "PASS",
            coverageState: "Indexed",
            robotsTxtState: "ALLOWED",
            indexingState: "INDEXING_ALLOWED",
            pageFetchState: "SUCCESSFUL",
            lastCrawlTime: "2026-11-13T12:00:00Z",
            googleCanonical: "https://vakilahmadmousavi.ir/articles/example",
            referringUrls: ["https://vakilahmadmousavi.ir/"],
          },
          mobileUsabilityResult: { verdict: "PASS" },
          richResultsResult: { verdict: "PASS", detectedItems: [{ richResultType: "Breadcrumbs", items: [{ name: "خانه" }] }] },
        },
      });
    },
  });

  await assert.rejects(() => client.inspectUrl("https://example.org/"));
  await assert.rejects(() => client.inspectUrl("http://vakilahmadmousavi.ir/"));
  assert.equal(calls.length, 0);

  const result = await client.inspectUrl("https://vakilahmadmousavi.ir/articles/example");
  assert.equal(result.indexStatus.verdict, "PASS");
  assert.equal(result.indexStatus.coverageState, "Indexed");
  assert.equal(result.mobileUsability.verdict, "PASS");
  assert.equal(result.richResults.detectedItems[0].type, "Breadcrumbs");
  assert.equal(calls[1].url, "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    inspectionUrl: "https://vakilahmadmousavi.ir/articles/example",
    siteUrl: "https://vakilahmadmousavi.ir/",
    languageCode: "fa-IR",
  });
  assert.equal(calls[1].options.headers.Authorization, "Bearer temporary-token");
});

test("accepts matching subdomains for a Search Console domain property", async () => {
  const client = createSearchConsoleClient({
    ...config,
    siteUrl: "sc-domain:vakilahmadmousavi.ir",
    fetchImpl: async (url) => url === "https://oauth2.googleapis.com/token"
      ? jsonResponse({ access_token: "temporary-token" })
      : jsonResponse({ inspectionResult: { indexStatusResult: { verdict: "NEUTRAL" } } }),
  });
  const result = await client.inspectUrl("https://www.vakilahmadmousavi.ir/about");
  assert.equal(result.inspectionUrl, "https://www.vakilahmadmousavi.ir/about");
  await assert.rejects(() => client.inspectUrl("https://vakilahmadmousavi.ir.attacker.example/"));
});

test("lists and normalizes sitemap status without exposing raw provider payloads", async () => {
  const calls = [];
  const client = createSearchConsoleClient({
    ...config,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return url === "https://oauth2.googleapis.com/token"
        ? jsonResponse({ access_token: "temporary-token" })
        : jsonResponse({ sitemap: [{
          path: "https://vakilahmadmousavi.ir/sitemap.xml",
          type: "SITEMAP",
          lastSubmitted: "2026-11-12T10:00:00Z",
          lastDownloaded: "2026-11-13T10:00:00Z",
          isPending: false,
          isSitemapsIndex: false,
          warnings: 1,
          errors: 0,
          contents: [{ type: "web", submitted: 120, indexed: 118 }],
          unexpectedProviderField: "must-not-leak",
        }] });
    },
  });

  const result = await client.listSitemaps();
  assert.equal(result.total, 1);
  assert.equal(result.sitemaps[0].errors, 0);
  assert.equal(result.sitemaps[0].contents[0].indexed, 118);
  assert.equal("unexpectedProviderField" in result.sitemaps[0], false);
  assert.equal(calls[1].url, "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fvakilahmadmousavi.ir%2F/sitemaps");
  assert.equal(calls[1].options.method, "GET");
});

function handler(overrides = {}) {
  return createSearchConsoleToolsHandler({
    requireAdmin: async () => ({
      configured: true,
      user: { id: "admin" },
      isAdmin: true,
      supabase: { rpc: async () => ({ data: { allowed: true } }) },
    }),
    getClient: async () => ({
      inspectUrl: async (url) => ({ inspectionUrl: url }),
      listSitemaps: async () => ({ total: 0, sitemaps: [] }),
    }),
    isJsonContentType: (value) => value === "application/json",
    matchesRequestOrigin: () => true,
    parseKnowledgeSearchRateLimit: () => ({ status: "allowed" }),
    ...overrides,
  });
}

test("tools handler enforces admin access, origin, media type and valid action", async () => {
  const request = (body, headers = {}) => new Request("https://vakilahmadmousavi.ir/api/admin/mavis/search-console/tools", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://vakilahmadmousavi.ir", ...headers },
    body: JSON.stringify(body),
  });

  const inspect = await handler()(request({ action: "inspect", url: "https://vakilahmadmousavi.ir/" }));
  assert.equal(inspect.status, 200);
  assert.equal((await inspect.json()).result.inspectionUrl, "https://vakilahmadmousavi.ir/");

  const sitemaps = await handler()(request({ action: "sitemaps" }));
  assert.equal((await sitemaps.json()).result.total, 0);

  const invalid = await handler()(request({ action: "delete" }));
  assert.equal(invalid.status, 400);

  const forbidden = await handler({ requireAdmin: async () => ({ configured: true, user: { id: "member" }, isAdmin: false }) })(request({ action: "sitemaps" }));
  assert.equal(forbidden.status, 403);

  const wrongOrigin = await handler({ matchesRequestOrigin: () => false })(request({ action: "sitemaps" }));
  assert.equal(wrongOrigin.status, 403);
});
