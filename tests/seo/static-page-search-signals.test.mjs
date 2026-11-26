import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getStaticPageSearchSignals } from "../../src/lib/seo/static-page-search-signals.mjs";

const origin = "https://vakilahmadmousavi.ir";
const portrait = origin + "/images/lawyer.jpg";

test("publishes the homepage update date without associating the attorney portrait with it", () => {
  assert.deepEqual(getStaticPageSearchSignals("/", origin), {
    lastModified: "2026-11-26",
  });
  assert.deepEqual(getStaticPageSearchSignals("/about", origin), {
    lastModified: "2026-11-26",
    images: [portrait],
  });
  assert.deepEqual(getStaticPageSearchSignals("/locations/khuzestan", origin), {
    lastModified: "2026-11-27",
  });
  assert.deepEqual(getStaticPageSearchSignals("/services", origin), { lastModified: "2026-11-24" });
});

test("publishes accurate last-modified dates for service pages by their latest content change", () => {
  const pathsUpdatedOnNovember24 = [
    "/services",
    "/services/family-law",
    "/services/criminal-law",
    "/services/contracts-and-obligations",
    "/services/claims-and-enforcement",
    "/services/legal-consultation",
  ];
  for (const path of pathsUpdatedOnNovember24) {
    assert.equal(getStaticPageSearchSignals(path, origin).lastModified, "2026-11-24");
  }
  assert.equal(getStaticPageSearchSignals("/services/property-law", origin).lastModified, "2026-11-26");
});

test("does not invent image or update metadata for unrelated pages", () => {
  assert.deepEqual(getStaticPageSearchSignals("/articles", origin), {});
  assert.deepEqual(getStaticPageSearchSignals("/privacy", origin), {});
});

test("requires a safe HTTPS origin", () => {
  assert.throws(() => getStaticPageSearchSignals("/", "http://vakilahmadmousavi.ir"), /HTTPS/);
});

test("wires the regional page last-modified signal into the public sitemap", () => {
  const sitemapSource = readFileSync(new URL("../../src/app/sitemap.js", import.meta.url), "utf8");
  assert.match(
    sitemapSource,
    /path: "\/locations\/khuzestan",\s*\.\.\.getStaticPageSearchSignals\("\/locations\/khuzestan", siteUrl\)/,
  );
});
