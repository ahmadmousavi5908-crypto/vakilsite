import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchAnalyticsResponse } from "../../src/lib/mavis/search-console-adapter.mjs";

const request = {
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  dimensions: ["query", "page"],
  type: "web",
  dataState: "final",
  rowLimit: 1000,
  startRow: 0,
};

test("maps Search Analytics keys and metrics without recomputing source values", () => {
  const result = normalizeSearchAnalyticsResponse({
    responseAggregationType: "byPage",
    rows: [{ keys: ["ثبت رسمی ملک", "https://vakilahmadmousavi.ir/legal"], clicks: 12, impressions: 120, ctr: 0.1, position: 8.5 }],
  }, request);

  assert.equal(result.ok, true);
  assert.equal(result.rows[0].dimensions.query, "ثبت رسمی ملک");
  assert.equal(result.rows[0].dimensions.page, "https://vakilahmadmousavi.ir/legal");
  assert.equal(result.rows[0].metrics.ctr, 0.1);
  assert.equal(result.rows[0].metrics.averagePosition, 8.5);
  assert.equal(result.coverage.apiCompletenessGuaranteed, false);
  assert.equal(result.request.dateRangeTimeZone, "America/Los_Angeles");
});

test("masks likely personal contact data in query dimensions", () => {
  const result = normalizeSearchAnalyticsResponse({
    rows: [{ keys: ["09123456789", "https://vakilahmadmousavi.ir/"], clicks: 1, impressions: 2, ctr: 0.5, position: 4 }],
  }, request);

  assert.equal(result.ok, true);
  assert.equal(result.rows[0].dimensions.query, null);
  assert.equal(result.rows[0].privacyReviewRequired, true);
});

test("masks Persian-digit phone numbers and national-ID-shaped query values", () => {
  const phone = normalizeSearchAnalyticsResponse({
    rows: [{ keys: ["۰۹۱۲۳۴۵۶۷۸۹", "https://vakilahmadmousavi.ir/"], clicks: 1, impressions: 2, ctr: 0.5, position: 4 }],
  }, request);
  const nationalId = normalizeSearchAnalyticsResponse({
    rows: [{ keys: ["۱۲۳۴۵۶۷۸۹۰", "https://vakilahmadmousavi.ir/"], clicks: 1, impressions: 2, ctr: 0.5, position: 4 }],
  }, request);

  assert.equal(phone.rows[0].dimensions.query, null);
  assert.equal(nationalId.rows[0].dimensions.query, null);
  assert.equal(phone.rows[0].privacyReviewRequired, true);
  assert.equal(nationalId.rows[0].privacyReviewRequired, true);
});

test("supports the hourly dimension and rejects invalid hour-query context", () => {
  const hourly = normalizeSearchAnalyticsResponse({ rows: [] }, {
    ...request,
    dimensions: ["hour"],
    dataState: "hourly_all",
  });
  const invalidShowcase = normalizeSearchAnalyticsResponse({
    responseAggregationType: "unknown",
    rows: [],
  }, request);

  const invalidHour = normalizeSearchAnalyticsResponse({ rows: [] }, {
    ...request,
    dimensions: ["hour"],
    dataState: "final",
  });

  assert.equal(hourly.ok, true);
  assert.equal(invalidHour.ok, false);
  assert.equal(invalidHour.reason, "hour_dimension_requires_hourly_data_state");
  assert.equal(invalidShowcase.ok, false);
  assert.equal(invalidShowcase.reason, "unknown_aggregation_type");
});

test("masks sensitive values embedded in page URL query parameters", () => {
  const result = normalizeSearchAnalyticsResponse({
    rows: [{ keys: ["قانون مدنی", "https://vakilahmadmousavi.ir/page?phone=09123456789"], clicks: 1, impressions: 2, ctr: 0.5, position: 4 }],
  }, { ...request, dimensions: ["query", "page"] });

  assert.equal(result.ok, true);
  assert.equal(result.rows[0].dimensions.page, null);
  assert.equal(result.rows[0].privacyReviewRequired, true);
});

test("reports partial recent data and row-limit risk explicitly", () => {
  const result = normalizeSearchAnalyticsResponse({
    rows: [{ keys: ["2026-10-30"], clicks: 1, impressions: 5, ctr: 0.2, position: 3 }],
    metadata: { first_incomplete_date: "2026-10-30" },
  }, { ...request, dimensions: ["date"], dataState: "all", rowLimit: 1 });

  assert.equal(result.ok, true);
  assert.equal(result.coverage.mayBeTruncated, true);
  assert.equal(result.coverage.hasIncompleteRecentData, true);
  assert.equal(result.coverage.firstIncompleteDate, "2026-10-30");
});

test("accepts the documented News Showcase aggregation response", () => {
  const result = normalizeSearchAnalyticsResponse({
    responseAggregationType: "byNewsShowcasePanel",
    rows: [],
  }, {
    ...request,
    dimensions: ["searchAppearance"],
    type: "discover",
  });

  assert.equal(result.ok, true);
  assert.equal(result.aggregationType, "byNewsShowcasePanel");
});

test("validates incomplete-hour metadata and its required query context", () => {
  const valid = normalizeSearchAnalyticsResponse({
    rows: [{ keys: ["2026-10-30T12:00:00-07:00"], clicks: 1, impressions: 2, ctr: 0.5, position: 4 }],
    metadata: { first_incomplete_hour: "2026-10-30T12:00:00-07:00" },
  }, { ...request, dimensions: ["hour"], dataState: "hourly_all" });

  const malformed = normalizeSearchAnalyticsResponse({
    rows: [],
    metadata: { first_incomplete_hour: "2026-10-30T24:00:00" },
  }, { ...request, dimensions: ["hour"], dataState: "hourly_all" });

  const unexpected = normalizeSearchAnalyticsResponse({
    rows: [],
    metadata: { first_incomplete_hour: "2026-10-30T12:00:00-07:00" },
  }, { ...request, dimensions: ["date"], dataState: "all" });

  assert.equal(valid.coverage.firstIncompleteHour, "2026-10-30T12:00:00-07:00");
  assert.equal(valid.coverage.hasIncompleteRecentData, true);
  assert.equal(malformed.coverage.firstIncompleteHour, null);
  assert.equal(malformed.coverage.hasInvalidIncompleteMetadata, true);
  assert.equal(unexpected.coverage.firstIncompleteHour, null);
  assert.equal(unexpected.coverage.hasInvalidIncompleteMetadata, true);
});

test("rejects invalid dimensions, dates, pagination and inconsistent rows", () => {
  assert.equal(normalizeSearchAnalyticsResponse({ rows: [] }, { ...request, dimensions: ["query", "query"] }).reason, "invalid_dimensions");
  assert.equal(normalizeSearchAnalyticsResponse({ rows: [] }, { ...request, startDate: "2026-02-31" }).reason, "invalid_date_range");
  assert.equal(normalizeSearchAnalyticsResponse({ rows: [] }, { ...request, rowLimit: 25001 }).reason, "invalid_pagination");
  assert.equal(normalizeSearchAnalyticsResponse({ rows: [{ keys: ["x", "y"], clicks: 5, impressions: 2, ctr: 2, position: 1 }] }, request).reason, "invalid_api_row");
});

test("does not silently accept unknown aggregation semantics", () => {
  const result = normalizeSearchAnalyticsResponse({ responseAggregationType: "unknown", rows: [] }, request);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown_aggregation_type");
});
