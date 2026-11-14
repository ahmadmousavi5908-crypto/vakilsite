import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrossrefAdapter,
  createSemanticScholarAdapter,
  createOpenAlexAdapter,
  createAcademicSourceAdapters,
  searchAcademicSources,
} from "../../src/lib/mavis/academic-source-adapters.mjs";

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(payload); },
  };
}

test("Crossref adapter requests bounded metadata and preserves date precision", async () => {
  let requestedUrl;
  let requestedHeaders;
  const adapter = createCrossrefAdapter({
    mailto: "editor@example.com",
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      requestedHeaders = options.headers;
      return response({
        message: {
          items: [{
            DOI: "10.1234/ABC.1",
            title: ["  A legal research title  "],
            author: [{ given: "Sara", family: "Smith" }],
            publisher: "Example Journal",
            "container-title": ["Journal of Law"],
            published: { "date-parts": [[2024, 5]] },
            URL: "https://doi.org/10.1234/ABC.1",
            abstract: "This field must never be requested or persisted.",
          }],
        },
      });
    },
  });

  const results = await adapter.search("legal research", 5);
  assert.equal(requestedUrl.origin, "https://api.crossref.org");
  assert.equal(requestedUrl.searchParams.get("rows"), "5");
  assert.match(requestedUrl.searchParams.get("select"), /title/);
  assert.doesNotMatch(requestedUrl.searchParams.get("select"), /abstract|URL.*abstract/);
  assert.match(requestedHeaders["User-Agent"], /mailto:editor@example.com/);
  assert.equal(results.length, 1);
  assert.equal(results[0].doi, "10.1234/abc.1");
  assert.equal(results[0].publishedOn, "2024-05");
  assert.equal(results[0].publicationDatePrecision, "month");
  assert.equal(results[0].authors[0], "Sara Smith");
  assert.equal(results[0].rightsStatus, "unknown");
  assert.equal(results[0].contentIncluded, false);
  assert.equal("abstract" in results[0], false);
});

test("Semantic Scholar adapter sends API key only in header and requests metadata fields", async () => {
  let requestUrl;
  let requestHeaders;
  const adapter = createSemanticScholarAdapter({
    apiKey: "test-secret",
    fetchImpl: async (url, options) => {
      requestUrl = new URL(url);
      requestHeaders = options.headers;
      return response({
        data: [{
          paperId: "paper-1",
          title: "Legal analysis",
          year: 2022,
          publicationDate: null,
          venue: "Law Review",
          authors: [{ name: "A. Author" }],
          externalIds: { DOI: "10.5555/paper" },
          url: "https://example.org/paper",
          abstract: "Not requested.",
        }],
      });
    },
  });

  const results = await adapter.search("legal analysis", 7);
  assert.equal(requestHeaders["x-api-key"], "test-secret");
  assert.equal(requestUrl.searchParams.has("api_key"), false);
  assert.equal(requestUrl.searchParams.get("limit"), "7");
  assert.doesNotMatch(requestUrl.searchParams.get("fields"), /abstract|openAccessPdf/);
  assert.equal(results[0].provider, "semantic_scholar");
  assert.equal(results[0].publishedOn, "2022");
  assert.equal(results[0].publicationDatePrecision, "year");
});

test("OpenAlex remains disabled without explicit key and positive budget", () => {
  assert.equal(createOpenAlexAdapter({ enabled: true, apiKey: "key" }), null);
  assert.equal(createOpenAlexAdapter({ enabled: true, apiKey: "key", dailyBudgetUsd: 0 }), null);
  assert.equal(createOpenAlexAdapter({ enabled: false, apiKey: "key", dailyBudgetUsd: 5 }), null);
});

test("OpenAlex sends bearer key and normalizes author and publication metadata", async () => {
  let requestHeaders;
  const adapter = createOpenAlexAdapter({
    enabled: true,
    apiKey: "openalex-secret",
    dailyBudgetUsd: 2,
    fetchImpl: async (_url, options) => {
      requestHeaders = options.headers;
      return response({
        results: [{
          id: "https://openalex.org/W123",
          doi: "https://doi.org/10.7777/example",
          title: "Open research",
          publication_year: 2021,
          publication_date: "2021-09-17",
          authorships: [{ author: { display_name: "Research Author" } }],
          primary_location: {
            landing_page_url: "https://journal.example/article",
            source: { display_name: "Journal" },
          },
          abstract_inverted_index: { hidden: [1] },
        }],
      });
    },
  });

  const results = await adapter.search("open research", 3);
  assert.equal(requestHeaders.Authorization, "Bearer openalex-secret");
  assert.equal(results[0].providerId, "https://openalex.org/W123");
  assert.equal(results[0].publishedOn, "2021-09-17");
  assert.equal(results[0].publicationDatePrecision, "day");
  assert.deepEqual(results[0].authors, ["Research Author"]);
  assert.equal(results[0].sourceUrl, "https://journal.example/article");
  assert.equal("abstract" in results[0], false);
});

test("invalid queries and limits are rejected before network access", async () => {
  let calls = 0;
  const adapter = createSemanticScholarAdapter({
    fetchImpl: async () => { calls += 1; return response({ data: [] }); },
  });
  await assert.rejects(adapter.search("x", 10), /2 to 120/);
  await assert.rejects(adapter.search("valid query", 21), /between 1 and 20/);
  assert.equal(calls, 0);
});

test("provider failures are isolated and returned without leaking upstream details", async () => {
  const adapters = [
    { provider: "crossref", search: async () => [{ title: "One" }] },
    { provider: "semantic_scholar", search: async () => {
      const error = new Error("secret upstream response");
      error.code = "PROVIDER_RATE_LIMITED";
      throw error;
    } },
  ];
  const results = await searchAcademicSources(adapters, "valid query", 5);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[0].results.length, 1);
  assert.equal(results[1].status, "rejected");
  assert.equal(results[1].errorCode, "PROVIDER_RATE_LIMITED");
  assert.equal("message" in results[1], false);
});

test("provider response size and malformed JSON are rejected safely", async () => {
  const oversized = createSemanticScholarAdapter({
    fetchImpl: async () => ({ ok: true, status: 200, async text() { return " ".repeat(1024 * 1024 + 1); } }),
  });
  await assert.rejects(oversized.search("valid query"), { code: "PROVIDER_RESPONSE_TOO_LARGE" });

  const malformed = createSemanticScholarAdapter({
    fetchImpl: async () => ({ ok: true, status: 200, async text() { return "not-json"; } }),
  });
  await assert.rejects(malformed.search("valid query"), { code: "PROVIDER_INVALID_RESPONSE" });
});

test("429 responses are normalized to a stable provider error", async () => {
  const adapter = createCrossrefAdapter({
    mailto: "editor@example.com",
    fetchImpl: async () => response({}, 429),
  });
  await assert.rejects(adapter.search("legal query"), { code: "PROVIDER_RATE_LIMITED" });
});

test("adapter registry enables only explicitly configured providers", () => {
  const adapters = createAcademicSourceAdapters({
    crossref: { enabled: false },
    semanticScholar: { enabled: false },
    openAlex: { enabled: false, apiKey: "key", dailyBudgetUsd: 10 },
  });
  assert.deepEqual(adapters, []);
});
