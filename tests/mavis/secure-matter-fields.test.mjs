import test from "node:test";
import assert from "node:assert/strict";
import {
  getSecureMatterFieldSchema,
  getSecureMatterQuestionnaireContract,
  SECURE_MATTER_QUESTIONNAIRE_VERSION,
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

test("treats blank optional fields as absent and requires amount/currency together", () => {
  const blank = validateSecureMatterFields("civil", { documentType: "   ", executionDate: "" });
  assert.equal(blank.ok, true);
  assert.deepEqual(blank.value, {});

  const missingCurrency = validateSecureMatterFields("civil", { claimedAmount: "2500" });
  assert.equal(missingCurrency.ok, false);
  assert.ok(missingCurrency.errors.currency);

  const complete = validateSecureMatterFields("civil", { claimedAmount: "2500", currency: "IRR" });
  assert.equal(complete.ok, true);
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
  const duplicate = validateSecureMatterFields("family", {
    childrenAgeBands: ["under_7", "under_7"],
  });
  assert.equal(duplicate.ok, false);
  const tooMany = validateSecureMatterFields("family", {
    childrenAgeBands: ["under_7", "adult", "7_to_12", "13_to_18", "over_18"],
  });
  assert.equal(tooMany.ok, false);
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

test("validates actual Gregorian month lengths and leap days", () => {
  const validLeapDay = validateSecureMatterFields("property", {
    transactionDate: { calendar: "gregorian", value: "2024-02-29" },
  });
  assert.equal(validLeapDay.ok, true);

  for (const value of ["2023-02-29", "2026-04-31", "2026-02-30"]) {
    const invalid = validateSecureMatterFields("property", {
      transactionDate: { calendar: "gregorian", value },
    });
    assert.equal(invalid.ok, false, value);
    assert.ok(invalid.errors.transactionDate, value);
  }
});

test("validates Jalali month lengths and Esfand 30 only in leap years", () => {
  const leapYearEnd = validateSecureMatterFields("civil", {
    executionDate: { calendar: "jalali", value: "1403-12-30" },
  });
  assert.equal(leapYearEnd.ok, true);

  const ordinaryYearEnd = validateSecureMatterFields("civil", {
    executionDate: { calendar: "jalali", value: "1404-12-30" },
  });
  assert.equal(ordinaryYearEnd.ok, false);
  assert.ok(ordinaryYearEnd.errors.executionDate);

  const validOrdinaryYearEnd = validateSecureMatterFields("civil", {
    executionDate: { calendar: "jalali", value: "1404-12-29" },
  });
  assert.equal(validOrdinaryYearEnd.ok, true);

  const invalidThirtyFirst = validateSecureMatterFields("civil", {
    executionDate: { calendar: "jalali", value: "1404-07-31" },
  });
  assert.equal(invalidThirtyFirst.ok, false);
  assert.ok(invalidThirtyFirst.errors.executionDate);

  const outsideVerifiedRange = validateSecureMatterFields("civil", {
    executionDate: { calendar: "jalali", value: "1635-01-01" },
  });
  assert.equal(outsideVerifiedRange.ok, false);
  assert.ok(outsideVerifiedRange.errors.executionDate);
});

test("exposes one immutable versioned post-approval questionnaire contract", () => {
  assert.equal(SECURE_MATTER_QUESTIONNAIRE_VERSION, 1);
  const contract = getSecureMatterQuestionnaireContract("civil");
  assert.equal(contract.id, "mavis-matter-civil-v1");
  assert.equal(contract.version, 1);
  assert.equal(contract.stage, "post_approval");
  assert.equal(contract.requiresHumanApproval, true);
  assert.equal(contract.deadlineCalculated, false);
  assert.ok(Object.isFrozen(contract));
  assert.ok(Object.isFrozen(contract.fields));
  assert.equal(getSecureMatterQuestionnaireContract("civil", 2), null);
  assert.equal(getSecureMatterQuestionnaireContract("unknown"), null);
});

test("marks validated supplementary answers as post-approval and never calculates deadlines", () => {
  const result = validateSecureMatterFields("civil", {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {});
  assert.equal(result.schemaId, "mavis-matter-civil-v1");
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.collectionStage, "post_approval");
  assert.equal(result.requiresHumanApproval, true);
  assert.equal(result.deadlineCalculated, false);
});
