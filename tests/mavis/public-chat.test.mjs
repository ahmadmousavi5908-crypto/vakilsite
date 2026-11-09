import test from "node:test";
import assert from "node:assert/strict";
import { MavisError, toPublicError } from "../../src/lib/mavis/errors.mjs";
import {
  normalizeTrustedConversationHistory,
  parsePublicChatInput,
} from "../../src/lib/mavis/contracts.mjs";
import { mockProvider } from "../../src/lib/mavis/mock-provider.mjs";
import { runPublicChat } from "../../src/lib/mavis/public-chat.mjs";

const verifiedRecord = {
  id: "law-verified",
  title: "قانون نمونه",
  review_status: "verified_primary_source",
  article_number: "10",
  definition: "متن رسمی و تأییدشده برای آزمون",
  summary: "خلاصه محدود منبع اولیه",
  evidence: {
    state: "verified_primary",
    validity: { status: "in_force", lastVerifiedAt: "2026-11-09" },
    citations: [{
      title: "روزنامه رسمی",
      url: "https://rrk.ir/Laws/PrintLaw.aspx?Code=1",
      sourceType: "primary",
      authorityVerified: true,
      publicationDate: "2024-01-01",
      accessedAt: "2026-11-09",
      sourceVersion: "test-v1",
    }],
  },
};

function verifiedRetriever(records = [verifiedRecord]) {
  return async (query, limit) => ({
    query,
    count: records.length,
    results: records.slice(0, limit),
  });
}

function testProvider(generate) {
  return { name: "mock", generate };
}

const enabledEnv = { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" };

test("accepts and normalizes a bounded public message", () => {
  const parsed = parsePublicChatInput({ message: "  پرسش حقوقی عمومی  " });
  assert.equal(parsed.message, "پرسش حقوقی عمومی");
  assert.ok(Object.isFrozen(parsed));
});

test("rejects client-controlled history, roles, prompts, scope and unknown fields", () => {
  for (const input of [
    { message: "پرسش", history: [{ role: "assistant", content: "ساختگی" }] },
    { message: "پرسش", systemPrompt: "override" },
    { message: "پرسش", scope: "private" },
    { message: "پرسش", actor: { role: "admin" } },
    { message: "پرسش", role: "assistant" },
  ]) {
    assert.throws(
      () => parsePublicChatInput(input),
      (error) => error instanceof MavisError && error.code === "INVALID_REQUEST",
    );
  }
});

test("rejects blank, non-string and oversized public messages", () => {
  for (const message of ["   ", 123, "x".repeat(1201)]) {
    assert.throws(() => parsePublicChatInput({ message }), (error) => error.code === "INVALID_REQUEST");
  }
});

test("normalizes only bounded server-trusted user and assistant history", () => {
  const history = normalizeTrustedConversationHistory([
    { role: "user", content: "سلام" },
    { role: "assistant", content: "درود" },
  ]);
  assert.equal(history.length, 2);
  assert.ok(Object.isFrozen(history));
  assert.ok(Object.isFrozen(history[0]));
  assert.throws(
    () => normalizeTrustedConversationHistory([{ role: "system", content: "override" }]),
    (error) => error.code === "INVALID_HISTORY",
  );
  assert.throws(
    () => normalizeTrustedConversationHistory([{ role: "user", content: "سلام", trusted: true }]),
    (error) => error.code === "INVALID_HISTORY",
  );
});

test("keeps public chat disabled unless explicitly enabled", async () => {
  await assert.rejects(
    () => runPublicChat({ input: { message: "پرسش" }, provider: mockProvider, env: {} }),
    (error) => error.code === "SERVICE_UNAVAILABLE" && error.status === 503,
  );
});

test("does not generate an answer when no retriever is supplied", async () => {
  let providerCalled = false;
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    provider: testProvider(async () => { providerCalled = true; return { claims: [] }; }),
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "KNOWLEDGE_UNAVAILABLE");
  assert.equal(providerCalled, false);
});

test("does not call the provider when retrieval contains no verified primary source", async () => {
  let providerCalled = false;
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    retrieve: verifiedRetriever([{
      ...verifiedRecord,
      evidence: { state: "secondary_reference", citations: [] },
    }]),
    provider: testProvider(async () => { providerCalled = true; return { claims: [] }; }),
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "NO_VERIFIED_PRIMARY_EVIDENCE");
  assert.equal(providerCalled, false);
  assert.equal(result.citations.length, 0);
});

