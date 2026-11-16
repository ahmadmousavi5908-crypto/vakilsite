import test from "node:test";
import assert from "node:assert/strict";
import { buildMavisEditorialAiRequest, generateMavisEditorialSuggestions, normalizeMavisEditorialAiInput } from "../../src/lib/mavis/editorial-ai.mjs";

const source = {
  id: "source-1", title: "قانون نمونه", canonical_url: "https://qavanin.ir/example",
  source_type: "official_law", metadata: { abstract: "خلاصه کوتاه" }
};
const output = {
  title: "راهنمای مسئولیت مدنی", slug: "civil-liability-guide", category: "حقوق مدنی",
  excerpt: "مروری بر مسئولیت مدنی در حقوق ایران.", intro: "پیش‌نویس آموزشی نیازمند بررسی منبع رسمی.",
  warning: "اعتبار مقررات باید بررسی شود.", checklist: ["بررسی متن رسمی"],
  sections: [{ heading: "مبانی", body: "شرح مبانی." }, { heading: "شرایط", body: "شرح شرایط." }],
  seoTitle: "مسئولیت مدنی در حقوق ایران", seoDescription: "مبانی مسئولیت مدنی را بخوانید.",
  focusKeyword: "مسئولیت مدنی", relatedKeywords: ["جبران خسارت"],
  evidenceGaps: ["متن کامل قانون باید بررسی شود."],
  sourceCitations: [
    { sourceId: "source-1", citationLabel: "قانون نمونه", usedFor: "مبنای بررسی" },
    { sourceId: "fake-id", citationLabel: "ساختگی", usedFor: "نباید پذیرفته شود" }
  ]
};

test("builds a private structured Responses API request", () => {
  const request = buildMavisEditorialAiRequest({ topic: "مسئولیت مدنی", sources: [source] });
  assert.equal(request.store, false);
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.match(request.instructions, /Never invent statutes/);
});

test("filters insecure source URLs", () => {
  const normalized = normalizeMavisEditorialAiInput({
    topic: "مسئولیت مدنی",
    sources: [{ ...source, canonical_url: "http://qavanin.ir/example" }]
  });
  assert.equal(normalized.sources.length, 0);
});

test("does not call the provider without an API key", async () => {
  let called = false;
  const result = await generateMavisEditorialSuggestions({ topic: "مسئولیت مدنی" }, {
    apiKey: "", fetchImpl: async () => { called = true; }
  });
  assert.equal(result.code, "MAVIS_AI_NOT_CONFIGURED");
  assert.equal(called, false);
});

test("validates structured output and filters unknown source IDs", async () => {
  const result = await generateMavisEditorialSuggestions({ topic: "مسئولیت مدنی", sources: [source] }, {
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.method, "POST");
      assert.equal(options.redirect, "error");
      assert.equal(options.cache, "no-store");
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(JSON.parse(options.body).store, false);
      return { ok: true, status: 200, json: async () => ({
        status: "completed",
        output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }]
      }) };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.suggestions.sourceCitations.length, 1);
  assert.equal(result.suggestions.slug, "civil-liability-guide");
});

test("handles provider refusal safely", async () => {
  const result = await generateMavisEditorialSuggestions({ topic: "مسئولیت مدنی" }, {
    apiKey: "test-key",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }]
    }) })
  });
  assert.equal(result.code, "MAVIS_AI_REFUSED");
});


test("bounds AI requests with a timeout and maps it safely", async () => {
  const result = await generateMavisEditorialSuggestions({ topic: "مسئولیت مدنی" }, {
    apiKey: "test-key",
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MAVIS_AI_TIMEOUT");
});

test("rejects oversized provider responses before parsing", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(512 * 1024 + 1));
      controller.close();
    }
  });
  const result = await generateMavisEditorialSuggestions({ topic: "مسئولیت مدنی" }, {
    apiKey: "test-key",
    fetchImpl: async () => ({ ok: true, status: 200, body })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MAVIS_AI_RESPONSE_TOO_LARGE");
});

test("maps transport failures separately from invalid JSON", async () => {
  const result = await generateMavisEditorialSuggestions({ topic: "مسئولیت مدنی" }, {
    apiKey: "test-key",
    fetchImpl: async () => { throw new Error("network unavailable"); }
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "MAVIS_AI_NETWORK_ERROR");
});


test("uses Cloudflare Workers AI without requiring an OpenAI API key", async () => {
  let providerCalled = false;
  const result = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی", sources: [source] },
    {
      apiKey: "",
      ai: {
        run: async (model, request) => {
          providerCalled = true;
          assert.equal(model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
          assert.equal(request.messages[0].role, "system");
          assert.match(request.messages[0].content, /Never invent statutes/);
          assert.equal(request.messages[1].role, "user");
          assert.equal(request.response_format.type, "json_schema");
          assert.equal(request.response_format.json_schema.type, "object");
          assert.equal(request.max_tokens, 2600);
          return { response: output, usage: { prompt_tokens: 20 } };
        }
      },
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      fetchImpl: async () => {
        throw new Error("OpenAI fallback must not be called when Workers AI is bound");
      }
    }
  );

  assert.equal(providerCalled, true);
  assert.equal(result.ok, true);
  assert.equal(result.provider, "cloudflare_workers_ai");
  assert.equal(result.model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.equal(result.suggestions.sourceCitations.length, 1);
});

test("rejects malformed Workers AI output", async () => {
  const result = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی" },
    { ai: { run: async () => ({ response: "not-json" }) }, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "MAVIS_AI_INVALID_OUTPUT");
});

test("maps Workers AI provider failures without leaking upstream details", async () => {
  const result = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی" },
    { ai: { run: async () => { throw new Error("private upstream diagnostic"); } }, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "MAVIS_AI_PROVIDER_ERROR");
  assert.equal(JSON.stringify(result).includes("private upstream diagnostic"), false);
});


test("accepts string-encoded JSON from Workers AI compatibility responses", async () => {
  const result = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی", sources: [source] },
    {
      ai: { run: async () => ({ response: JSON.stringify(output) }) },
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    }
  );
  assert.equal(result.ok, true);
  assert.equal(result.provider, "cloudflare_workers_ai");
});


test("transliterates Persian model slugs into safe ASCII slugs", async () => {
  const result = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی", title: "مسئولیت مدنی" },
    {
      ai: { run: async () => ({ response: { ...output, slug: "مسئولیت-مدنی" } }) },
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    }
  );
  assert.equal(result.ok, true);
  assert.match(result.suggestions.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("returns safe validation reasons for malformed structured output", async () => {
  const invalid = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی" },
    { ai: { run: async () => ({ response: "not-json" }) }, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }
  );
  const insufficient = await generateMavisEditorialSuggestions(
    { topic: "مسئولیت مدنی" },
    { ai: { run: async () => ({ response: { ...output, sections: [] } }) }, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }
  );
  assert.equal(invalid.reason, "invalid_json");
  assert.equal(insufficient.reason, "insufficient_sections");
});
