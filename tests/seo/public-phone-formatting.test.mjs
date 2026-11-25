import assert from "node:assert/strict";
import test from "node:test";

import { formatIranianPhoneLabel } from "../../src/lib/public-phone-label.mjs";

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
