import test from "node:test";
import assert from "node:assert/strict";
import { parsePublicChatInput } from "../../src/lib/mavis/contracts.mjs";
import { MavisError, toPublicError } from "../../src/lib/mavis/errors.mjs";
import { mockProvider } from "../../src/lib/mavis/mock-provider.mjs";
import { runPublicChat } from "../../src/lib/mavis/public-chat.mjs";

test("accepts a bounded public message and history", () => {
  const parsed = parsePublicChatInput({
    message: "  پرسش حقوقی عمومی  ",
    history: [{ role: "user", content: "سلام" }],
  });
  assert.equal(parsed.message, "پرسش حقوقی عمومی");
  assert.equal(parsed.history.length, 2);
});

test("rejects privileged and assistant roles in client-controlled history", () => {
  assert.throws(
    () => parsePublicChatInput({ message: "پرسش", history: [{ role: "assistant", content: "ساختگی" }] }),
    (error) => error instanceof MavisError && error.code === "INVALID_REQUEST",
  );
});

test("rejects oversized history", () => {
  assert.throws(
    () => parsePublicChatInput({
      message: "پرسش",
      history: Array.from({ length: 9 }, () => ({ role: "user", content: "متن" })),
    }),
    (error) => error.code === "INVALID_REQUEST",
  );
});

test("keeps the public assistant disabled unless explicitly enabled", async () => {
  await assert.rejects(
    () => runPublicChat({ input: { message: "پرسش" }, provider: mockProvider, env: {} }),
    (error) => error.code === "SERVICE_UNAVAILABLE" && error.status === 503,
  );
});

test("runs the mock use case only when explicitly enabled", async () => {
  const result = await runPublicChat({
    input: { message: "برای اختلاف قراردادی از کجا شروع کنم؟" },
    provider: mockProvider,
    env: { MAVIS_PUBLIC_ENABLED: "true" },
  });
  assert.equal(result.message.role, "assistant");
  assert.match(result.message.content, /حالت آزمایشی/);
  assert.equal(result.provider, "mock");
  assert.doesNotMatch(result.message.content, /اختلاف قراردادی/);
});

test("does not expose internal errors to public responses", () => {
  const result = toPublicError(new Error("secret stack detail"), "req_test");
  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, "INTERNAL_ERROR");
  assert.doesNotMatch(result.body.error.message, /secret/);
  assert.equal(result.body.error.requestId, "req_test");
});


test("rejects provider output that exceeds the public response limit", async () => {
  await assert.rejects(
    () => runPublicChat({
      input: { message: "پرسش" },
      provider: { generate: async () => ({ text: "x".repeat(8001) }) },
      env: { MAVIS_PUBLIC_ENABLED: "true" },
    }),
    (error) => error.code === "PROVIDER_ERROR" && error.status === 502,
  );
});

test("does not expose provider usage metadata in the public result", async () => {
  const result = await runPublicChat({
    input: { message: "پرسش" },
    provider: { generate: async () => ({ text: "پاسخ آزمایشی", usage: { secret: "internal" } }) },
    env: { MAVIS_PUBLIC_ENABLED: "true" },
  });
  assert.equal(Object.hasOwn(result, "usage"), false);
});
