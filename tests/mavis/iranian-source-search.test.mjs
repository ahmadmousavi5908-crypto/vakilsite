import test from "node:test";
import assert from "node:assert/strict";
import { getIranianSourceDomains, normalizeIranianSourceUrl } from "../../src/lib/mavis/iranian-source-registry.mjs";
import { createIranianSourceSearch } from "../../src/lib/mavis/iranian-source-search.mjs";

test("the source allowlist contains Iranian official and academic domains only", () => {
  const domains = getIranianSourceDomains("all");
  assert.ok(domains.includes("qavanin.ir"));
  assert.ok(domains.includes("sid.ir"));
  assert.ok(domains.includes("magiran.com"));
  assert.ok(!domains.includes("crossref.org"));
  assert.ok(!domains.includes("semanticscholar.org"));
});

test("source URL validation accepts known sources and rejects unknown or unsafe URLs", () => {
  assert.equal(normalizeIranianSourceUrl("https://www.qavanin.ir/Law/123").source.id, "qavanin");
  assert.equal(normalizeIranianSourceUrl("https://evil.example/qavanin.ir"), null);
  assert.equal(normalizeIranianSourceUrl("http://qavanin.ir"), null);
  assert.equal(normalizeIranianSourceUrl("https://user:pass@qavanin.ir"), null);
  assert.equal(normalizeIranianSourceUrl("https://qavanin.ir:8443"), null);
});

test("search restricts provider domains and filters out unapproved provider results", async () => {
  let sentBody;
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          usage: 1,
          results: [
            { title: "قانون نمونه", url: "https://qavanin.ir/law/1", content: "متن نتیجه", score: 0.91 },
            { title: "منبع خارجی", url: "https://example.com/law", content: "نباید نمایش داده شود", score: 0.99 },
          ],
        }),
      };
    },
  });
  const result = await client.search({ query: "قانون مسئولیت مدنی", group: "official", limit: 10 });
  assert.equal(sentBody.include_domains_mode, "restrict");
  assert.ok(sentBody.include_domains.includes("qavanin.ir"));
  assert.ok(!sentBody.include_domains.includes("sid.ir"));
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].sourceAuthority, "official_primary");
  assert.equal(result.results[0].sourceId, "qavanin");
});

test("invalid query and unsupported source group are rejected before network access", async () => {
  let called = false;
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async () => { called = true; throw new Error("unexpected"); },
  });
  assert.deepEqual(await client.search({ query: "x" }), { ok: false, reason: "invalid_query" });
  assert.deepEqual(await client.search({ query: "ماده ۱۰", group: "global" }), { ok: false, reason: "invalid_group" });
  assert.equal(called, false);
});


test("no-key fallback searches Qavanin through Browser Run and normalizes official results", async () => {
  let capturedUrl = "";
  const markup = `
    <table>
      <tr class="row">
        <td><a href="/Law/TreeText/?IDS=12345678901234567890">open</a></td>
        <td>قانون نمونه مسئولیت مدنی</td>
        <td>1402/02/10</td>
        <td>مجلس شورای اسلامی</td>
      </tr>
    </table>
  `;
  const { createIranianSourceSearchFallback } = await import("../../src/lib/mavis/iranian-source-search.mjs");
  const client = createIranianSourceSearchFallback({
    browser: {
      quickAction: async (action, options) => {
        assert.equal(action, "content");
        capturedUrl = options.url;
        return { ok: true, json: async () => ({ success: true, result: markup }) };
      }
    }
  });
  const result = await client.search({ query: "مسئولیت مدنی", group: "official", limit: 5 });
  assert.equal(new URL(capturedUrl).hostname, "qavanin.ir");
  assert.equal(result.ok, true);
  assert.equal(result.provider, "cloudflare_browser_run_qavanin");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].sourceAuthority, "official_primary");
  assert.match(result.results[0].url, /IDS=12345678901234567890/);
  assert.ok(result.searchLinks.some((item) => item.id === "rrk"));
});

test("no-key fallback returns official portal links when Browser Run is unavailable or blocked", async () => {
  const { createIranianSourceSearchFallback } = await import("../../src/lib/mavis/iranian-source-search.mjs");
  const client = createIranianSourceSearchFallback();
  const result = await client.search({ query: "قانون مدنی", group: "official", limit: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.provider, "official_portal_fallback");
  assert.equal(result.results.length, 0);
  assert.ok(result.searchLinks.some((item) => item.id === "qavanin"));
  assert.ok(result.searchLinks.some((item) => item.id === "dotic"));
});

test("Browser Run failures degrade to verified portal links instead of a false search error", async () => {
  const { createIranianSourceSearchFallback } = await import("../../src/lib/mavis/iranian-source-search.mjs");
  const client = createIranianSourceSearchFallback({
    browser: { quickAction: async () => { throw new Error("bot protection"); } }
  });
  const result = await client.search({ query: "قانون تجارت", group: "official", limit: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.provider, "official_portal_fallback");
  assert.equal(result.providerErrors[0].code, "UPSTREAM_UNAVAILABLE");
  assert.ok(result.searchLinks.length >= 3);
});


test("all-source fallback includes academic domains instead of only legal portals", async () => {
  const { createIranianSourceSearchFallback } = await import("../../src/lib/mavis/iranian-source-search.mjs");
  const result = await createIranianSourceSearchFallback().search({
    query: "مسئولیت مدنی",
    group: "all",
    limit: 10
  });
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Asid.ir")));
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Amagiran.com")));
  assert.ok(result.searchLinks.some((item) => item.id === "qavanin"));
});
