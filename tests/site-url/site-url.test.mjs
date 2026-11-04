import test from "node:test";
import assert from "node:assert/strict";
import { getSiteUrl } from "../../src/lib/site-url.mjs";

test("returns a normalized HTTPS origin", () => {
  assert.equal(
    getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.ir/" }),
    "https://example.ir",
  );
});

test("returns null when the site origin is not configured and not required", () => {
  assert.equal(getSiteUrl({}), null);
});

test("requires a canonical origin when requested", () => {
  assert.throws(
    () => getSiteUrl({}, { required: true }),
    /NEXT_PUBLIC_SITE_URL is required/,
  );
});

test("rejects non-HTTPS URLs", () => {
  assert.throws(
    () => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://example.ir" }),
    /must be an HTTPS origin/,
  );
});

test("rejects paths, query strings, and fragments", () => {
  for (const value of [
    "https://example.ir/site",
    "https://example.ir/?preview=1",
    "https://example.ir/#home",
  ]) {
    assert.throws(
      () => getSiteUrl({ NEXT_PUBLIC_SITE_URL: value }),
      /must be an HTTPS origin/,
    );
  }
});

test("rejects embedded credentials", () => {
  assert.throws(
    () => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://user:pass@example.ir" }),
    /must be an HTTPS origin/,
  );
});

test("rejects malformed URLs", () => {
  assert.throws(
    () => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "not-a-url" }),
    /must be a valid absolute URL/,
  );
});


test("rejects localhost, IP addresses, trailing-dot hosts, and explicit ports", () => {
  for (const value of [
    "https://localhost",
    "https://127.0.0.1",
    "https://192.168.1.10",
    "https://[::1]",
    "https://example.ir.",
    "https://example.ir:8443",
  ]) {
    assert.throws(
      () => getSiteUrl({ NEXT_PUBLIC_SITE_URL: value }),
      /must be a public HTTPS origin/,
    );
  }
});
