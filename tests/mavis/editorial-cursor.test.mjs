import assert from "node:assert/strict";
import test from "node:test";
import { decodeMavisArticleCursor, encodeMavisArticleCursor } from "../../src/lib/mavis/editorial-cursor.mjs";

const row = {
  id: "4a0d8f64-5b2a-4f2a-8a10-4a1d0d7b6f90",
  updated_at: "2026-11-14T12:30:00.000Z",
};

test("encodes and decodes a stable keyset cursor", () => {
  const cursor = encodeMavisArticleCursor(row);
  assert.deepEqual(decodeMavisArticleCursor(cursor), {
    updatedAt: row.updated_at,
    id: row.id,
  });
});

test("rejects malformed, oversized, and non-canonical cursors", () => {
  assert.equal(decodeMavisArticleCursor("bad"), null);
  assert.equal(decodeMavisArticleCursor("A".repeat(513)), null);
  assert.equal(decodeMavisArticleCursor(Buffer.from('{"updatedAt":"yesterday","id":"bad"}').toString("base64url")), null);
});

test("does not encode invalid database rows", () => {
  assert.equal(encodeMavisArticleCursor({ ...row, id: "not-a-uuid" }), null);
  assert.equal(encodeMavisArticleCursor({ ...row, updated_at: "not-a-date" }), null);
});


test("preserves database timestamp precision for stable pagination", () => {
  const preciseRow = {
    ...row,
    updated_at: "2026-11-14T12:30:00.123456+00:00",
  };
  const cursor = encodeMavisArticleCursor(preciseRow);
  assert.deepEqual(decodeMavisArticleCursor(cursor), {
    updatedAt: preciseRow.updated_at,
    id: row.id,
  });
});