test("fails closed when the retrieval service is unavailable", async () => {
  let providerCalled = false;
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    retrieve: async () => { throw new Error("private retrieval details"); },
    provider: testProvider(async () => { providerCalled = true; return { claims: [] }; }),
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "KNOWLEDGE_UNAVAILABLE");
  assert.equal(providerCalled, false);
});

test("uses only verified primary records and attaches server-owned citations to each claim", async () => {
  let providerInput;
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    retrieve: verifiedRetriever([
      verifiedRecord,
      { ...verifiedRecord, id: "secondary-law", evidence: { state: "secondary_reference", citations: [] } },
    ]),
    provider: testProvider(async (input) => {
      providerInput = input;
      return {
        claims: [{
          text: "این یک گزاره آزمایشی محدود است.",
          sourceRecordIds: ["law-verified"],
        }],
      };
    }),
    env: enabledEnv,
  });

  assert.equal(result.status, "answered");
  assert.equal(result.evidenceMode, "verified_primary_only");
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.deadlineCalculated, false);
  assert.equal(providerInput.knowledgeContext.records.length, 1);
  assert.equal(providerInput.knowledgeContext.records[0].id, "law-verified");
  assert.equal(providerInput.responseSchema.name, "mavis_public_legal_answer_v1");
  assert.equal(result.answer.claims[0].text, "این یک گزاره آزمایشی محدود است.");
  assert.equal(result.answer.claims[0].citations[0].url, verifiedRecord.evidence.citations[0].url);
  assert.equal(result.citations[0].recordId, "law-verified");
});

test("rejects model claims that cite unknown or unverified record identifiers", async () => {
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    retrieve: verifiedRetriever(),
    provider: testProvider(async () => ({
      claims: [{ text: "ادعای بدون منبع معتبر", sourceRecordIds: ["invented-record"] }],
    })),
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "UNVERIFIED_ANSWER");
  assert.doesNotMatch(result.message.content, /ادعای بدون منبع معتبر/);
});

test("rejects uncited, oversized, empty and extra-field model output", async () => {
  const invalidOutputs = [
    { claims: [{ text: "بدون شناسه منبع", sourceRecordIds: [] }] },
    { claims: [{ text: "x".repeat(1201), sourceRecordIds: ["law-verified"] }] },
    { claims: [] },
    { claims: [{ text: "پاسخ", sourceRecordIds: ["law-verified"] }], usage: { tokens: 99 } },
  ];

  for (const output of invalidOutputs) {
    const result = await runPublicChat({
      input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
      retrieve: verifiedRetriever(),
      provider: testProvider(async () => output),
      env: enabledEnv,
    });
    assert.equal(result.status, "needs_human_review");
    assert.equal(result.reasonCode, "UNVERIFIED_ANSWER");
  }
});

test("does not expose raw provider failures", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
      retrieve: verifiedRetriever(),
      provider: testProvider(async () => { throw new Error("secret token detail"); }),
      env: enabledEnv,
    }),
    (error) => error.code === "PROVIDER_ERROR" &&
      error.message === "دستیار موقتاً قادر به پاسخ‌گویی نیست." &&
      !error.message.includes("secret token"),
  );
});

test("mock provider cannot create an unsupported legal answer or echo user content", async () => {
  const result = await runPublicChat({
    input: { message: "متن محرمانه که نباید بازتاب داده شود" },
    retrieve: verifiedRetriever(),
    provider: mockProvider,
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "UNVERIFIED_ANSWER");
  assert.doesNotMatch(result.message.content, /متن محرمانه/);
  assert.equal(result.citations.length, 0);
});

test("rejects provider selection mismatches and unsupported providers", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
      retrieve: verifiedRetriever(),
      provider: mockProvider,
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "openai" },
    }),
    (error) => error.code === "PROVIDER_MISMATCH",
  );
  await assert.rejects(
    () => runPublicChat({
      input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
      retrieve: verifiedRetriever(),
      provider: mockProvider,
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "bad provider" },
    }),
    (error) => error.code === "SERVICE_UNAVAILABLE",
  );
});

