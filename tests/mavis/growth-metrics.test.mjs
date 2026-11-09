import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateSearchPerformanceRows,
  analyzeSearchPerformance,
  rankContentOpportunities,
} from "../../src/lib/mavis/growth-metrics.mjs";

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


test("aggregates daily Search Console rows before ranking a query and page", () => {
  const rows = aggregateSearchPerformanceRows([
    { page: "https://example.org/law", query: "قانون مدنی", clicks: 5, impressions: 100, averagePosition: 10 },
    { page: "https://example.org/law", query: "قانون مدنی", clicks: 7, impressions: 200, averagePosition: 5 },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].clicks, 12);
  assert.equal(rows[0].impressions, 300);
  assert.equal(rows[0].averagePosition, 20 / 3);
  assert.equal(analyzeSearchPerformance(rows[0]).ctr, 0.04);
});

test("keeps redacted query rows grouped by safe page and ignores invalid metrics", () => {
  const rows = aggregateSearchPerformanceRows([
    { page: "https://example.org/contact", query: null, clicks: 1, impressions: 20, averagePosition: 4 },
    { page: "https://example.org/contact", query: null, clicks: 2, impressions: 30, averagePosition: 6 },
    { page: null, query: null, clicks: 10, impressions: 100, averagePosition: 2 },
    { page: "https://example.org/bad", query: "bad", clicks: 11, impressions: 10, averagePosition: 1 },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].query, null);
  assert.equal(rows[0].clicks, 3);
  assert.equal(rows[0].impressions, 50);
  assert.equal(rows[0].averagePosition, 5.2);
});
