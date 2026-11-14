import { normalizeSearchAnalyticsResponse } from "./search-console-adapter.mjs";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/webmasters/v3/sites/";
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

  return Object.freeze({
    source: "google_search_console",
    scope: READ_ONLY_SCOPE,
    async querySearchAnalytics(request) {
      const parsed = readRequest(request);
      if (!parsed.ok) return parsed;

      const accessToken = await getAccessToken();
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

      const apiResponse = await requestJson(
        fetchImpl,
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        },
        timeout,
        "Search Console analytics request failed.",
      );

      return normalizeSearchAnalyticsResponse(
        { ...apiResponse, rows: Array.isArray(apiResponse?.rows) ? apiResponse.rows : [] },
        parsed.value,
      );
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
