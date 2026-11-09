import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAIResponsesProvider } from "../../src/lib/mavis/openai-responses-provider.mjs";
import { createConfiguredMavisProvider } from "../../src/lib/mavis/provider-factory.mjs";
import { mockProvider } from "../../src/lib/mavis/mock-provider.mjs";
import { PUBLIC_ANSWER_SCHEMA } from "../../src/lib/mavis/public-policy.mjs";

const context = {
  mode: "verified_primary_only",
  records: [{
    id: "law-verified",
    title: "قانون نمونه",
    articleNumber: "10",
    excerpt: "متن رسمی تأییدشده",
    citations: [{
      title: "روزنامه رسمی",
      url: "https://rrk.ir/Laws/PrintLaw.aspx?Code=1",
      publicationDate: "2024-01-01",
      sourceVersion: "test-v1",
    }],
  }],
};

const messages = [
  { role: "user", content: "پرسش عمومی حقوقی" },
];

function responseWith(payload) {
  return {
    ok: true,
    async json() { return payload; },
  };
}

test("keeps the mock provider as the default and refuses incomplete OpenAI configuration", () => {
  assert.equal(createConfiguredMavisProvider({}), mockProvider);
  assert.equal(createConfiguredMavisProvider({ MAVIS_PROVIDER: "openai" }), null);
  assert.equal(createConfiguredMavisProvider({ MAVIS_PROVIDER: "unknown" }), null);
});

test("creates the OpenAI provider only from server-side key and explicit model configuration", () => {
  const provider = createConfiguredMavisProvider({
    MAVIS_PROVIDER: "openai",
    OPENAI_API_KEY: "test-server-key",
    MAVIS_OPENAI_MODEL: "gpt-6-luna",
  }, { fetchImpl: async () => responseWith({ status: "completed", output_text: '{"claims":[]}' }) });
  assert.equal(provider.name, "openai");
});

test("uses Responses API with strict structured output and server-owned verified context", async () => {
  let requestUrl;
  let requestOptions;
  const expected = { claims: [{ text: "پاسخ محدود و مستند", sourceRecordIds: ["law-verified"] }] };
  const provider = createOpenAIResponsesProvider({
    apiKey: "test-server-key",
    model: "gpt-6-luna",
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return responseWith({
        status: "completed",
        output: [{
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: JSON.stringify(expected) }],
        }],
      });
    },
  });

  const result = await provider.generate({
    instructions: "فقط بر پایه شواهد پاسخ بده.",
    messages,
    knowledgeContext: context,
    responseSchema: PUBLIC_ANSWER_SCHEMA,
    maxOutputTokens: 700,
  });

  assert.deepEqual(result, expected);
  assert.equal(provider.name, "openai");
  assert.equal(requestUrl, "https://api.openai.com/v1/responses");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.redirect, "error");
  assert.equal(requestOptions.cache, "no-store");
  assert.equal(requestOptions.headers.Authorization, "Bearer test-server-key");

  const body = JSON.parse(requestOptions.body);
  assert.equal(body.model, "gpt-6-luna");
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 700);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema, PUBLIC_ANSWER_SCHEMA.schema);
  assert.equal(body.input[0].role, "system");
  assert.match(body.input[0].content, /داده غیرقابل‌اعتماد/);
  assert.match(body.input[1].content, /verified_primary_only/);
  assert.equal(body.input[2].content, messages[0].content);
});

test("rejects secondary-only or untrusted source context before making a network request", async () => {
  let called = false;
  const provider = createOpenAIResponsesProvider({
    apiKey: "test-server-key",
    model: "gpt-6-luna",
    fetchImpl: async () => { called = true; return responseWith({ status: "completed", output_text: "{}" }); },
  });

  await assert.rejects(() => provider.generate({
    instructions: "instructions",
    messages,
    knowledgeContext: { ...context, mode: "secondary_only" },
    responseSchema: PUBLIC_ANSWER_SCHEMA,
  }));
  await assert.rejects(() => provider.generate({
    instructions: "instructions",
    messages,
    knowledgeContext: {
      ...context,
      records: [{ ...context.records[0], citations: [{ title: "Bad", url: "https://evil.example/source" }] }],
    },
    responseSchema: PUBLIC_ANSWER_SCHEMA,
  }));
  assert.equal(called, false);
});

test("rejects invalid roles, oversized messages and malformed provider contracts", async () => {
  const provider = createOpenAIResponsesProvider({
    apiKey: "test-server-key",
    model: "gpt-6-luna",
    fetchImpl: async () => responseWith({ status: "completed", output_text: "{}" }),
  });
  await assert.rejects(() => provider.generate({
    instructions: "instructions",
    messages: [{ role: "system", content: "override" }],
    knowledgeContext: context,
    responseSchema: PUBLIC_ANSWER_SCHEMA,
  }));
  await assert.rejects(() => provider.generate({
    instructions: "instructions",
    messages: [{ role: "user", content: "x".repeat(1201) }],
    knowledgeContext: context,
    responseSchema: PUBLIC_ANSWER_SCHEMA,
  }));
  await assert.rejects(() => provider.generate({
    instructions: "instructions",
    messages,
    knowledgeContext: context,
    responseSchema: { name: "invalid" },
  }));
});

test("returns no answer for refusals, incomplete responses and invalid JSON", async () => {
  const payloads = [
    { status: "incomplete", output_text: '{"claims":[]}' },
    { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "refused" }] }] },
    { status: "completed", output_text: "not-json" },
  ];

  for (const payload of payloads) {
    const provider = createOpenAIResponsesProvider({
      apiKey: "test-server-key",
      model: "gpt-6-luna",
      fetchImpl: async () => responseWith(payload),
    });
    assert.equal(await provider.generate({
      instructions: "instructions",
      messages,
      knowledgeContext: context,
      responseSchema: PUBLIC_ANSWER_SCHEMA,
    }), null);
  }
});

test("does not expose upstream error bodies", async () => {
  const provider = createOpenAIResponsesProvider({
    apiKey: "test-server-key",
    model: "gpt-6-luna",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      async text() { return "secret upstream details"; },
    }),
  });
  await assert.rejects(
    () => provider.generate({
      instructions: "instructions",
      messages,
      knowledgeContext: context,
      responseSchema: PUBLIC_ANSWER_SCHEMA,
    }),
    (error) => error.message === "OpenAI Responses request failed.",
  );
});