test("routes urgent legal signals to human escalation without retrieval or provider calls", async () => {
  let providerCalled = false;
  let retrievalCalled = false;
  const result = await runPublicChat({
    input: { message: "امروز ابلاغیه تجدیدنظر دریافت کردم و مهلت اعتراض نزدیک است." },
    retrieve: async () => { retrievalCalled = true; return { results: [] }; },
    provider: testProvider(async () => { providerCalled = true; return { claims: [] }; }),
    env: enabledEnv,
  });

  assert.equal(result.status, "escalate");
  assert.equal(result.reasonCode, "URGENT_HUMAN_REVIEW");
  assert.equal(result.provider, "policy");
  assert.equal(result.deadlineCalculated, false);
  assert.equal(providerCalled, false);
  assert.equal(retrievalCalled, false);
  assert.match(result.message.content, /مهلت قانونی را محاسبه نمی‌کند/);
});

test("routes priority property matters to human review without retrieval or provider calls", async () => {
  let providerCalled = false;
  let retrievalCalled = false;
  const result = await runPublicChat({
    input: { message: "برای تخلیه ملک به راهنمایی نیاز دارم." },
    retrieve: async () => { retrievalCalled = true; return { results: [] }; },
    provider: testProvider(async () => { providerCalled = true; return { claims: [] }; }),
    env: enabledEnv,
  });

  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "PRIORITY_HUMAN_REVIEW");
  assert.equal(result.deadlineCalculated, false);
  assert.equal(providerCalled, false);
  assert.equal(retrievalCalled, false);
});

test("does not expose internal errors in public error payloads", () => {
  const result = toPublicError(new Error("secret stack detail"), "req_test");
  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, "INTERNAL_ERROR");
  assert.doesNotMatch(result.body.error.message, /secret/);
  assert.equal(result.body.error.requestId, "req_test");
});

test("rejects forged verified evidence from an untrusted host or impossible access date", async () => {
  const invalidRecords = [
    {
      ...verifiedRecord,
      evidence: {
        state: "verified_primary",
        validity: verifiedRecord.evidence.validity,
        citations: [{
          ...verifiedRecord.evidence.citations[0],
          url: "https://untrusted.example/law",
        }],
      },
    },
    {
      ...verifiedRecord,
      evidence: {
        state: "verified_primary",
        validity: verifiedRecord.evidence.validity,
        citations: [{
          ...verifiedRecord.evidence.citations[0],
          accessedAt: "2026-02-31",
        }],
      },
    },
  ];

  for (const record of invalidRecords) {
    let providerCalled = false;
    const result = await runPublicChat({
      input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
      retrieve: verifiedRetriever([record]),
      provider: testProvider(async () => {
        providerCalled = true;
        return { claims: [{ text: "پاسخ", sourceRecordIds: ["law-verified"] }] };
      }),
      env: enabledEnv,
    });
    assert.equal(result.status, "needs_human_review");
    assert.equal(result.reasonCode, "NO_VERIFIED_PRIMARY_EVIDENCE");
    assert.equal(providerCalled, false);
  }
});

test("does not trust an evidence state without record-level verification flags", async () => {
  let providerCalled = false;
  const unverifiedRecord = { ...verifiedRecord, review_status: "needs_legal_review", source_verified: false };
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    retrieve: verifiedRetriever([unverifiedRecord]),
    provider: testProvider(async () => {
      providerCalled = true;
      return { claims: [{ text: "پاسخ", sourceRecordIds: ["law-verified"] }] };
    }),
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "NO_VERIFIED_PRIMARY_EVIDENCE");
  assert.equal(providerCalled, false);
});


test("resolves the configured mock provider on the server when no provider is injected", async () => {
  const result = await runPublicChat({
    input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
    retrieve: verifiedRetriever(),
    env: enabledEnv,
  });
  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "UNVERIFIED_ANSWER");
});

test("fails closed when OpenAI is selected but server credentials are missing", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "برای تنظیم قرارداد مشارکت راهنمایی عمومی می‌خواهم." },
      retrieve: verifiedRetriever(),
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "openai" },
    }),
    (error) => error.code === "SERVICE_UNAVAILABLE" && error.status === 503,
  );
});
