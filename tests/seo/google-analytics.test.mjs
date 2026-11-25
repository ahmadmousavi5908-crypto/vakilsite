import test from "node:test";
import assert from "node:assert/strict";
import { getGoogleAnalyticsMeasurementId, getLeadMethodFromHref, isProductionAnalyticsHost, trackLeadContact } from "../../src/lib/google-analytics.mjs";
import { readFileSync } from "node:fs";

const analyticsComponent = readFileSync(new URL("../../src/components/GoogleAnalytics.jsx", import.meta.url), "utf8");
const requestForm = readFileSync(new URL("../../src/components/RequestForm.jsx", import.meta.url), "utf8");

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
test("allows analytics only on the canonical production host", () => {
  assert.equal(isProductionAnalyticsHost("vakilahmadmousavi.ir"), true);
  assert.equal(isProductionAnalyticsHost("WWW.VAKILAHMADMousavi.IR"), true);
  assert.equal(isProductionAnalyticsHost("localhost"), false);
  assert.equal(isProductionAnalyticsHost("127.0.0.1"), false);
  assert.equal(isProductionAnalyticsHost("vakilsite-staging.workers.dev"), false);
  assert.equal(isProductionAnalyticsHost("preview.vakilahmadmousavi.ir"), false);
  assert.equal(isProductionAnalyticsHost(null), false);
});

test("tracks direct contact and request-form WhatsApp intent with a clear source", () => {
  const originalWindow = globalThis.window;
  const calls = [];
  globalThis.window = {
    location: { hostname: "vakilahmadmousavi.ir" },
    gtag: (...args) => calls.push(args),
  };

  try {
    assert.equal(trackLeadContact("whatsapp", "/", "request_form"), true);
    assert.equal(trackLeadContact("phone", "/services/property-law", "link"), true);
    assert.deepEqual(calls, [
      ["event", "contact_click", { method: "whatsapp", page_path: "/", source: "request_form" }],
      ["event", "contact_click", { method: "phone", page_path: "/services/property-law", source: "link" }],
    ]);
    assert.equal(trackLeadContact("unknown", "/", "link"), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("does not track when the GA4 runtime is unavailable", () => {
  const originalWindow = globalThis.window;
  try {
    delete globalThis.window;
    assert.equal(trackLeadContact("whatsapp", "/", "request_form"), false);
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow;
  }
});

test("gates the GA4 component to production and instruments the request form", () => {
  assert.match(analyticsComponent, /isProductionAnalyticsHost\(window\.location\.hostname\)/);
  assert.match(analyticsComponent, /JSON\.stringify\(PRODUCTION_ANALYTICS_HOSTS\)\}\.includes\(window\.location\.hostname\)/);
  assert.match(analyticsComponent, /__vakilsiteGaScriptLoaded/);
  assert.doesNotMatch(analyticsComponent, /useState/);
  assert.match(requestForm, /trackLeadContact\("whatsapp", window\.location\.pathname, "request_form"\)/);
});

test("does not track a lead event until the production GA4 runtime is initialized", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: { hostname: "vakilahmadmousavi.ir" },
    dataLayer: [],
  };

  try {
    assert.equal(trackLeadContact("whatsapp", "/services", "request_form"), false);
    assert.equal(globalThis.window.dataLayer.length, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("never queues contact events on localhost or staging hosts", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: { hostname: "localhost" },
    dataLayer: [],
  };

  try {
    assert.equal(trackLeadContact("whatsapp", "/", "request_form"), false);
    assert.equal(globalThis.window.dataLayer.length, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
