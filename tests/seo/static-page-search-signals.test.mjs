import assert from "node:assert/strict";
import test from "node:test";
import { getStaticPageSearchSignals } from "../../src/lib/seo/static-page-search-signals.mjs";

const origin = "https://vakilahmadmousavi.ir";
const portrait = origin + "/images/lawyer.jpg";

test("associates the attorney portrait only with the visible attorney profile page", () => {
  assert.deepEqual(getStaticPageSearchSignals("/", origin), {});
  assert.deepEqual(getStaticPageSearchSignals("/about", origin), { images: [portrait] });
  assert.deepEqual(getStaticPageSearchSignals("/services", origin), { lastModified: "2026-11-24" });
});

test("publishes an accurate last-modified date for the seven service pages changed on 24 November", () => {
  const paths = [
    "/services",
    "/services/family-law",
    "/services/criminal-law",
    "/services/property-law",
    "/services/contracts-and-obligations",
    "/services/claims-and-enforcement",
    "/services/legal-consultation",
  ];
  for (const path of paths) {
    assert.equal(getStaticPageSearchSignals(path, origin).lastModified, "2026-11-24");
  }
});

test("does not invent image or update metadata for unrelated pages", () => {
  assert.deepEqual(getStaticPageSearchSignals("/articles", origin), {});
  assert.deepEqual(getStaticPageSearchSignals("/privacy", origin), {});
});

test("requires a safe HTTPS origin", () => {
  assert.throws(() => getStaticPageSearchSignals("/", "http://vakilahmadmousavi.ir"), /HTTPS/);
});
