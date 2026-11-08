import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAdminIntakeRateLimit,
  parseKnowledgeSearchRateLimit,
} from "../../src/lib/mavis/rate-limit.mjs";

test("parses an allowed admin intake rate-limit response", () => {
  assert.deepEqual(
    parseAdminIntakeRateLimit({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null }),
    { status: "allowed" },
  );
});

test("parses a limited admin intake response with a bounded retry delay", () => {
  assert.deepEqual(
    parseAdminIntakeRateLimit({ data: { allowed: false, retry_after_seconds: 17 }, error: null }),
    { status: "limited", retryAfterSeconds: 17 },
  );
});

test("fails closed for malformed or unavailable admin intake limits", () => {
  for (const result of [
    null,
    { error: new Error("database unavailable") },
    { data: [], error: null },
    { data: [{ allowed: "true", retry_after_seconds: 0 }], error: null },
    { data: [{ allowed: false, retry_after_seconds: 61 }], error: null },
    { data: [{ allowed: false, retry_after_seconds: -1 }], error: null },
  ]) {
    assert.deepEqual(parseAdminIntakeRateLimit(result), { status: "unavailable" });
  }
});

test("knowledge-search and intake quotas share parsing without sharing counters", () => {
  const response = { data: [{ allowed: false, retry_after_seconds: 8 }], error: null };
  assert.deepEqual(parseKnowledgeSearchRateLimit(response), { status: "limited", retryAfterSeconds: 8 });
  assert.deepEqual(parseAdminIntakeRateLimit(response), { status: "limited", retryAfterSeconds: 8 });
});
