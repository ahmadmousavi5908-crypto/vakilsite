const ALLOWED_DIMENSIONS = new Set(["date", "hour", "query", "page", "country", "device", "searchAppearance"]);
const ALLOWED_TYPES = new Set(["web", "news", "discover", "googleNews", "image", "video"]);
const ALLOWED_DATA_STATES = new Set(["final", "all", "hourly_all"]);
const ALLOWED_AGGREGATIONS = new Set(["auto", "byPage", "byProperty"]);

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function finiteMetric(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeDigits(value) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10));
}

function mayContainPersonalQuery(value) {
  if (typeof value !== "string") return false;
  const normalized = normalizeDigits(value);
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalized) ||
    /(?:\+98|0098|0)?9[\s-]?\d{2,3}[\s-]?\d{3}[\s-]?\d{4}/.test(normalized) ||
    /(?:^|\D)\d{10}(?:$|\D)/.test(normalized);
}

function pageContainsSensitiveQuery(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return [...url.searchParams.values()].some(mayContainPersonalQuery);
  } catch {
    return false;
  }
}

export function normalizeSearchAnalyticsResponse(response, request) {
  const dimensions = request?.dimensions;
  const startDate = request?.startDate;
  const endDate = request?.endDate;
  const type = request?.type ?? "web";
  const dataState = request?.dataState ?? "final";
  const rowLimit = request?.rowLimit ?? 1000;
  const startRow = request?.startRow ?? 0;

  if (!Array.isArray(dimensions) || dimensions.some((dimension) => !ALLOWED_DIMENSIONS.has(dimension)) ||
      new Set(dimensions).size !== dimensions.length) {
    return { ok: false, reason: "invalid_dimensions" };
  }
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    return { ok: false, reason: "invalid_date_range" };
  }
  if (!ALLOWED_TYPES.has(type) || !ALLOWED_DATA_STATES.has(dataState)) {
    return { ok: false, reason: "invalid_search_type_or_data_state" };
  }
  if (dimensions.includes("hour") && dataState !== "hourly_all") {
    return { ok: false, reason: "hour_dimension_requires_hourly_data_state" };
  }
  if (!Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > 25000 ||
      !Number.isInteger(startRow) || startRow < 0) {
    return { ok: false, reason: "invalid_pagination" };
  }
  if (!response || typeof response !== "object" || !Array.isArray(response.rows)) {
    return { ok: false, reason: "invalid_api_response" };
  }

  const aggregationType = response.responseAggregationType ?? "auto";
  if (!ALLOWED_AGGREGATIONS.has(aggregationType)) {
    return { ok: false, reason: "unknown_aggregation_type" };
  }

  const rows = [];
  for (const row of response.rows) {
    if (!row || !Array.isArray(row.keys) || row.keys.length !== dimensions.length ||
        row.keys.some((value) => typeof value !== "string") ||
        !finiteMetric(row.clicks) || !finiteMetric(row.impressions) ||
        !finiteMetric(row.ctr) || row.ctr > 1 ||
        !finiteMetric(row.position) || row.clicks > row.impressions) {
      return { ok: false, reason: "invalid_api_row" };
    }

    const values = Object.fromEntries(dimensions.map((dimension, index) => [dimension, row.keys[index]]));
    const sensitiveQuery = dimensions.includes("query") && mayContainPersonalQuery(values.query);
    const sensitivePage = dimensions.includes("page") && pageContainsSensitiveQuery(values.page);
    if (sensitiveQuery) values.query = null;
    if (sensitivePage) values.page = null;

    rows.push({
      dimensions: values,
      metrics: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        averagePosition: row.position,
      },
      privacyReviewRequired: sensitiveQuery || sensitivePage,
    });
  }

  const metadata = response.metadata && typeof response.metadata === "object" ? response.metadata : {};
  const firstIncompleteDate = isDate(metadata.first_incomplete_date) ? metadata.first_incomplete_date : null;
  const firstIncompleteHour = typeof metadata.first_incomplete_hour === "string" ? metadata.first_incomplete_hour : null;

  return {
    ok: true,
    source: "google_search_console_search_analytics",
    request: { startDate, endDate, dimensions: [...dimensions], type, dataState, rowLimit, startRow },
    aggregationType,
    rows,
    coverage: {
      rowCount: rows.length,
      mayBeTruncated: rows.length >= rowLimit,
      apiCompletenessGuaranteed: false,
      hasIncompleteRecentData: Boolean(firstIncompleteDate || firstIncompleteHour),
      firstIncompleteDate,
      firstIncompleteHour,
    },
    disclaimer: "داده‌های Search Analytics ممکن است همه ردیف‌های موجود را پوشش ندهند؛ خروجی این مبدل تضمین‌کننده کامل‌بودن داده نیست.",
  };
}
