import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateIndexNowPath, isValidIndexNowKey } from "./indexnow-validation.mjs";

test("accepts IndexNow keys with 8 to 128 alphanumeric or hyphen characters", () => {
  assert.equal(isValidIndexNowKey("a1B2c3D4"), true);
  assert.equal(isValidIndexNowKey("0123456789abcdef".repeat(8)), true);
  assert.equal(isValidIndexNowKey("key-with-dash-123"), true);
  assert.equal(isValidIndexNowKey("Z1234567"), true);
  for (const key of ["", "1234567", "1234567!", "a".repeat(129)]) {
    assert.equal(isValidIndexNowKey(key), false, key);
  }
});

test("identifies private admin and API paths including encoded variants", () => {
  for (const path of ["/admin", "/admin/users", "/api", "/api/private", "/%61dmin/users", "/%61pi/private", "/%2561dmin/users", "/%2561pi/private", "/\\\\admin/users", "//admin/users", "/%255cadmin/users"]) {
    assert.equal(isPrivateIndexNowPath(path), true, path);
  }
  for (const path of ["/", "/articles/example", "/about", "/legal-library"]) {
    assert.equal(isPrivateIndexNowPath(path), false, path);
  }
  assert.equal(isPrivateIndexNowPath("/%ZZ"), true);
});
