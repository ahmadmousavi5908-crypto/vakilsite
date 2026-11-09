import test from "node:test";
import assert from "node:assert/strict";
import { MavisError, toPublicError } from "../../src/lib/mavis/errors.mjs";
import {
  normalizeTrustedConversationHistory,
  parsePublicChatInput,
} from "../../src/lib/mavis/contracts.mjs";
import { mockProvider } from "../../src/lib/mavis/mock-provider.mjs";
import { runPublicChat } from "../../src/lib/mavis/public-chat.mjs";

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

test("runs the mock provider only when explicitly enabled and does not echo user content", async () => {
  const result = await runPublicChat({
    input: { message: "متن محرمانه که نباید بازتاب داده شود" },
    provider: mockProvider,
    env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" },
  });
  assert.equal(result.message.role, "assistant");
  assert.match(result.message.content, /حالت آزمایشی/);
  assert.equal(result.provider, "mock");
  assert.doesNotMatch(result.message.content, /متن محرمانه/);
});

test("rejects provider selection mismatches and unsupported providers", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "پرسش" },
      provider: mockProvider,
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "openai" },
    }),
    (error) => error.code === "PROVIDER_MISMATCH",
  );
  await assert.rejects(
    () => runPublicChat({
      input: { message: "پرسش" },
      provider: mockProvider,
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "bad provider" },
    }),
    (error) => error.code === "SERVICE_UNAVAILABLE",
  );
});

test("does not expose raw provider failures", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "پرسش" },
      provider: { name: "mock", generate: async () => { throw new Error("secret token detail"); } },
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" },
    }),
    (error) => error.code === "PROVIDER_ERROR" &&
      error.message === "دستیار موقتاً قادر به پاسخ‌گویی نیست." &&
      !error.message.includes("secret token"),
  );
});

test("rejects invalid or oversized provider output and hides usage metadata", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "پرسش" },
      provider: { name: "mock", generate: async () => ({ text: "x".repeat(8001) }) },
      env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" },
    }),
    (error) => error.code === "PROVIDER_ERROR" && error.status === 502,
  );

  const result = await runPublicChat({
    input: { message: "پرسش" },
    provider: { name: "mock", generate: async () => ({ text: "پاسخ آزمایشی", usage: { secret: "internal" } }) },
    env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" },
  });
  assert.equal(result.message.content, "پاسخ آزمایشی");
  assert.equal(Object.hasOwn(result, "usage"), false);
});

test("does not expose internal errors in public error payloads", () => {
  const result = toPublicError(new Error("secret stack detail"), "req_test");
  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, "INTERNAL_ERROR");
  assert.doesNotMatch(result.body.error.message, /secret/);
  assert.equal(result.body.error.requestId, "req_test");
});

test("routes urgent legal signals to human escalation without calling the provider", async () => {
  let providerCalled = false;
  const result = await runPublicChat({
    input: { message: "امروز ابلاغیه تجدیدنظر دریافت کردم و مهلت اعتراض نزدیک است." },
    provider: {
      name: "mock",
      generate: async () => {
        providerCalled = true;
        return { text: "نباید اجرا شود" };
      },
    },
    env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" },
  });

  assert.equal(result.status, "escalate");
  assert.equal(result.reasonCode, "URGENT_HUMAN_REVIEW");
  assert.equal(result.provider, "policy");
  assert.equal(result.deadlineCalculated, false);
  assert.equal(providerCalled, false);
  assert.match(result.message.content, /مهلت قانونی را محاسبه نمی‌کند/);
});

test("routes priority property matters to human review without generating legal advice", async () => {
  let providerCalled = false;
  const result = await runPublicChat({
    input: { message: "برای تخلیه ملک به راهنمایی نیاز دارم." },
    provider: {
      name: "mock",
      generate: async () => {
        providerCalled = true;
        return { text: "نباید اجرا شود" };
      },
    },
    env: { MAVIS_PUBLIC_ENABLED: "true", MAVIS_PROVIDER: "mock" },
  });

  assert.equal(result.status, "needs_human_review");
  assert.equal(result.reasonCode, "PRIORITY_HUMAN_REVIEW");
  assert.equal(result.deadlineCalculated, false);
  assert.equal(providerCalled, false);
});
