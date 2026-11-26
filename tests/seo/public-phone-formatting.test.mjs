import assert from "node:assert/strict";
import test from "node:test";

import { formatIranianPhoneLabel, PUBLIC_OFFICE_PHONE_FALLBACKS } from "../../src/lib/public-phone-label.mjs";

test("formats domestic Iranian mobile numbers with the international country code", () => {
  assert.equal(formatIranianPhoneLabel("tel:09169165902"), "+98 916 916 5902");
  assert.equal(formatIranianPhoneLabel("tel:09388322230"), "+98 938 832 2230");
});

test("formats already international Iranian mobile numbers consistently", () => {
  assert.equal(formatIranianPhoneLabel("tel:+989169165902"), "+98 916 916 5902");
  assert.equal(formatIranianPhoneLabel("989388322230"), "+98 938 832 2230");
});

test("does not reinterpret unsupported or malformed phone values", () => {
  assert.equal(formatIranianPhoneLabel("tel:02112345678"), null);
  assert.equal(formatIranianPhoneLabel("not-a-phone"), null);
  assert.equal(formatIranianPhoneLabel(null), null);
});

test("keeps the server-rendered contact fallbacks aligned with the public attorney phone numbers", () => {
  assert.deepEqual(PUBLIC_OFFICE_PHONE_FALLBACKS, ["09169165902", "09388322230"]);
  assert.deepEqual(
    PUBLIC_OFFICE_PHONE_FALLBACKS.map(formatIranianPhoneLabel),
    ["+98 916 916 5902", "+98 938 832 2230"],
  );
});
