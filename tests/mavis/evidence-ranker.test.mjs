import assert from "node:assert/strict";
import test from "node:test";
import { rankMavisEvidenceResults } from "../../src/lib/mavis/evidence-ranker.mjs";

test("verified primary evidence receives a ranking boost", () => {
  const results = rankMavisEvidenceResults([
    { id: "secondary", search_score: 900, evidence: { state: "secondary_reference" } },
    {
      id: "primary",
      search_score: 820,
      evidence: {
        state: "verified_primary",
        validity: { status: "in_force" },
        citations: [{ sourceType: "primary", authorityVerified: true }],
      },
    },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["primary", "secondary"]);
  assert.equal(results[0].evidence_priority, "verified_primary");
});

test("strong lexical relevance still beats weak evidence priority", () => {
  const results = rankMavisEvidenceResults([
    { id: "exact-secondary", search_score: 1000, evidence: { state: "secondary_reference" } },
    { id: "weak-primary", search_score: 250, evidence: { state: "verified_primary" } },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["exact-secondary", "weak-primary"]);
});

test("repealed records receive a strong ranking penalty without being deleted", () => {
  const results = rankMavisEvidenceResults([
    { id: "repealed", search_score: 1000, evidence: { state: "outdated", validity: { status: "repealed" } } },
    { id: "current", search_score: 760, evidence: { state: "secondary_reference", validity: { status: "in_force" } } },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["current", "repealed"]);
  assert.equal(results.some((item) => item.id === "repealed"), true);
  assert.equal(results[1].evidence_priority, "outdated");
});

test("partially repealed records are visibly marked and deprioritized", () => {
  const results = rankMavisEvidenceResults([
    { id: "partial", search_score: 800, evidence: { state: "needs_official_check", validity: { status: "partially_repealed" } } },
    { id: "unknown", search_score: 750, evidence: { state: "needs_official_check", validity: { status: "unknown" } } },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["unknown", "partial"]);
  assert.equal(results[1].evidence_priority, "partial_validity");
});

test("a trusted primary citation without completed review gets a limited boost", () => {
  const results = rankMavisEvidenceResults([
    { id: "secondary", search_score: 600, evidence: { state: "secondary_reference" } },
    {
      id: "primary-unreviewed",
      search_score: 550,
      evidence: {
        state: "needs_official_check",
        citations: [{ sourceType: "primary", authorityVerified: true }],
      },
    },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["primary-unreviewed", "secondary"]);
  assert.equal(results[0].evidence_priority, "primary_needs_review");
});

test("stable order is preserved for equal relevance and evidence priority", () => {
  const results = rankMavisEvidenceResults([
    { id: "first", search_score: 500, evidence: { state: "needs_official_check" } },
    { id: "second", search_score: 500, evidence: { state: "needs_official_check" } },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["first", "second"]);
});

test("limits results and does not mutate the input array", () => {
  const input = [
    { id: "one", search_score: 100, evidence: { state: "needs_official_check" } },
    { id: "two", search_score: 90, evidence: { state: "needs_official_check" } },
  ];
  const snapshot = structuredClone(input);
  const result = rankMavisEvidenceResults(input, 1);
  assert.equal(result.length, 1);
  assert.deepEqual(input, snapshot);
});

test("rejects invalid arrays and limits", () => {
  assert.throws(() => rankMavisEvidenceResults(null), TypeError);
  assert.throws(() => rankMavisEvidenceResults([], 0), RangeError);
  assert.throws(() => rankMavisEvidenceResults([], 21), RangeError);
});

test("handles missing evidence conservatively", () => {
  const results = rankMavisEvidenceResults([
    { id: "unknown", search_score: 300 },
    { id: "secondary", search_score: 290, evidence: { state: "secondary_reference" } },
  ]);
  assert.deepEqual(results.map((item) => item.id), ["secondary", "unknown"]);
  assert.equal(results[1].evidence_priority, "unverified");
});
