import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readConfig(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const production = readConfig("wrangler.jsonc");
const staging = readConfig("wrangler.staging.jsonc");
const preview = readConfig("wrangler.preview.jsonc");

assert.equal(production.ai?.binding, "AI", "Production Workers AI binding is missing.");
assert.equal(production.browser?.binding, "BROWSER", "Production Browser Run binding is missing.");

assert.equal(staging.ai?.binding, "AI", "Staging Workers AI binding is missing.");
assert.equal(staging.browser?.binding, "BROWSER", "Staging Browser Run binding is missing.");
assert.equal(staging.vars?.MAVIS_STAGING_DIAGNOSTICS_ENABLED, "true",
  "Staging-only diagnostics must be explicitly enabled in Staging.");
assert.equal(staging.workers_dev, true, "Staging must use its isolated workers.dev endpoint.");
assert.notEqual(staging.name, production.name, "Staging and Production Worker names must differ.");
assert.deepEqual(
  staging.routes,
  [{ pattern: "staging.vakilahmadmousavi.ir", custom_domain: true }],
  "Staging may attach only its dedicated custom domain."
);
assert.equal(
  staging.routes.some((route) => route.pattern === "vakilahmadmousavi.ir" || route.pattern.endsWith(".vakilahmadmousavi.ir") && route.pattern !== "staging.vakilahmadmousavi.ir"),
  false,
  "Staging must never attach the Production hostname or any other Production subdomain."
);

assert.equal(preview.ai, undefined, "CI preview must not open a remote Workers AI binding.");
assert.equal(preview.browser, undefined, "CI preview must not open a remote Browser Run binding.");
assert.equal(preview.routes, undefined, "CI preview must not attach public routes.");

console.log("PASS: Production AI and Browser Run bindings are declared.");
console.log("PASS: Staging uses isolated Worker configuration and Staging-only diagnostics.");
console.log("PASS: CI preview has no remote AI/Browser bindings or public routes.");
