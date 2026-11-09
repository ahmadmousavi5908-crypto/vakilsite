import test from "node:test";
import assert from "node:assert/strict";
import { createSearchConsoleHandler } from "../../src/lib/mavis/search-console-handler.mjs";

const successResult = {
  ok: true,
  source: "google_search_console_search_analytics",
  rows: [],
  coverage: { rowCount: 0, mayBeTruncated: false, apiCompletenessGuaranteed: false },
};

function request(body, headers = {}) {
  return new Request("https://vakilahmadmousavi.ir/api/admin/mavis/search-console", {
    method: "POST",
    headers: {
      origin: "https://vakilahmadmousavi.ir",
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    requireAdmin: async () => ({
      configured: true,
      authenticationAvailable: true,
      adminCheckAvailable: true,
      user: { id: "admin-user" },
      isAdmin: true,
      supabase: { async rpc() { return { data: { allowed: true } }; } },
    }),
    client: { async querySearchAnalytics() { return successResult; } },
    isJsonContentType: (value) => /^application\/json(?:\s*;|$)/i.test(value || ""),
    matchesRequestOrigin: (origin, url) => origin === new URL(url).origin,
    parseKnowledgeSearchRateLimit: () => ({ status: "allowed" }),
    ...overrides,
  };
}

const validPayload = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  dimensions: ["query", "page"],
  type: "web",
  dataState: "final",
  rowLimit: 1000,
  startRow: 0,
};

test("serves normalized Search Console data only to authenticated administrators", async () => {
  let received;
  const handler = createSearchConsoleHandler(dependencies({
    client: { async querySearchAnalytics(payload) { received = payload; return successResult; } },
  }));
  const response = await handler(request(validPayload));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), successResult);
  assert.deepEqual(received, validPayload);
});

test("fails closed for missing admin, missing configuration and rejected origins", async () => {
  const unauthenticated = createSearchConsoleHandler(dependencies({
    requireAdmin: async () => ({ configured: true, user: null }),
  }));
  assert.equal((await unauthenticated(request(validPayload))).status, 401);

  const forbidden = createSearchConsoleHandler(dependencies({
    requireAdmin: async () => ({ configured: true, user: { id: "user" }, isAdmin: false }),
  }));
  assert.equal((await forbidden(request(validPayload))).status, 403);

  const notConfigured = createSearchConsoleHandler(dependencies({ client: null }));
  assert.equal((await notConfigured(request(validPayload))).status, 503);

  const originRejected = createSearchConsoleHandler(dependencies({
    matchesRequestOrigin: () => false,
  }));
  assert.equal((await originRejected(request(validPayload))).status, 403);
});

test("rejects invalid media types, malformed JSON, unknown fields and oversized payloads", async () => {
  const handler = createSearchConsoleHandler(dependencies());
  assert.equal((await handler(request(validPayload, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await handler(request("{invalid"))).status, 400);
  assert.equal((await handler(request({ ...validPayload, arbitraryUrl: "https://evil.example" }))).status, 400);
  assert.equal((await handler(request({ ...validPayload, rowLimit: 6000 }))).status, 400);
  assert.equal((await handler(request("x".repeat(5000)))).status, 413);
});

test("uses fail-closed rate limiting and does not call the external client when limited", async () => {
  let called = false;
  const handler = createSearchConsoleHandler(dependencies({
    client: { async querySearchAnalytics() { called = true; return successResult; } },
    parseKnowledgeSearchRateLimit: () => ({ status: "limited", retryAfterSeconds: 30 }),
  }));
  const response = await handler(request(validPayload));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(called, false);
});

test("maps invalid provider requests and upstream failures to safe responses", async () => {
  const invalid = createSearchConsoleHandler(dependencies({
    client: { async querySearchAnalytics() { return { ok: false, reason: "invalid_dimensions" }; } },
  }));
  const invalidResponse = await invalid(request(validPayload));
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).error.reason, "invalid_dimensions");

  const failed = createSearchConsoleHandler(dependencies({
    client: { async querySearchAnalytics() { throw new Error("refresh token must not leak"); } },
  }));
  const failedResponse = await failed(request(validPayload));
  assert.equal(failedResponse.status, 502);
  assert.doesNotMatch(JSON.stringify(await failedResponse.json()), /refresh token must not leak/);
});
