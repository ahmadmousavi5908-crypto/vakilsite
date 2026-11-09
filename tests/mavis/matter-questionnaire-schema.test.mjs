import test from "node:test";
import assert from "node:assert/strict";
import { getMatterQuestionnaireSchema, validateMatterQuestionnaire } from "../../src/lib/mavis/matter-questionnaire-schema.mjs";

test("exposes immutable, versioned schemas only for supported matter types", () => {
  const schema = getMatterQuestionnaireSchema("civil");
  assert.equal(schema.id, "mavis-matter-civil-v1");
  assert.equal(schema.version, 1);
  assert.equal(schema.stage, "post_approval");
  assert.equal(schema.requiresHumanApproval, true);
  assert.ok(Object.isFrozen(schema.fields));
  assert.equal(getMatterQuestionnaireSchema("civil", 2), null);
  assert.equal(getMatterQuestionnaireSchema("unknown"), null);
});
test("accepts an empty supplementary questionnaire because all fields are optional", () => {
  const result = validateMatterQuestionnaire("civil", {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {});
  assert.equal(result.collectionStage, "post_approval");
  assert.equal(result.deadlineCalculated, false);
});
test("validates only fields belonging to the selected matter type", () => {
  const result = validateMatterQuestionnaire("civil", {
    documentType: "contract", executionDate: { value: "1405-08-18", calendar: "jalali" },
    breachSummary: "تعهد قراردادی در موعد مقرر اجرا نشده است.",
    amount: { amount: "125000000", currency: "IRR" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.schemaId, "mavis-matter-civil-v1");
  const crossCategory = validateMatterQuestionnaire("civil", { custodyConcern: "custody" });
  assert.equal(crossCategory.ok, false);
  assert.ok(crossCategory.errors.custodyConcern);
});
test("rejects unknown credential, identity, bank and attachment fields", () => {
  const result = validateMatterQuestionnaire("criminal", {
    role: "accused", password: "not-allowed", otp: "123456", nationalId: "0012345678",
    bankAccount: "123", attachments: [],
  });
  assert.equal(result.ok, false);
  for (const field of ["password", "otp", "nationalId", "bankAccount", "attachments"]) assert.ok(result.errors[field]);
});
test("validates calendar-aware dates without converting or calculating deadlines", () => {
  assert.equal(validateMatterQuestionnaire("civil", { executionDate: { value: "1405-06-31", calendar: "jalali" } }).ok, true);
  assert.equal(validateMatterQuestionnaire("civil", { executionDate: { value: "1405-07-31", calendar: "jalali" } }).ok, false);
  assert.equal(validateMatterQuestionnaire("civil", { executionDate: { value: "2026-02-30", calendar: "gregorian" } }).ok, false);
  assert.equal(validateMatterQuestionnaire("civil", { executionDate: { value: "1405-08-18", calendar: "gregorian" } }).ok, false);
});
test("rejects malformed enums, duplicate multi-select values and unsafe money formats", () => {
  assert.equal(validateMatterQuestionnaire("family", { requestType: "criminal_case" }).ok, false);
  assert.equal(validateMatterQuestionnaire("family", { childrenAgeBands: ["under_7", "under_7"] }).ok, false);
  assert.equal(validateMatterQuestionnaire("civil", { amount: { amount: "1e9", currency: "IRR" } }).ok, false);
  assert.equal(validateMatterQuestionnaire("civil", { amount: { amount: "100", currency: "BTC" } }).ok, false);
});
test("bounds and normalizes text without accepting control characters", () => {
  const valid = validateMatterQuestionnaire("administrative", { issuingBody: "  سازمان اداری  " });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.issuingBody, "سازمان اداری");
  const invalid = validateMatterQuestionnaire("administrative", { issuingBody: "x".repeat(161) });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.issuingBody);
});
test("rejects invalid top-level shapes and unsupported schema versions", () => {
  assert.equal(validateMatterQuestionnaire("civil", []).ok, false);
  assert.equal(validateMatterQuestionnaire("civil", null).ok, false);
  assert.equal(validateMatterQuestionnaire("civil", {}, 99).ok, false);
});
