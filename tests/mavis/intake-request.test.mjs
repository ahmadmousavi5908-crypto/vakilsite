import test from "node:test";
import assert from "node:assert/strict";
import {
  createIntakeRateLimitHash,
  createIntakeIdempotencyFingerprint,
  isValidIntakeIdempotencyKey,
  getTrustedClientIp,
  hasOnlyAllowedIntakeFields,
  parseIntakeRateLimit,
  parseIntakeRetentionDays,
} from "../../src/lib/mavis/intake-request.mjs";


test("validates random idempotency keys and fingerprints canonical validated intake data", () => {
  const key = "550e8400-e29b-41d4-a716-446655440000";
  const value = {
    fullName: "علی رضایی",
    phone: "+989123456789",
    caseType: "civil",
    summary: "شرح کافی برای بررسی اولیه و ثبت درخواست حقوقی.",
    urgency: "soon",
    opposingParty: null,
    consentPurpose: "initial_intake_review",
    marketingConsent: false,
    thirdPartyDataNoticeAcknowledged: false,
  };
  const context = {
    reviewPriority: "standard_human_review",
    detectedSignals: ["time_sensitive"],
    requiresDeadlineCheck: true,
    consentVersion: "mavis-intake-v1-30d",
    retentionDays: 30,
  };
  const secret = "a".repeat(40);
  const first = createIntakeIdempotencyFingerprint(value, secret, context);
  const reorderedSignals = createIntakeIdempotencyFingerprint(value, secret, {
    ...context,
    detectedSignals: ["time_sensitive"],
  });

  assert.equal(isValidIntakeIdempotencyKey(key), true);
  assert.equal(isValidIntakeIdempotencyKey("not-a-uuid"), false);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, reorderedSignals);
  assert.notEqual(first, createIntakeIdempotencyFingerprint({ ...value, summary: "شرح متفاوت برای همان شناسه." }, secret, context));
  assert.notEqual(first, createIntakeIdempotencyFingerprint(value, "b".repeat(40), context));
  assert.equal(createIntakeIdempotencyFingerprint(value, "short", context), null);
  assert.equal(createIntakeIdempotencyFingerprint(value, secret, { ...context, retentionDays: 0 }), null);
});

test("trusts only a proxy-supplied x-real-ip when proxy trust is explicitly enabled", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.20" });
  assert.equal(getTrustedClientIp(headers, true), "203.0.113.10");
  assert.equal(getTrustedClientIp(headers, false), null);
  assert.equal(getTrustedClientIp(new Headers({ "x-real-ip": "spoofed" }), true), null);
  assert.equal(getTrustedClientIp(new Headers(), true), null);
});

test("creates a keyed one-way rate-limit bucket without returning the raw IP", () => {
  const ip = "203.0.113.10";
  const first = createIntakeRateLimitHash(ip, "a".repeat(40));
  const same = createIntakeRateLimitHash(ip, "a".repeat(40));
  const rotated = createIntakeRateLimitHash(ip, "b".repeat(40));

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, same);
  assert.notEqual(first, rotated);
  assert.notEqual(first, ip);
  assert.equal(createIntakeRateLimitHash(ip, "short"), null);
  assert.equal(createIntakeRateLimitHash("not-an-ip", "a".repeat(40)), null);
});

test("parses only one well-formed database rate-limit decision", () => {
  assert.deepEqual(parseIntakeRateLimit({ data: [{ allowed: true, retry_after_seconds: 0 }] }), { status: "allowed" });
  assert.deepEqual(parseIntakeRateLimit({ data: [{ allowed: false, retry_after_seconds: 120 }] }), { status: "limited", retryAfterSeconds: 120 });
  assert.deepEqual(parseIntakeRateLimit({ data: [], error: null }), { status: "unavailable" });
  assert.deepEqual(parseIntakeRateLimit({ data: [{ allowed: false, retry_after_seconds: 0 }] }), { status: "unavailable" });
  assert.deepEqual(parseIntakeRateLimit({ data: [{ allowed: "true", retry_after_seconds: 0 }] }), { status: "unavailable" });
  assert.deepEqual(parseIntakeRateLimit({ error: new Error("database down") }), { status: "unavailable" });
});

test("requires an explicit bounded retention period", () => {
  assert.equal(parseIntakeRetentionDays("30"), 30);
  assert.equal(parseIntakeRetentionDays("1"), 1);
  assert.equal(parseIntakeRetentionDays("3650"), 3650);
  assert.equal(parseIntakeRetentionDays("0"), null);
  assert.equal(parseIntakeRetentionDays("3651"), null);
  assert.equal(parseIntakeRetentionDays("30.5"), null);
  assert.equal(parseIntakeRetentionDays(undefined), null);
});

test("rejects unknown fields and non-object intake payloads", () => {
  const valid = {
    fullName: "علی رضایی",
    phone: "09123456789",
    caseType: "civil",
    summary: "شرح اولیه کافی برای بررسی موضوع حقوقی و ثبت درخواست.",
    urgency: "soon",
    consent: true,
  };
  assert.equal(hasOnlyAllowedIntakeFields(valid), true);
  assert.equal(hasOnlyAllowedIntakeFields({ ...valid, nationalId: "123" }), false);
  assert.equal(hasOnlyAllowedIntakeFields(null), false);
  assert.equal(hasOnlyAllowedIntakeFields([]), false);
});
