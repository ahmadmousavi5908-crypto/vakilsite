import { normalizeSearchAnalyticsResponse } from "./search-console-adapter.mjs";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/webmasters/v3/sites/";
const INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const READ_ONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const DEFAULT_TIMEOUT_MS = 20000;
const ALLOWED_AGGREGATIONS = new Set(["auto", "byPage", "byProperty", "byNewsShowcasePanel"]);

export function normalizeSearchConsoleSiteUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();

  if (candidate.startsWith("sc-domain:")) {
    const domain = candidate.slice("sc-domain:".length).toLowerCase();
    return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain) &&
      !domain.includes("..")
      ? "sc-domain:" + domain
      : null;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
        url.port || url.search || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}

function normalizeInspectionUrl(value, siteUrl) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
        url.port || url.hash) return null;
    if (siteUrl.startsWith("sc-domain:")) {
      const domain = siteUrl.slice("sc-domain:".length);
      if (url.hostname !== domain && !url.hostname.endsWith("." + domain)) return null;
    } else {
      const property = new URL(siteUrl);
      const prefix = property.pathname.endsWith("/") ? property.pathname : property.pathname + "/";
      if (url.origin !== property.origin || !url.pathname.startsWith(prefix)) return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function readRequest(request) {
  const normalized = {
    startDate: request?.startDate,
    endDate: request?.endDate,
    dimensions: request?.dimensions,
    type: request?.type ?? "web",
    dataState: request?.dataState ?? "final",
    rowLimit: request?.rowLimit ?? 1000,
    startRow: request?.startRow ?? 0,
  };
  const validation = normalizeSearchAnalyticsResponse({ rows: [] }, normalized);
  if (!validation.ok) return validation;

  const aggregationType = request?.aggregationType ?? "auto";
  if (!ALLOWED_AGGREGATIONS.has(aggregationType)) {
    return { ok: false, reason: "invalid_aggregation_type" };
  }

  return { ok: true, value: { ...normalized, aggregationType } };
}

async function requestJson(fetchImpl, url, options, timeoutMs, failureCode) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...options,
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response?.ok) throw new Error(failureCode);
    try {
      return await response.json();
    } catch {
      throw new Error(failureCode);
    }
  } finally {
    clearTimeout(timer);
  }
}

function normalizeInspectionResponse(payload) {
  const result = payload?.inspectionResult;
  if (!result || typeof result !== "object") throw new Error("Search Console inspection response is invalid.");
  const index = result.indexStatusResult || {};
  const mobile = result.mobileUsabilityResult || {};
  const rich = result.richResultsResult || {};
  return {
    inspectionResultLink: typeof result.inspectionResultLink === "string" ? result.inspectionResultLink : null,
    indexStatus: {
      verdict: index.verdict || null,
      coverageState: index.coverageState || null,
      robotsTxtState: index.robotsTxtState || null,
      indexingState: index.indexingState || null,
      pageFetchState: index.pageFetchState || null,
      lastCrawlTime: index.lastCrawlTime || null,
      googleCanonical: index.googleCanonical || null,
      userCanonical: index.userCanonical || null,
      crawledAs: index.crawledAs || null,
      referringUrls: Array.isArray(index.referringUrls) ? index.referringUrls.filter((item) => typeof item === "string").slice(0, 20) : [],
    },
    mobileUsability: { verdict: mobile.verdict || null },
    richResults: {
      verdict: rich.verdict || null,
      detectedItems: Array.isArray(rich.detectedItems) ? rich.detectedItems.slice(0, 20).map((item) => ({
        type: typeof item?.richResultType === "string" ? item.richResultType : null,
        items: Array.isArray(item?.items) ? item.items.slice(0, 20).map((entry) => ({
          name: typeof entry?.name === "string" ? entry.name : null,
          issues: Array.isArray(entry?.issues) ? entry.issues.slice(0, 10).map((issue) => ({
            severity: issue?.severity || null,
            issueMessage: issue?.issueMessage || null,
          })) : [],
        })) : [],
      })) : [],
    },
  };
}

function normalizeSitemapsResponse(payload) {
  const entries = Array.isArray(payload?.sitemap) ? payload.sitemap : [];
  return {
    total: entries.length,
    sitemaps: entries.slice(0, 200).map((item) => ({
      path: typeof item?.path === "string" ? item.path : null,
      type: typeof item?.type === "string" ? item.type : null,
      lastSubmitted: item?.lastSubmitted || null,
      lastDownloaded: item?.lastDownloaded || null,
      isPending: item?.isPending === true,
      isSitemapsIndex: item?.isSitemapsIndex === true,
      warnings: Number.isFinite(item?.warnings) ? item.warnings : 0,
      errors: Number.isFinite(item?.errors) ? item.errors : 0,
      contents: Array.isArray(item?.contents) ? item.contents.slice(0, 20).map((entry) => ({
        type: typeof entry?.type === "string" ? entry.type : null,
        submitted: Number.isFinite(entry?.submitted) ? entry.submitted : null,
        indexed: Number.isFinite(entry?.indexed) ? entry.indexed : null,
      })) : [],
    })),
    truncated: entries.length > 200,
  };
}

