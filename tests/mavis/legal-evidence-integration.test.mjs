import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLegalEvidence } from "../../src/lib/mavis/legal-evidence.mjs";

function readDataset(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

const laws = readDataset("../../src/data/legal-library/laws/laws.json").records;
const articles = readDataset("../../src/data/legal-library/articles/articles.json").records;
const terms = readDataset("../../src/data/legal-library/terms/terms.json").records;

test("current legal-library records never bypass provenance requirements", () => {
  const records = [...laws, ...articles, ...terms];
  assert.ok(records.length > 0);

  for (const record of records) {
    const evidence = buildLegalEvidence(record);
    if (evidence.state === "verified_primary") {
      assert.equal(record.review_status, "verified_primary_source");
      assert.equal(record.source_verified, true);
      assert.equal(record.validity_status, "in_force");
      assert.match(record.last_verified_at || "", /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(evidence.citations.some((source) => source.authorityVerified && source.accessedAt));
    }
    assert.equal(evidence.legalOpinion, undefined);
    assert.equal(evidence.deadlineCalculation, undefined);
  }
});

test("source registry output contains only HTTPS links without embedded credentials", () => {
  const records = [...laws, ...articles, ...terms];
  for (const record of records) {
    const evidence = buildLegalEvidence(record);
    for (const source of evidence.citations) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.equal(url.username, "");
      assert.equal(url.password, "");
    }
  }
});
