import test from "node:test";
import assert from "node:assert/strict";
import { createIranianSourceSearch } from "../../src/lib/mavis/iranian-source-search.mjs";

test("extract returns structured legal metadata from an allowlisted Iranian HTTPS source", async () => {
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
          costDollars: { total: 0.001 },
          results: [{
            url: "https://qavanin.ir/Law/TreeText/?IDS=123",
            summary: JSON.stringify({
              author: "",
              publication: "دیوان عالی کشور",
              publicationDate: "۱۴۰۵/۰۸/۲۰",
              documentNumber: "۱۲۳",
              issuingAuthority: "هیأت عمومی دیوان عالی کشور",
              documentType: "رأی وحدت رویه",
              abstract: "خلاصه مستند رأی نمونه",
              headings: ["موضوع رأی", "مستندات قانونی"]
            })
          }]
        })
      };
    }
  });
  const result = await client.extract({ url: "https://qavanin.ir/Law/TreeText/?IDS=123#section" });
  assert.equal(requestedUrl, "https://api.exa.ai/contents");
  assert.deepEqual(requestBody.ids, ["https://qavanin.ir/Law/TreeText/?IDS=123"]);
  assert.ok(requestBody.summary.schema.properties.documentNumber);
  assert.equal(result.ok, true);
  assert.equal(result.sourceId, "qavanin");
  assert.equal(result.metadata.documentType, "رأی وحدت رویه");
  assert.equal(result.metadata.documentNumber, "۱۲۳");
  assert.match(result.content, /خلاصه مستند رأی نمونه/);
});

test("extract rejects unknown domains and unsafe URLs before network access", async () => {
  let called = false;
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async () => { called = true; throw new Error("unexpected network call"); }
  });
  assert.deepEqual(await client.extract({ url: "https://example.com/article" }), { ok: false, reason: "invalid_url" });
  assert.deepEqual(await client.extract({ url: "http://qavanin.ir/law/1" }), { ok: false, reason: "invalid_url" });
  assert.equal(called, false);
});

test("extract reports unavailable structured content without returning an empty success", async () => {
  const client = createIranianSourceSearch({
    apiKey: "test-key",
    fetchImpl: async () => ({ ok: true, json: async () => ({ results: [], statuses: [{ status: "error" }] }) })
  });
  assert.deepEqual(await client.extract({ url: "https://qavanin.ir/law/1" }), { ok: false, reason: "content_unavailable" });
});
