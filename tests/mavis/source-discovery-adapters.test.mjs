import test from "node:test";
import assert from "node:assert/strict";
import { createMavisSourceDiscoveryAdapters } from "../../src/lib/mavis/source-discovery-adapters.mjs";

function response(payload, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    text: async () => typeof payload === "string" ? payload : JSON.stringify(payload),
  };
}

test("Crossref adapter requests metadata-only fields and normalizes DOI/date precision", async () => {
  let request;
  const adapters = createMavisSourceDiscoveryAdapters({
    env: { MAVIS_CROSSREF_MAILTO: "editor@example.org" },
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return response({ message: { items: [{
        DOI: "10.1234/ABC",
        title: ["  Sample   legal paper "],
        author: [{ given: "A", family: "Writer" }],
        publisher: "Publisher",
        "container-title": ["Journal"],
        "published-print": { "date-parts": [[2024, 3]] },
        URL: "https://doi.org/10.1234/ABC",
      }] } });
    },
  });
  const result = await adapters.searchCrossref("legal research", 5);
  assert.equal(result.ok, true);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].doi, "10.1234/abc");
  assert.equal(result.candidates[0].publicationDate, "2024-03");
  assert.equal(result.candidates[0].rightsStatus, "unknown");
  assert.equal(request.url.searchParams.get("rows"), "5");
  assert.match(request.url.searchParams.get("select"), /DOI,title/);
  assert.equal(request.url.searchParams.has("mailto"), true);
  assert.equal(request.options.redirect, "error");
});

test("Semantic Scholar adapter sends API key only in header and excludes abstracts", async () => {
  let request;
  const adapters = createMavisSourceDiscoveryAdapters({
    env: { SEMANTIC_SCHOLAR_API_KEY: "private-test-key" },
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return response({ data: [{
        paperId: "paper-1",
        title: "Research",
        year: 2022,
        authors: [{ name: "Author" }],
        url: "https://example.org/paper",
      }] });
    },
  });
  const result = await adapters.searchSemanticScholar("research");
  assert.equal(result.ok, true);
  assert.equal(result.candidates[0].publicationDate, "2022");
  assert.equal(request.options.headers["x-api-key"], "private-test-key");
  assert.equal(request.url.searchParams.has("api_key"), false);
  assert.doesNotMatch(request.url.searchParams.get("fields"), /abstract|openAccessPdf/i);
});

test("OpenAlex searches metadata with bounded fields and normalizes DOI and authors", async () => {
  let request;
  const adapters = createMavisSourceDiscoveryAdapters({
    env: { OPENALEX_API_KEY: "private-test-key" },
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return response({ results: [{
        id: "https://openalex.org/W123",
        doi: "https://doi.org/10.1234/ABC",
        title: "Open research",
        publication_date: "2025-04-02",
        authorships: [{ author: { display_name: "Research Author" } }],
        primary_location: { landing_page_url: "https://journal.example/article", source: { display_name: "Journal", host_organization_name: "Publisher" } },
      }] });
    },
  });
  const result = await adapters.searchOpenAlex("open research", 5);
  assert.equal(result.ok, true);
  assert.equal(result.candidates[0].provider, "openalex");
  assert.equal(result.candidates[0].doi, "10.1234/abc");
  assert.equal(result.candidates[0].publicationDate, "2025-04-02");
  assert.deepEqual(result.candidates[0].authors, ["Research Author"]);
  assert.equal(request.url.searchParams.get("per_page"), "5");
  assert.match(request.url.searchParams.get("select"), /authorships/);
  assert.equal(request.options.headers.Authorization, "Bearer private-test-key");
  assert.equal(request.url.searchParams.has("api_key"), false);
});

test("OpenAlex can use its keyless allowance when no API key is configured", async () => {
  let called = false;
  const adapters = createMavisSourceDiscoveryAdapters({
    env: {},
    fetchImpl: async () => { called = true; return response({ results: [] }); },
  });
  const result = await adapters.searchOpenAlex("law");
  assert.equal(result.ok, true);
  assert.equal(called, true);
});

test("adapter bounds query and result count", async () => {
  let requestUrl;
  const adapters = createMavisSourceDiscoveryAdapters({
    fetchImpl: async (url) => { requestUrl = new URL(url); return response({ data: [] }); },
  });
  assert.equal((await adapters.searchSemanticScholar("x")).error, "INVALID_QUERY");
  const result = await adapters.searchSemanticScholar("valid query", 999);
  assert.equal(result.ok, true);
  assert.equal(requestUrl.searchParams.get("limit"), "20");
});

test("adapter maps upstream throttling and malformed responses to safe errors", async () => {
  const limited = createMavisSourceDiscoveryAdapters({ fetchImpl: async () => response({}, 429) });
  assert.equal((await limited.searchCrossref("valid query")).error, "RATE_LIMITED");

  const malformed = createMavisSourceDiscoveryAdapters({ fetchImpl: async () => response("{not-json") });
  assert.equal((await malformed.searchCrossref("valid query")).error, "UPSTREAM_INVALID_JSON");
});

test("adapter rejects oversized upstream response", async () => {
  const adapters = createMavisSourceDiscoveryAdapters({
    maxResponseBytes: 8,
    fetchImpl: async () => response('{"results":[]}'),
  });
  assert.equal((await adapters.searchCrossref("valid query")).error, "UPSTREAM_RESPONSE_TOO_LARGE");
});

test("adapter treats redirects as errors and does not expose upstream payloads", async () => {
  let options;
  const adapters = createMavisSourceDiscoveryAdapters({
    fetchImpl: async (_url, value) => { options = value; throw new Error("upstream secret body"); },
  });
  const result = await adapters.searchCrossref("valid query");
  assert.equal(options.redirect, "error");
  assert.equal(result.error, "UPSTREAM_NETWORK_ERROR");
  assert.equal(JSON.stringify(result).includes("upstream secret body"), false);
});


test("adapter stops reading streamed responses as soon as the byte limit is exceeded", async () => {
  let cancelled = false;
  const payload = new TextEncoder().encode('{"message":{"items":[]}}');
  const adapters = createMavisSourceDiscoveryAdapters({
    maxResponseBytes: 8,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => ({ done: false, value: payload }),
          cancel: async () => { cancelled = true; },
          releaseLock: () => {},
        }),
      },
    }),
  });
  const result = await adapters.searchCrossref("stream test");
  assert.equal(result.error, "UPSTREAM_RESPONSE_TOO_LARGE");
  assert.equal(cancelled, true);
});


test("OpenAlex sends its API key in the authorization header", async () => {
  let options;
  const adapters = createMavisSourceDiscoveryAdapters({
    env: { OPENALEX_API_KEY: "private-test-key" },
    fetchImpl: async (_url, value) => { options = value; return response({ results: [] }); },
  });
  await adapters.searchOpenAlex("law");
  assert.equal(options.headers.Authorization, "Bearer private-test-key");
});
