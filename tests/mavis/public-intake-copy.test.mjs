import test from "node:test";
import assert from "node:assert/strict";
import {
  getIntakeConsentCopy,
  getIntakeConsentVersion,
} from "../../src/lib/mavis/public-intake-copy.mjs";

test("versions consent text against the approved retention duration", () => {
  assert.equal(getIntakeConsentVersion(30), "mavis-intake-v1-30d");
  assert.equal(getIntakeConsentVersion(3650), "mavis-intake-v1-3650d");
  assert.equal(getIntakeConsentVersion(0), null);
  assert.equal(getIntakeConsentVersion(3651), null);
});

test("discloses retention and keeps marketing consent separate", () => {
  const copy = getIntakeConsentCopy(30);
  assert.match(copy.retention, /۳۰/);
  assert.match(copy.initialReview, /بررسی اولیه/);
  assert.match(copy.marketing, /اختیاری/);
  assert.match(copy.thirdParty, /به معنای رضایت شخص ثالث/);
});
