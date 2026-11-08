import test from "node:test";
import assert from "node:assert/strict";
import { validatePublicIntake } from "../../src/lib/mavis/public-intake-validation.mjs";

const valid = {
  fullName: "علی رضایی",
  phone: "09123456789",
  caseType: "civil",
  summary: "برای مطالبه وجه قرارداد و پیگیری تعهدات قراردادی نیازمند بررسی اولیه هستم.",
  urgency: "soon",
  consent: true,
};

test("accepts a minimal valid intake and keeps optional consents independent", () => {
  const result = validatePublicIntake(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.marketingConsent, false);
  assert.equal(result.value.thirdPartyConsent, false);
  assert.equal(result.value.consentPurpose, "initial_intake_review");
});

test("rejects missing consent, malformed phone and undersized narrative", () => {
  const result = validatePublicIntake({ ...valid, consent: false, phone: "123", summary: "کوتاه" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.consent);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.summary);
});

test("does not accept unknown case categories or urgency values", () => {
  const result = validatePublicIntake({ ...valid, caseType: "immigration", urgency: "immediate" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.caseType);
  assert.ok(result.errors.urgency);
});

test("normalizes whitespace, strips control characters and bounds user text", () => {
  const result = validatePublicIntake({ ...valid, fullName: "  علی\nرضایی  ", opposingParty: "  طرف\u0000 مقابل  " });
  assert.equal(result.ok, true);
  assert.equal(result.value.fullName, "علی رضایی");
  assert.equal(result.value.opposingParty, "طرف مقابل");
});

test("rejects arrays and null input", () => {
  assert.equal(validatePublicIntake(null).ok, false);
  assert.equal(validatePublicIntake([]).ok, false);
});

test("accepts Persian and Arabic numerals in Iranian mobile numbers", () => {
  assert.equal(validatePublicIntake({ ...valid, phone: "۰۹۱۲۳۴۵۶۷۸۹" }).ok, true);
  assert.equal(validatePublicIntake({ ...valid, phone: "٠٩١٢٣٤٥٦٧٨٩" }).ok, true);
});
