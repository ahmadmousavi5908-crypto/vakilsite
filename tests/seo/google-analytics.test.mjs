import test from "node:test";
import assert from "node:assert/strict";
import { getGoogleAnalyticsMeasurementId, getLeadMethodFromHref } from "../../src/lib/google-analytics.mjs";

test("accepts a valid GA4 measurement ID and trims whitespace", () => {
  assert.equal(getGoogleAnalyticsMeasurementId(" G-4W4H01THN5 "), "G-4W4H01THN5");
});

test("rejects missing, malformed, and non-GA measurement IDs", () => {
  for (const value of [undefined, null, "", "G-", "G-INVALID!", "GTM-5LZ88DTT", "UA-123456"]) {
    assert.equal(getGoogleAnalyticsMeasurementId(value), null);
  }
});

test("recognizes phone, email, and supported WhatsApp lead links", () => {
  assert.equal(getLeadMethodFromHref("tel:+986112345678"), "phone");
  assert.equal(getLeadMethodFromHref("mailto:office@example.com"), "email");
  assert.equal(getLeadMethodFromHref("https://wa.me/989123456789"), "whatsapp");
  assert.equal(getLeadMethodFromHref("https://api.whatsapp.com/send?phone=989123456789"), "whatsapp");
});

test("ignores unrelated, unsafe, and oversized links", () => {
  assert.equal(getLeadMethodFromHref("https://example.com/contact"), null);
  assert.equal(getLeadMethodFromHref("javascript:alert(1)"), null);
  assert.equal(getLeadMethodFromHref("https://whatsapp.com.evil.example/send"), null);
  assert.equal(getLeadMethodFromHref("x".repeat(2049)), null);
  assert.equal(getLeadMethodFromHref(null), null);
});