import test from "node:test";
import assert from "node:assert/strict";
import robots from "../../src/app/robots.js";

test("allows search crawlers while keeping private paths disallowed", () => {
  const result = robots();
  const wildcard = result.rules.find((rule) => rule.userAgent === "*");
  const search = result.rules.find((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("OAI-SearchBot"));
  const restricted = result.rules.find((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("GPTBot"));

  assert.ok(wildcard);
  assert.ok(search);
  assert.ok(restricted);
  assert.deepEqual(search.disallow, ["/admin", "/admin/", "/api", "/api/"]);
  assert.ok(search.allow.includes("/"));\n  assert.ok(search.allow.includes("/admin/login"));
  assert.equal(restricted.disallow, "/");
  assert.ok(search.userAgent.includes("Googlebot"));
  assert.ok(search.userAgent.includes("Bingbot"));
  assert.ok(search.userAgent.includes("Claude-SearchBot"));
  assert.ok(search.userAgent.includes("PerplexityBot"));
  assert.ok(!search.userAgent.includes("ChatGPT-User"));
});

test("publishes sitemap location only when canonical origin is configured", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(robots().sitemap, undefined);
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.ir";
    assert.equal(robots().sitemap, "https://example.ir/sitemap.xml");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  }
});
