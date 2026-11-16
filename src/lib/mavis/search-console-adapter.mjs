const ALLOWED_DIMENSIONS = new Set(["date", "hour", "query", "page", "country", "device", "searchAppearance"]);
const ALLOWED_TYPES = new Set(["web", "news", "discover", "googleNews", "image", "video"]);
const ALLOWED_DATA_STATES = new Set(["final", "all", "hourly_all"]);
const ALLOWED_AGGREGATIONS = new Set(["auto", "byPage", "byProperty", "byNewsShowcasePanel"]);

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isOffsetDateTime(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00)$/.exec(value);
  return Boolean(match && isDate(match[1]) && !Number.isNaN(Date.parse(value)));
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
    return mayContainPersonalQuery(url.pathname) ||
      [...url.searchParams.values()].some(mayContainPersonalQuery);
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
  const rawIncompleteDate = metadata.first_incomplete_date;
  const rawIncompleteHour = metadata.first_incomplete_hour;
  const firstIncompleteDate = dataState === "all" && dimensions.includes("date") && isDate(rawIncompleteDate)
    ? rawIncompleteDate
    : null;
  const firstIncompleteHour = dataState === "hourly_all" && dimensions.includes("hour") && isOffsetDateTime(rawIncompleteHour)
    ? rawIncompleteHour
    : null;
  const hasInvalidIncompleteMetadata =
    (rawIncompleteDate != null && firstIncompleteDate === null) ||
    (rawIncompleteHour != null && firstIncompleteHour === null);

  return {
    ok: true,
    source: "google_search_console_search_analytics",
    request: {
      startDate,
      endDate,
      dateRangeTimeZone: "America/Los_Angeles",
      dimensions: [...dimensions],
      type,
      dataState,
      rowLimit,
      startRow,
    },
    aggregationType,
    rows,
    coverage: {
      rowCount: rows.length,
      mayBeTruncated: rows.length >= rowLimit,
      apiCompletenessGuaranteed: false,
      hasIncompleteRecentData: Boolean(firstIncompleteDate || firstIncompleteHour),
      firstIncompleteDate,
      firstIncompleteHour,
      hasInvalidIncompleteMetadata,
    },
    disclaimer: "داده‌های Search Analytics ممکن است همه ردیف‌های موجود را پوشش ندهند؛ خروجی این مبدل تضمین‌کننده کامل‌بودن داده نیست.",
  };
}


function parseCsvRows(input) {
  const source = String(input || "").replace(/^\uFEFF/, "");
  if (!source.trim() || source.length > 5 * 1024 * 1024) {
    return { ok: false, reason: source.length > 5 * 1024 * 1024 ? "csv_too_large" : "csv_empty" };
  }

  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) return { ok: false, reason: "csv_unclosed_quote" };
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return { ok: true, rows };
}

function normalizeCsvHeader(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\u200c\u200f\u202a-\u202e]/g, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
}

function csvNumber(value, { percent = false } = {}) {
  const raw = normalizeDigits(String(value || "").trim())
    .replace(/[٬،,]/g, "")
    .replace(/٫/g, ".")
    .replace(/\s/g, "");
  if (!raw) return null;
  const hasPercent = /[%٪]$/.test(raw);
  const numeric = Number(hasPercent ? raw.slice(0, -1) : raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const normalized = percent && (hasPercent || numeric > 1) ? numeric / 100 : numeric;
  return Number.isFinite(normalized) ? normalized : null;
}
}

function csvDate(value) {
  const raw = normalizeDigits(String(value || "").trim());
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isDate(raw) ? raw : null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
}

export function normalizeSearchConsoleCsv(input, { startDate, endDate, rowLimit = 5000 } = {}) {
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate ||
      !Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > 5000) {
    return { ok: false, reason: "invalid_csv_import_range" };
  }

  const parsed = parseCsvRows(input);
  if (!parsed.ok || parsed.rows.length < 2) return parsed.ok ? { ok: false, reason: "csv_missing_rows" } : parsed;

  const headers = parsed.rows[0].map(normalizeCsvHeader);
  const findColumn = (...names) => headers.findIndex((header) => names.includes(header));
  const columns = {
    query: findColumn("query", "top queries", "search query", "عبارت جستجو", "عبارت جست وجو", "عبارت"),
    page: findColumn("page", "top pages", "landing page", "صفحه", "نشانی صفحه"),
    date: findColumn("date", "تاریخ"),
    clicks: findColumn("clicks", "کلیک"),
    impressions: findColumn("impressions", "نمایش"),
    ctr: findColumn("ctr", "click through rate", "نرخ کلیک"),
    position: findColumn("position", "average position", "میانگین جایگاه", "موقعیت"),
  };

  const dimensions = ["query", "page", "date"].filter((name) => columns[name] >= 0);
  if (!dimensions.some((name) => name === "query" || name === "page") ||
      columns.clicks < 0 || columns.impressions < 0 || columns.position < 0) {
    return { ok: false, reason: "csv_required_columns_missing" };
  }

  const rows = [];
  for (let index = 1; index < parsed.rows.length; index++) {
    const values = parsed.rows[index];
    const read = (name) => columns[name] >= 0 ? String(values[columns[name]] ?? "").trim() : "";
    const query = read("query");
    const page = read("page");
    if (!query && !page) continue;

    const clicks = csvNumber(read("clicks"));
    const impressions = csvNumber(read("impressions"));
    const position = csvNumber(read("position"));
    const rawCtr = columns.ctr >= 0 ? read("ctr") : "";
    const ctr = rawCtr ? csvNumber(rawCtr, { percent: true }) : (
      impressions > 0 && clicks !== null ? clicks / impressions : 0
    );
    if (clicks === null || impressions === null || position === null ||
        ctr === null || clicks > impressions || ctr > 1) {
      return { ok: false, reason: "csv_invalid_metric_row", row: index + 1 };
    }

    const rowDimensions = { query, page };
    if (columns.date >= 0) {
      const date = csvDate(read("date"));
      if (!date) return { ok: false, reason: "csv_invalid_date_row", row: index + 1 };
      if (date < startDate || date > endDate) continue;
      rowDimensions.date = date;
    }

    rows.push({
      keys: dimensions.map((dimension) => rowDimensions[dimension] || ""),
      clicks,
      impressions,
      ctr,
      position,
    });
    if (rows.length > rowLimit) break;
  }

  if (!rows.length) return { ok: false, reason: "csv_no_rows_in_selected_range" };
  const normalized = normalizeSearchAnalyticsResponse({
    responseAggregationType: "auto",
    rows: rows.slice(0, rowLimit),
  }, {
    startDate,
    endDate,
    dimensions,
    type: "web",
    dataState: "final",
    rowLimit,
    startRow: 0,
  });
  if (!normalized.ok) return normalized;

  return {
    ...normalized,
    source: "google_search_console_csv_import",
    importedFromCsv: true,
    coverage: {
      ...normalized.coverage,
      mayBeTruncated: rows.length > rowLimit || rows.length >= rowLimit,
      apiCompletenessGuaranteed: false,
      dateRangeVerified: dimensions.includes("date"),
    },
    disclaimer: dimensions.includes("date")\n      ? "این گزارش از فایل CSV وارد شده و اتصال زنده به Google Search Console نیست. داده فقط در مرورگر پردازش شده و ردیف‌های خارج از بازه انتخابی حذف شده‌اند."\n      : "این گزارش از فایل CSV وارد شده و اتصال زنده به Google Search Console نیست. فایل ستون تاریخ ندارد؛ بازه انتخابی از داخل فایل قابل راستی‌آزمایی نیست.",
  };
}
