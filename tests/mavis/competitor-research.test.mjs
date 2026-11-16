import test from "node:test";
import assert from "node:assert/strict";
import {
  createMavisCompetitorSearch,
  normalizeMavisCompetitorResearchInput
} from "../../src/lib/mavis/competitor-research.mjs";

test("normalizes location and competitor domains", () => {
  const result = normalizeMavisCompetitorResearchInput({
    query: "وکیل کیفری",
    location: "اهواز",
    domains: "https://www.iranvakil.org, vakilbin.com, vakilahmadmousavi.ir"
  });
  assert.deepEqual(result.domains, ["iranvakil.org", "vakilbin.com"]);
  assert.equal(result.limit, 8);
});

test("rejects invalid queries and unsafe domain inputs", () => {
  assert.throws(() => normalizeMavisCompetitorResearchInput({ query: "ab" }));
  assert.throws(() => normalizeMavisCompetitorResearchInput({ query: "وکیل", domains: "localhost" }));
  assert.throws(() => normalizeMavisCompetitorResearchInput({ query: "وکیل", domains: "example.com/path" }));
});

test("uses bounded public search without raw content or generated answers", async () => {
  let requestBody;
  const client = createMavisCompetitorSearch({
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.tavily.com/search");
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          usage: { credits: 1 },
          results: [
            { title: "نمونه رقیب", url: "https://iranvakil.org/ahvaz", content: "خلاصه صفحه", score: 0.91 },
            { title: "نشانی ناامن", url: "http://example.com", content: "نباید نمایش داده شود", score: 0.8 },
            { title: "وب‌سایت خودمان", url: "https://vakilahmadmousavi.ir/", content: "نباید نمایش داده شود", score: 0.9 }
          ]
        })
      };
    }
  });

  const result = await client.search({ query: "وکیل اهواز", location: "خوزستان", domains: ["iranvakil.org"] });
  assert.equal(requestBody.search_depth, "basic");
  assert.equal(requestBody.include_answer, false);
  assert.equal(requestBody.include_raw_content, false);
  assert.equal(requestBody.max_results, 8);
  assert.deepEqual(result.results.map((item) => item.domain), ["iranvakil.org"]);
  assert.equal(result.mode, "public_serp_observation");
  assert.equal(result.usageCredits, 1);
});

test("does not make requests without a configured key", () => {
  assert.throws(() => createMavisCompetitorSearch({ apiKey: "" }));
});

test("returns a validation result for an invalid search request", async () => {
  const client = createMavisCompetitorSearch({ apiKey: "test-key", fetchImpl: async () => { throw new Error("must not call"); } });
  const result = await client.search({ query: "" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_input");
});
