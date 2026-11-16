import assert from "node:assert/strict";
import test from "node:test";
import {
  decodePublishedArticleCursor,
  encodePublishedArticleCursor,
} from "../../src/lib/mavis/published-article-cursor.mjs";

const row = {
  id: "4a0d8f64-5b2a-4f2a-8a10-4a1d0d7b6f90",
  published_at: "2026-11-14T12:30:00.123456+00:00",
};

test("preserves publication timestamp precision in a keyset cursor", () => {
  const cursor = encodePublishedArticleCursor(row);
  assert.deepEqual(decodePublishedArticleCursor(cursor), {
    publishedAt: row.published_at,
    id: row.id,
  });
});

test("rejects malformed and oversized public cursors", () => {
  assert.equal(decodePublishedArticleCursor("bad"), null);
  assert.equal(decodePublishedArticleCursor("A".repeat(513)), null);
});

test("does not encode invalid article rows", () => {
  assert.equal(encodePublishedArticleCursor({ ...row, id: "invalid" }), null);
  assert.equal(encodePublishedArticleCursor({ ...row, published_at: "yesterday" }), null);
});
