import test from "node:test";
import assert from "node:assert/strict";
import {
  getSecureMatterFieldSchema,
  secureMatterFieldSchemas,
  validateSecureMatterFields,
} from "../../src/lib/mavis/secure-matter-fields.mjs";

test("defines a separate optional schema for each supported matter type", () => {
  assert.deepEqual(Object.keys(secureMatterFieldSchemas).sort(),
    ["administrative", "civil", "commercial", "criminal", "family", "labor", "property"]);
  for (const caseType of Object.keys(secureMatterFieldSchemas)) assert.ok(getSecureMatterFieldSchema(caseType));
  assert.equal(getSecureMatterFieldSchema("other"), null);
});

test("accepts allowlisted civil fields and preserves calendar metadata", () => {
  const result = validateSecureMatterFields("civil", {
    documentType: "  قرارداد فروش  ",
    executionDate: { calendar: "jalali", value: "1405-08-18" },
    claimedAmount: "1250000.50",
    currency: "IRR",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    documentType: "قرارداد فروش",
    executionDate: { calendar: "jalali", value: "1405-08-18" },
    claimedAmount: "1250000.50",
    currency: "IRR",
  });
});

test("validates category enums and rejects fields belonging to another matter type", () => {
  const invalidEnum = validateSecureMatterFields("criminal", { personRole: "judge" });
  assert.equal(invalidEnum.ok, false);
  assert.ok(invalidEnum.errors.personRole);
  const mismatched = validateSecureMatterFields("family", { eventDate: { calendar: "gregorian", value: "2026-11-09" } });
  assert.equal(mismatched.ok, false);
  assert.ok(mismatched.errors.form);
});

test("rejects passwords, OTPs, national identifiers, financial secrets and attachments", () => {
  for (const key of ["password", "otp", "nationalId", "cardNumber", "accessToken", "attachments"]) {
    const result = validateSecureMatterFields("civil", { [key]: "must-not-enter" });
    assert.equal(result.ok, false, key);
    assert.ok(result.errors.form, key);
  }
});

test("rejects malformed dates, invalid amounts and invalid currency codes", () => {
  const dateResult = validateSecureMatterFields("property", {
    transactionDate: { calendar: "gregorian", value: "2026-13-40" },
    city: "اهواز",
  });
  assert.equal(dateResult.ok, false);
  assert.ok(dateResult.errors.transactionDate);
  const amount = validateSecureMatterFields("commercial", { amount: "-1200" });
  assert.equal(amount.ok, false);
  assert.ok(amount.errors.amount);
  const currency = validateSecureMatterFields("labor", { currency: "IRR1" });
  assert.equal(currency.ok, false);
  assert.ok(currency.errors.currency);
});

test("validates family age bands and boolean fields without collecting detailed child data", () => {
  const result = validateSecureMatterFields("family", {
    childrenInvolved: true,
    childrenAgeBands: ["under_7", "13_to_18"],
    safetyConcern: "prefer_human_contact",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.childrenAgeBands, ["under_7", "13_to_18"]);
  const invalid = validateSecureMatterFields("family", {
    childrenAgeBands: ["under_7", "under_7", "adult", "7_to_12", "13_to_18"],
  });
  assert.equal(invalid.ok, false);
});

test("rejects arrays, null payloads and unsupported matter types", () => {
  assert.equal(validateSecureMatterFields("civil", null).ok, false);
  assert.equal(validateSecureMatterFields("civil", []).ok, false);
  assert.equal(validateSecureMatterFields("unknown", {}).ok, false);
});

test("normalizes text but rejects overlong values rather than truncating them", () => {
  const normalized = validateSecureMatterFields("administrative", { issuingBody: "  اداره\nثبت  " });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.value.issuingBody, "اداره ثبت");
  const oversized = validateSecureMatterFields("administrative", { issuingBody: "الف".repeat(181) });
  assert.equal(oversized.ok, false);
  assert.ok(oversized.errors.issuingBody);
});
