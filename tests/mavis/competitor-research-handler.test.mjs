import test from "node:test";
import assert from "node:assert/strict";
import { createMavisCompetitorResearchHandler } from "../../src/lib/mavis/competitor-research-handler.mjs";

function dependencies(overrides = {}) {
  return {
    requireAdmin: async () => ({
      configured: true,
      user: { id: "admin-1" },
      isAdmin: true,
      supabase: { rpc: async () => ({ data: { allowed: true }, error: null }) }
    }),
    searchClient: { search: async (payload) => ({ ok: true, query: payload.query, results: [] }) },
    isJsonContentType: (value) => String(value || "").includes("application/json"),
    matchesRequestOrigin: () => true,
    parseKnowledgeSearchRateLimit: () => ({ status: "allowed" }),
    ...overrides
  };
}

function request(body = { query: "وکیل اهواز" }, headers = {}) {
  return new Request("https://example.com/api/admin/mavis/growth/competitors", {
    method: "POST",
    headers: { origin: "https://example.com", "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

test("serves a bounded search to an authenticated administrator", async () => {
  const handler = createMavisCompetitorResearchHandler(dependencies());
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test("rejects unauthenticated and non-admin callers", async () => {
  const unauthenticated = createMavisCompetitorResearchHandler(dependencies({
    requireAdmin: async () => ({ configured: true, user: null, isAdmin: false })
  }));
  assert.equal((await unauthenticated(request())).status, 401);

  const forbidden = createMavisCompetitorResearchHandler(dependencies({
    requireAdmin: async () => ({ configured: true, user: { id: "user-1" }, isAdmin: false })
  }));
  assert.equal((await forbidden(request())).status, 403);
});

test("rejects cross-origin and non-JSON requests", async () => {
  const originHandler = createMavisCompetitorResearchHandler(dependencies({
    matchesRequestOrigin: () => false
  }));
  assert.equal((await originHandler(request())).status, 403);

  const mediaHandler = createMavisCompetitorResearchHandler(dependencies({
    isJsonContentType: () => false
  }));
  assert.equal((await mediaHandler(request())).status, 415);
});

test("fails closed when search provider or rate limit is unavailable", async () => {
  const missingProvider = createMavisCompetitorResearchHandler(dependencies({ searchClient: null }));
  assert.equal((await missingProvider(request())).status, 503);

  const rateLimited = createMavisCompetitorResearchHandler(dependencies({
    parseKnowledgeSearchRateLimit: () => ({ status: "limited", retryAfterSeconds: 30 })
  }));
  assert.equal((await rateLimited(request())).status, 429);
});

test("rejects unknown request properties and oversized bodies", async () => {
  const handler = createMavisCompetitorResearchHandler(dependencies());
  assert.equal((await handler(request({ query: "وکیل", extra: "no" }))).status, 400);
  const oversized = new Request("https://example.com/api/admin/mavis/growth/competitors", {
    method: "POST",
    headers: { origin: "https://example.com", "content-type": "application/json" },
    body: JSON.stringify({ query: "x".repeat(5000) })
  });
  assert.equal((await handler(oversized)).status, 413);
});
