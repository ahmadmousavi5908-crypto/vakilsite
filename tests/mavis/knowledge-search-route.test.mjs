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
    rateLimit: 0,
    retrieve: 0,
    retrieveArgs: null,
  };

  const defaultAccess = makeAccess({
    supabase: {
      rpc: async () => {
        calls.rateLimit += 1;
        return {
          data: [{ allowed: true, retry_after_seconds: 0 }],
          error: null,
        };
      },
    },
  });

  const dependencies = {
    requireAdmin: async () => defaultAccess,
    retrieveMavisKnowledge: (query, limit) => {
      calls.retrieve += 1;
      calls.retrieveArgs = { query, limit };
      return {
        query,
        count: 1,
        results: [{ id: "law_civil_code", evidence: { state: "needs_official_check" } }],
        researchDossier: { ok: true, topic: query, itemCount: 1 },
        notice: "این خروجی فقط بازیابی است و نظر حقوقی محسوب نمی‌شود.",
      };
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
  assert.equal(calls.retrieve, 0);
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
  assert.equal(unauthenticated.calls.retrieve, 0);

  const nonAdmin = createHarness({
    requireAdmin: async () => makeAccess({ isAdmin: false }),
  });
  const nonAdminResponse = await nonAdmin.handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(nonAdminResponse.status, 403);
  assert.equal((await readError(nonAdminResponse)).code, "FORBIDDEN");
  assert.equal(nonAdmin.calls.retrieve, 0);
});

test("fails closed when the admin role check is unavailable", async () => {
  const { handler, calls } = createHarness({
    requireAdmin: async () => makeAccess({ adminCheckAvailable: false }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 503);
  assert.equal((await readError(response)).code, "AUTHORIZATION_UNAVAILABLE");
  assert.equal(calls.retrieve, 0);
});

test("rejects cross-origin requests before consuming a rate-limit slot", async () => {
  const { handler, calls } = createHarness();
  const response = await handler(makeRequest({ query: "قانون مدنی" }, { origin: "https://evil.example" }));
  assert.equal(response.status, 403);
  assert.equal((await readError(response)).code, "ORIGIN_REJECTED");
  assert.equal(calls.rateLimit, 0);
  assert.equal(calls.retrieve, 0);
});

test("fails closed when database rate limiting is unavailable", async () => {
  const { handler, calls } = createHarness({
    parseKnowledgeSearchRateLimit: () => ({ status: "unavailable" }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 503);
  assert.equal((await readError(response)).code, "RATE_LIMIT_UNAVAILABLE");
  assert.equal(calls.retrieve, 0);
});

test("fails closed when the database rate-limit RPC throws", async () => {
  const { handler, calls } = createHarness({
    requireAdmin: async () => makeAccess({
      supabase: {
        rpc: async () => {
          throw new Error("private database detail");
        },
      },
    }),
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 503);
  assert.equal((await readError(response)).code, "RATE_LIMIT_UNAVAILABLE");
  assert.equal(calls.retrieve, 0);
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
  assert.equal(calls.retrieve, 0);
});

test("rejects non-JSON media types", async () => {
  const { handler, calls } = createHarness();
  const response = await handler(makeRequest({ query: "قانون مدنی" }, { contentType: "text/plain" }));
  assert.equal(response.status, 415);
  assert.equal((await readError(response)).code, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal(calls.rateLimit, 0);
  assert.equal(calls.retrieve, 0);
});

test("rejects invalid JSON and oversized bodies", async () => {
  const invalid = createHarness();
  const invalidResponse = await invalid.handler(makeRequest("{"));
  assert.equal(invalidResponse.status, 400);
  assert.equal((await readError(invalidResponse)).code, "INVALID_JSON");
  assert.equal(invalid.calls.rateLimit, 0);

  const oversized = createHarness();
  const oversizedResponse = await oversized.handler(makeRequest("x".repeat(4097)));
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await readError(oversizedResponse)).code, "PAYLOAD_TOO_LARGE");
  assert.equal(oversized.calls.rateLimit, 0);
  assert.equal(oversized.calls.retrieve, 0);
});

test("rejects invalid query and result limit values", async () => {
  const shortQuery = createHarness();
  const shortResponse = await shortQuery.handler(makeRequest({ query: "ق" }));
  assert.equal(shortResponse.status, 400);
  assert.equal((await readError(shortResponse)).code, "INVALID_QUERY");
  assert.equal(shortQuery.calls.rateLimit, 0);

  const longQuery = createHarness();
  const longResponse = await longQuery.handler(makeRequest({ query: "ق".repeat(121) }));
  assert.equal(longResponse.status, 400);
  assert.equal((await readError(longResponse)).code, "INVALID_QUERY");
  assert.equal(longQuery.calls.rateLimit, 0);

  const invalidLimit = createHarness();
  const limitResponse = await invalidLimit.handler(makeRequest({ query: "قانون مدنی", limit: 21 }));
  assert.equal(limitResponse.status, 400);
  assert.equal((await readError(limitResponse)).code, "INVALID_LIMIT");
  assert.equal(invalidLimit.calls.rateLimit, 0);
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
  assert.deepEqual(calls.retrieveArgs, { query: "قانون مدنی", limit: 10 });
  assert.equal(calls.rateLimit, 1);
  assert.equal(calls.retrieve, 1);
});

test("returns a generic no-store error when retrieval or evidence assembly fails", async () => {
  const { handler } = createHarness({
    retrieveMavisKnowledge: () => { throw new Error("private internal failure"); },
  });
  const response = await handler(makeRequest({ query: "قانون مدنی" }));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.error.code, "SEARCH_FAILED");
  assert.equal(payload.error.message.includes("private internal failure"), false);
});
