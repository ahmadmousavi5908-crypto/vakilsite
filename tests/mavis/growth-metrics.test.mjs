import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSearchPerformance, rankContentOpportunities } from "../../src/lib/mavis/growth-metrics.mjs";

test("calculates transparent deterministic opportunity and visibility metrics", () => {
  const result = analyzeSearchPerformance({ impressions: 10000, clicks: 100, averagePosition: 8, qualifiedLeads: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.ctr, 0.01);
  assert.equal(result.visibilityScore, 65);
  assert.equal(result.conversionRate, 0.05);
  assert.match(result.disclaimer, /رتبه گوگل/);
});

test("rejects impossible or negative Search Console metrics", () => {
  assert.equal(analyzeSearchPerformance({ impressions: 10, clicks: 11 }).ok, false);
  assert.equal(analyzeSearchPerformance({ impressions: -1, clicks: 0 }).ok, false);
});

test("keeps missing conversion and position data unknown rather than inventing zero", () => {
  const result = analyzeSearchPerformance({ impressions: 100, clicks: 10 });
  assert.equal(result.qualifiedLeads, null);
  assert.equal(result.conversionRate, null);
  assert.equal(result.visibilityScore, null);
  assert.equal(result.interpretation, "conversion_data_missing");
});

test("ranks only valid rows and orders higher opportunities first", () => {
  const rows = rankContentOpportunities([
    { id: "low", impressions: 100, clicks: 90 },
    { id: "high", impressions: 10000, clicks: 10 },
    { id: "invalid", impressions: 10, clicks: 11 },
  ]);
  assert.deepEqual(rows.map((row) => row.id), ["high", "low"]);
});
