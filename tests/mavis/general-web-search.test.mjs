import test from "node:test";
import assert from "node:assert/strict";
import { createGeneralWebSearch } from "../../src/lib/mavis/general-web-search.mjs";

test("general web search queries the public web without a domain allowlist", async () => {
  let request;
  const client = createGeneralWebSearch({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      request = options;
      return {
        ok: true,
        json: async () => ({
          usage: { credits: 1 },
          results: [
            {
              title: "Iranian law update",
              url: "https://example.org/legal/update",
              content: "A public web result.",
              score: 0.91,
              published_date: "2026-11-10",
            },
            {
              title: "Unsafe URL",
              url: "javascript:alert(1)",
              content: "Must be discarded.",
            },
            {
              title: "HTTP URL",
              url: "http://example.org/insecure",
              content: "Must be discarded.",
            },
          ],
        }),
      };
    },
  });

  const result = await client.search({ query: "قانون جدید", limit: 8 });
  const body = JSON.parse(request.body);

  assert.equal(request.method, "POST");
  assert.equal(body.query, "قانون جدید");
  assert.equal(body.max_results, 8);
  assert.equal(Object.hasOwn(body, "include_domains"), false);
  assert.equal(Object.hasOwn(body, "exclude_domains"), false);
  assert.equal(body.include_raw_content, false);
  assert.equal(body.include_answer, false);
  assert.equal(result.ok, true);
  assert.equal(result.scope, "public_web");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].domain, "example.org");
  assert.equal(result.usageCredits, 1);
});

test("general web search rejects invalid queries and limits", async () => {
  const client = createGeneralWebSearch({
    apiKey: "test-key",
    fetchImpl: async () => {
      throw new Error("Fetch must not run for invalid input.");
    },
  });

  assert.deepEqual(await client.search({ query: "x" }), { ok: false, reason: "invalid_query" });
  assert.deepEqual(await client.search({ query: "valid", limit: 11 }), { ok: false, reason: "invalid_limit" });
});

test("general web search requires a server-side API key", () => {
  assert.throws(() => createGeneralWebSearch({ apiKey: "" }), /not configured/i);
});


test("extracts a single validated HTTPS article URL with bounded clean content", async () => {
  let request;
  const client = createGeneralWebSearch({
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          usage: { credits: 1 },
          results: [{ url: "https://example.org/paper", raw_content: "# Paper\\n\\nExtracted content" }],
        }),
      };
    },
  });

  const result = await client.extract({ url: "https://example.org/paper", query: "حقوق قراردادها" });
  const body = JSON.parse(request.options.body);
  assert.equal(request.url, "https://api.tavily.com/extract");
  assert.equal(body.urls[0], "https://example.org/paper");
  assert.equal(body.query, "حقوق قراردادها");
  assert.equal(body.format, "markdown");
  assert.equal(result.ok, true);
  assert.match(result.content, /Extracted content/);
});

test("extract rejects unsafe URLs before making a provider request", async () => {
  const client = createGeneralWebSearch({
    apiKey: "test-key",
    fetchImpl: async () => { throw new Error("Fetch must not run for unsafe URLs."); },
  });
  assert.deepEqual(await client.extract({ url: "http://example.org/paper" }), { ok: false, reason: "invalid_url" });
  assert.deepEqual(await client.extract({ url: "https://user:pass@example.org/paper" }), { ok: false, reason: "invalid_url" });
});
