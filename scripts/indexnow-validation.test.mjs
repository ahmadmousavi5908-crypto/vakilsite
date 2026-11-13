import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateIndexNowPath, isValidIndexNowKey } from "./indexnow-validation.mjs";

test("validates IndexNow keys", () => {
  for (const key of ["a1B2c3D4", "key-with-dash-123", "Z1234567", "0123456789abcdef".repeat(8)]) assert.equal(isValidIndexNowKey(key), true);
  for (const key of ["", "1234567", "1234567!", "a".repeat(129), null, undefined]) assert.equal(isValidIndexNowKey(key), false);
});

test("blocks private paths after repeated URL decoding and normalization", () => {
  for (const path of ["/admin", "/admin/users", "/api", "/api/private", "/%61dmin/users", "/%61pi/private", "/%2561dmin/users", "/%2561pi/private", "/\\\\admin/users", "//admin/users", "/%255cadmin/users"]) assert.equal(isPrivateIndexNowPath(path), true, path);
});

test("allows public paths and rejects malformed or unknown paths", () => {
  for (const path of ["/", "/articles/example", "/about", "/legal-library"]) assert.equal(isPrivateIndexNowPath(path), false, path);
  assert.equal(isPrivateIndexNowPath("/%ZZ"), true);
  assert.equal(isPrivateIndexNowPath(null), true);
});
