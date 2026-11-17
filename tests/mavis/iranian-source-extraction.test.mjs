import test from "node:test";
import assert from "node:assert/strict";
import { createIranianSourceSearch } from "../../src/lib/mavis/iranian-source-search.mjs";

test("extract retrieves only an allowlisted Iranian HTTPS source", async () => {
  let requestedUrl = "";
  let requestBody;
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          usage: { credits: 1 },
          results: [{
            url: "https://qavanin.ir/Law/TreeText/?IDS=123",
            raw_content: "# قانون نمونه\n\nمتن استخراج‌شده",
          }],
        }),
      };
    },
  });

  const result = await client.extract({ url: "https://qavanin.ir/Law/TreeText/?IDS=123#section" });
  assert.equal(requestedUrl, "https://api.tavily.com/extract");
  assert.deepEqual(requestBody.urls, ["https://qavanin.ir/Law/TreeText/?IDS=123"]);
  assert.equal(requestBody.format, "markdown");
  assert.equal(result.ok, true);
  assert.equal(result.sourceId, "qavanin");
  assert.match(result.content, /قانون نمونه/);
});

test("extract rejects unknown domains and unsafe URLs before network access", async () => {
  let called = false;
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async () => {
      called = true;
      throw new Error("unexpected network call");
    },
  });

  assert.deepEqual(await client.extract({ url: "https://example.com/article" }), {
    ok: false,
    reason: "invalid_url",
  });
  assert.deepEqual(await client.extract({ url: "http://qavanin.ir/law/1" }), {
    ok: false,
    reason: "invalid_url",
  });
  assert.equal(called, false);
});

test("extract reports unavailable content without returning an empty success", async () => {
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ results: [], failed_results: [{ url: "https://qavanin.ir/law/1" }] }),
    }),
  });

  assert.deepEqual(await client.extract({ url: "https://qavanin.ir/law/1" }), {
    ok: false,
    reason: "content_unavailable",
  });
});
