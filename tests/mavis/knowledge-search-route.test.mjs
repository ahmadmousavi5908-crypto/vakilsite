import test from "node:test";
import assert from "node:assert/strict";
import { createKnowledgeSearchHandler } from "../../src/lib/mavis/knowledge-search-handler.mjs";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../src/lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../src/lib/mavis/rate-limit.mjs";

const ORIGIN = "https://example.com";
const URL = `${ORIGIN}/api/mavis/knowledge-search`;

function makeAccess(overrides = {}) {
  return {
    configured: true,
    authenticationAvailable: true,
    user: { id: "admin-user" },
    adminCheckAvailable: true,
    isAdmin: true,
    supabase: {
      rpc: async () => ({
        data: [{ allowed: true, retry_after_seconds: 0 }],
        error: null,
      }),
    },
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  const calls = {
    search: 0,
    evidence: 0,
    dossier: 0,
    searchArgs: null,
    dossierArgs: null,
  };

  const dependencies = {
    requireAdmin: async () => makeAccess(),
    searchMavisKnowledge: (query, limit) => {
      calls.search += 1;
      calls.searchArgs = { query, limit };
      return [{
        id: "law_civil_code",
        record_type: "law",
        title: "قانون مدنی",
        review_status: "needs_legal_review",
        source_class: undefined,
        search_score: 1000,
        matched_field: "title",
      }];
    },
    buildLegalEvidence: (record) => {
      calls.evidence += 1;
      return { recordId: record.id, state: "needs_official_check" };
    },
    buildLegalResearchDossier: (args) => {
      calls.dossier += 1;
      calls.dossierArgs = args;
      return { ok: true, topic: args.topic, itemCount: args.records.length };
    },
    isJsonContentType,
    matchesRequestOrigin,
    parseKnowledgeSearchRateLimit,
    ...overrides,
  };

  return {
    handler: createKnowledgeSearchHandler(dependencies),
    calls,
  };
}

function makeRequest(body, options = {}) {
  const headers = new Headers();
  if (options.origin !== null) headers.set("origin", options.origin ?? ORIGIN);
  if (options.contentType !== null) headers.set("content-type", options.contentType ?? "application/json");

  const init = { method: "POST", headers };
  if (body !== undefined && body !== null) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  return new Request(URL, init);
}

async function readError(response) {
  const payload = await response.json();
  assert.equal(response.headers.get("cache-control"), "no-store");
  return payload.error;
}

test("rejects missing admin configuration without searching", async () => {
  const { handler, calls } = createHarness({
    requireAdmin: async () => makeAccess({ configured: false }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 503);
  assert.equal((await readError(response)).code, "SERVICE_UNAVAILABLE");
  assert.equal(calls.search, 0);
});

test("fails closed when admin authentication throws or is unavailable", async () => {
  const throwing = createHarness({ requireAdmin: async () => { throw new Error("private auth detail"); } });
  const thrownResponse = await throwing.handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(thrownResponse.status, 503);
  assert.equal((await readError(thrownResponse)).code, "AUTH_UNAVAILABLE");

  const unavailable = createHarness({
    requireAdmin: async () => makeAccess({ authenticationAvailable: false }),
  });
  const unavailableResponse = await unavailable.handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(unavailableResponse.status, 503);
  assert.equal((await readError(unavailableResponse)).code, "AUTH_UNAVAILABLE");
});

test("rejects unauthenticated and non-admin users before rate limiting", async () => {
  const unauthenticated = createHarness({
    requireAdmin: async () => makeAccess({ user: null }),
  });
  const unauthenticatedResponse = await unauthenticated.handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(unauthenticatedResponse.status, 401);
  assert.equal((await readError(unauthenticatedResponse)).code, "UNAUTHENTICATED");
  assert.equal(unauthenticated.calls.search, 0);

  const nonAdmin = createHarness({
    requireAdmin: async () => makeAccess({ isAdmin: false }),
  });
  const nonAdminResponse = await nonAdmin.handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(nonAdminResponse.status, 403);
  assert.equal((await readError(nonAdminResponse)).code, "FORBIDDEN");
  assert.equal(nonAdmin.calls.search, 0);
});

test("fails closed when the admin role check is unavailable", async () => {
  const { handler, calls } = createHarness({
    requireAdmin: async () => makeAccess({ adminCheckAvailable: false }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 503);
  assert.equal((await readError(response)).code, "AUTHORIZATION_UNAVAILABLE");
  assert.equal(calls.search, 0);
});

test("rejects cross-origin requests before consuming a rate-limit slot", async () => {
  const { handler, calls } = createHarness();
  const response = await handler(makeRequest({ query: "قانون مدنی" }, { origin: "https://evil.example" }));
  assert.equal(response.status, 403);
  assert.equal((await readError(response)).code, "ORIGIN_REJECTED");
  assert.equal(calls.search, 0);
});

test("fails closed when database rate limiting is unavailable", async () => {
  const { handler, calls } = createHarness({
    parseKnowledgeSearchRateLimit: () => ({ status: "unavailable" }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 503);
  assert.equal((await readError(response)).code, "RATE_LIMIT_UNAVAILABLE");
  assert.equal(calls.search, 0);
});

test("returns a bounded Retry-After response when rate limited", async () => {
  const { handler, calls } = createHarness({
    parseKnowledgeSearchRateLimit: () => ({ status: "limited", retryAfterSeconds: 17 }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "17");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).error.code, "RATE_LIMITED");
  assert.equal(calls.search, 0);
});

test("rejects non-JSON media types", async () => {
  const { handler, calls } = createHarness();
  const response = await handler(makeRequest({ query: "قانون مدنی" }, { contentType: "text/plain" }));
  assert.equal(response.status, 415);
  assert.equal((await readError(response)).code, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal(calls.search, 0);
});

test("rejects invalid JSON and oversized bodies", async () => {
  const invalid = createHarness();
  const invalidResponse = await invalid.handler(makeRequest("{"));
  assert.equal(invalidResponse.status, 400);
  assert.equal((await readError(invalidResponse)).code, "INVALID_JSON");

  const oversized = createHarness();
  const oversizedResponse = await oversized.handler(makeRequest("x".repeat(4097)));
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await readError(oversizedResponse)).code, "PAYLOAD_TOO_LARGE");
  assert.equal(oversized.calls.search, 0);
});

test("rejects invalid query and result limit values", async () => {
  const shortQuery = createHarness();
  const shortResponse = await shortQuery.handler(makeRequest({ query: "ق" }));
  assert.equal(shortResponse.status, 400);
  assert.equal((await readError(shortResponse)).code, "INVALID_QUERY");

  const longQuery = createHarness();
  const longResponse = await longQuery.handler(makeRequest({ query: "ق".repeat(121) }));
  assert.equal(longResponse.status, 400);
  assert.equal((await readError(longResponse)).code, "INVALID_QUERY");

  const invalidLimit = createHarness();
  const limitResponse = await invalidLimit.handler(makeRequest({ query: "قانون مدنی", limit: 21 }));
  assert.equal(limitResponse.status, 400);
  assert.equal((await readError(limitResponse)).code, "INVALID_LIMIT");
});

test("normalizes legal records and returns evidence plus a research dossier", async () => {
  const { handler, calls } = createHarness();
  const response = await handler(makeRequest({ query: "  قانون مدنی  " }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(payload.query, "قانون مدنی");
  assert.equal(payload.count, 1);
  assert.equal(payload.results[0].evidence.state, "needs_official_check");
  assert.equal(payload.researchDossier.ok, true);
  assert.equal(payload.notice.includes("نظر حقوقی"), true);
  assert.deepEqual(calls.searchArgs, { query: "قانون مدنی", limit: 10 });
  assert.equal(calls.dossierArgs.records[0].source_class, "statute");
  assert.equal(calls.evidence, 1);
  assert.equal(calls.dossier, 1);
});

test("returns a generic no-store error when retrieval or evidence assembly fails", async () => {
  const { handler } = createHarness({
    searchMavisKnowledge: () => { throw new Error("private internal failure"); },
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.error.code, "SEARCH_FAILED");
  assert.equal(payload.error.message.includes("private internal failure"), false);
});
