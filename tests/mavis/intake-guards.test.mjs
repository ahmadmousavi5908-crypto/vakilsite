import test from "node:test";
import assert from "node:assert/strict";
import { createIntakeRateKey, isValidIntakeIp, normalizeIntakePhone, validateIntakePayload } from "../../src/lib/mavis/intake-guards.mjs";

const valid = {
  idempotency_key: "11111111-1111-4111-8111-111111111111",
  contact_name: "کاربر آزمایشی",
  contact_phone: "+98 912 123 4567",
  contact_email: null,
  preferred_contact_method: "phone",
  city: "اهواز",
  legal_area: "املاک",
  matter_summary: "درخواست آزمایشی برای بررسی اولیه موضوع حقوقی و هماهنگی تماس.",
  privacy_notice_accepted: true,
  contact_consent: true,
  third_party_consent: false,
  marketing_consent: false,
};

test("normalizes telephone formatting without changing digits", () => {
  assert.equal(normalizeIntakePhone("+98 (912) 123-4567"), "+989121234567");
});

test("accepts valid IPv4 and IPv6 but rejects untrusted text", () => {
  assert.equal(isValidIntakeIp("192.0.2.1"), true);
  assert.equal(isValidIntakeIp("2001:db8::1"), true);
  assert.equal(isValidIntakeIp("forged, 192.0.2.1"), false);
});

test("creates deterministic HMAC keys without exposing the raw phone or IP", () => {
  const first = createIntakeRateKey("a".repeat(40), "+989121234567", "192.0.2.1");
  const second = createIntakeRateKey("a".repeat(40), "+98 912 123 4567", "192.0.2.1");
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, "+989121234567");
});

test("rejects short HMAC secrets and invalid IP inputs", () => {
  assert.throws(() => createIntakeRateKey("short", "09121234567", "192.0.2.1"), TypeError);
  assert.throws(() => createIntakeRateKey("a".repeat(40), "09121234567", "unknown"), TypeError);
});

test("accepts a complete intake request with mandatory and optional consent separation", () => {
  assert.equal(validateIntakePayload(valid), null);
});

test("rejects extra fields to prevent silent collection of unexpected data", () => {
  assert.equal(validateIntakePayload({ ...valid, national_id: "123" }).code, "UNEXPECTED_FIELDS");
});

test("requires privacy acknowledgement and contact consent", () => {
  assert.equal(validateIntakePayload({ ...valid, privacy_notice_accepted: false }).code, "CONSENT_REQUIRED");
  assert.equal(validateIntakePayload({ ...valid, contact_consent: false }).code, "CONSENT_REQUIRED");
});

test("validates contact channel, summary size and optional consent types", () => {
  assert.equal(validateIntakePayload({ ...valid, preferred_contact_method: "email", contact_email: null }).code, "EMAIL_REQUIRED");
  assert.equal(validateIntakePayload({ ...valid, matter_summary: "کوتاه" }).code, "INVALID_SUMMARY");
  assert.equal(validateIntakePayload({ ...valid, marketing_consent: "yes" }).code, "INVALID_OPTIONAL_CONSENT");
});
