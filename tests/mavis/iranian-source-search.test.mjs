import test from "node:test";
import assert from "node:assert/strict";
import { getIranianSourceDomains, normalizeIranianSourceUrl } from "../../src/lib/mavis/iranian-source-registry.mjs";
import { createIranianSourceSearch, createIranianSourceSearchFallback } from "../../src/lib/mavis/iranian-source-search.mjs";
import { normalizeMavisManualSourceInput } from "../../src/lib/mavis/manual-source-input.mjs";

test("the allowlist contains exactly ten selected Iranian legal and research sources", () => {
  const domains = getIranianSourceDomains("all");
  assert.equal(domains.length, 10);
  for (const domain of [
    "qavanin.ir", "dotic.ir", "rrk.ir", "rc.majlis.ir", "shora-gc.ir",
    "divan-edalat.ir", "divan-ali.ir", "sid.ir", "mizanonline.ir", "ekhtebar.ir",
  ]) assert.ok(domains.includes(domain), domain);
  assert.ok(!domains.includes("crossref.org"));
  assert.ok(!domains.includes("semanticscholar.org"));
});

test("source URL validation accepts Iranian sources and rejects unknown or unsafe URLs", () => {
  assert.equal(normalizeIranianSourceUrl("https://www.qavanin.ir/Law/123").source.id, "qavanin");
  assert.equal(normalizeIranianSourceUrl("https://www.ekhtebar.ir/news/123").source.id, "ekhtebar");
  assert.equal(normalizeIranianSourceUrl("https://mizanonline.ir/news/123").source.id, "mizan");
  assert.equal(normalizeIranianSourceUrl("https://evil.example/qavanin.ir"), null);
  assert.equal(normalizeIranianSourceUrl("http://qavanin.ir"), null);
  assert.equal(normalizeIranianSourceUrl("https://user:pass@qavanin.ir"), null);
  assert.equal(normalizeIranianSourceUrl("https://qavanin.ir:8443"), null);
});

test("online search is restricted to the selected Iranian source group", async () => {
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
            { title: "خبر اختبار", url: "https://ekhtebar.ir/news/1", content: "گزارش حقوقی", score: 0.91 },
            { title: "خبر خارجی", url: "https://example.com/law", content: "نباید نمایش داده شود", score: 0.99 },
          ],
        }),
      };
    },
  });
  const result = await client.search({ query: "رأی وحدت رویه", group: "news", limit: 10 });
  assert.equal(sentBody.include_domains_mode, "restrict");
  assert.deepEqual(sentBody.include_domains, ["mizanonline.ir", "ekhtebar.ir"]);
  assert.equal(result.group, "news");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].sourceAuthority, "legal_news");
  assert.equal(result.results[0].sourceId, "ekhtebar");
});

test("Google fallback exposes a direct query for each configured Iranian news source", async () => {
  const result = await createIranianSourceSearchFallback().search({
    query: "رأی وحدت رویه",
    group: "news",
  });
  assert.equal(result.ok, true);
  assert.equal(result.group, "news");
  assert.equal(result.searchLinks.length, 2);
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Aekhtebar.ir")));
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Amizanonline.ir")));
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


test("Qavanin Browser Run fallback parses official source metadata", async () => {
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

test("no-key fallback returns official portal links when Browser Run is unavailable", async () => {
  const result = await createIranianSourceSearchFallback().search({
    query: "قانون مدنی",
    group: "official",
    limit: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.provider, "official_portal_fallback");
  assert.equal(result.results.length, 0);
  assert.ok(result.searchLinks.some((item) => item.id === "qavanin"));
  assert.ok(result.searchLinks.some((item) => item.id === "dotic"));
});

test("Browser Run failures degrade to verified portal links instead of a false search error", async () => {
  const client = createIranianSourceSearchFallback({
    browser: { quickAction: async () => { throw new Error("bot protection"); } }
  });
  const result = await client.search({ query: "قانون تجارت", group: "official", limit: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.provider, "official_portal_fallback");
  assert.equal(result.providerErrors[0].code, "UPSTREAM_UNAVAILABLE");
  assert.ok(result.searchLinks.length >= 3);
});

test("all-source fallback includes the selected Iranian academic and legal-news domains", async () => {
  const result = await createIranianSourceSearchFallback().search({
    query: "مسئولیت مدنی",
    group: "all",
    limit: 10
  });
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Asid.ir")));
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Amizanonline.ir")));
  assert.ok(result.searchLinks.some((item) => item.url.includes("site%3Aekhtebar.ir")));
  assert.ok(result.searchLinks.some((item) => item.id === "qavanin"));
});


test("Iranian legal-news results normalize as secondary news sources for article drafts", () => {
  const normalized = normalizeMavisManualSourceInput({
    title: "گزارش حقوقی اختبار",
    sourceUrl: "https://ekhtebar.ir/news/123",
    sourceType: "news",
    relationType: "secondary_reference",
    sourceAuthority: "legal_news",
    sourceGroup: "news",
    provider: "tavily",
  });
  assert.equal(normalized.source.sourceType, "news");
  assert.equal(normalized.relationType, "secondary_reference");
  assert.equal(normalized.source.sourceAuthority, "legal_news");
});