export function createSearchConsoleClient({
  clientId,
  clientSecret,
  refreshToken,
  siteUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const config = {
    clientId: typeof clientId === "string" ? clientId.trim() : "",
    clientSecret: typeof clientSecret === "string" ? clientSecret.trim() : "",
    refreshToken: typeof refreshToken === "string" ? refreshToken.trim() : "",
    siteUrl: normalizeSearchConsoleSiteUrl(siteUrl),
  };
  const timeout = Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 60000
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS;

  if (!config.clientId || !config.clientSecret || !config.refreshToken ||
      !config.siteUrl || typeof fetchImpl !== "function") {
    throw new Error("Search Console OAuth configuration is incomplete.");
  }

  let cachedAccessToken = null;
  let tokenExpiresAt = 0;

  async function getAccessToken() {
    if (cachedAccessToken && tokenExpiresAt > Date.now() + 60000) return cachedAccessToken;

    const form = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    });
    const tokenPayload = await requestJson(
      fetchImpl,
      TOKEN_ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form.toString(),
      },
      timeout,
      "Search Console OAuth token refresh failed.",
    );

    if (typeof tokenPayload?.access_token !== "string" || !tokenPayload.access_token.trim()) {
      throw new Error("Search Console OAuth token refresh failed.");
    }

    const expiresIn = Number.isInteger(tokenPayload.expires_in) && tokenPayload.expires_in >= 60
      ? Math.min(tokenPayload.expires_in, 86400)
      : 3600;
    cachedAccessToken = tokenPayload.access_token;
    tokenExpiresAt = Date.now() + expiresIn * 1000;
    return cachedAccessToken;
  }

  async function authorizedRequest(url, options, failureCode) {
    const accessToken = await getAccessToken();
    return requestJson(fetchImpl, url, {
      ...options,
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
        ...(options?.headers || {}),
      },
    }, timeout, failureCode);
  }

  return Object.freeze({
    source: "google_search_console",
    scope: READ_ONLY_SCOPE,
    async querySearchAnalytics(request) {
      const parsed = readRequest(request);
      if (!parsed.ok) return parsed;

      const endpoint = API_BASE + encodeURIComponent(config.siteUrl) + "/searchAnalytics/query";
      const body = {
        startDate: parsed.value.startDate,
        endDate: parsed.value.endDate,
        dimensions: parsed.value.dimensions,
        type: parsed.value.type,
        dataState: parsed.value.dataState,
        rowLimit: parsed.value.rowLimit,
        startRow: parsed.value.startRow,
        aggregationType: parsed.value.aggregationType,
      };

      const apiResponse = await authorizedRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, "Search Console analytics request failed.");

      return normalizeSearchAnalyticsResponse(
        { ...apiResponse, rows: Array.isArray(apiResponse?.rows) ? apiResponse.rows : [] },
        parsed.value,
      );
    },
    async inspectUrl(value) {
      const inspectionUrl = normalizeInspectionUrl(value, config.siteUrl);
      if (!inspectionUrl) throw new Error("Search Console inspection URL is invalid or outside the configured property.");
      const payload = await authorizedRequest(INSPECTION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionUrl, siteUrl: config.siteUrl, languageCode: "fa-IR" }),
      }, "Search Console URL inspection request failed.");
      return { inspectionUrl, ...normalizeInspectionResponse(payload) };
    },
    async listSitemaps() {
      const endpoint = API_BASE + encodeURIComponent(config.siteUrl) + "/sitemaps";
      const payload = await authorizedRequest(endpoint, { method: "GET" }, "Search Console sitemap request failed.");
      return normalizeSitemapsResponse(payload);
    },
  });
}

export function createSearchConsoleClientFromEnv(env = process.env, options = {}) {
  const clientId = env.MAVIS_GSC_CLIENT_ID;
  const clientSecret = env.MAVIS_GSC_CLIENT_SECRET;
  const refreshToken = env.MAVIS_GSC_REFRESH_TOKEN;
  const siteUrl = env.MAVIS_GSC_SITE_URL;

  if (![clientId, clientSecret, refreshToken, siteUrl].every((value) => typeof value === "string" && value.trim())) {
    return null;
  }

  try {
    return createSearchConsoleClient({
      clientId,
      clientSecret,
      refreshToken,
      siteUrl,
      timeoutMs: Number.parseInt(env.MAVIS_GSC_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10),
      ...options,
    });
  } catch {
    return null;
  }
}
