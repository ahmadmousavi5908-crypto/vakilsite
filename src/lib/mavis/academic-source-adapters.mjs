const CROSSREF_ENDPOINT = "https://api.crossref.org/works";
const SEMANTIC_SCHOLAR_ENDPOINT = "https://api.semanticscholar.org/graph/v1/paper/search";
const OPENALEX_ENDPOINT = "https://api.openalex.org/works";
const DEFAULT_TIMEOUT_MS = 12000;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_AUTHORS = 20;

function cleanText(value, max = 500) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function safeHttpUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function normalizeDoi(value) {
  if (typeof value !== "string") return null;
  const doi = value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:/i, "");
  return /^10\.\d{4,9}\/[\S]+$/i.test(doi) ? doi.toLowerCase() : null;
}

function normalizeDateParts(parts) {
  if (!Array.isArray(parts) || !Array.isArray(parts[0])) return { date: null, precision: null };
  const values = parts[0].slice(0, 3);
  if (!Number.isInteger(values[0]) || values[0] < 1000 || values[0] > 3000) {
    return { date: null, precision: null };
  }
  if (values.length >= 2 && (!Number.isInteger(values[1]) || values[1] < 1 || values[1] > 12)) {
    return { date: String(values[0]), precision: "year" };
  }
  if (values.length >= 3 && (!Number.isInteger(values[2]) || values[2] < 1 || values[2] > 31)) {
    return { date: String(values[0]) + "-" + String(values[1]).padStart(2, "0"), precision: "month" };
  }
  if (values.length === 3) {
    return { date: String(values[0]) + "-" + String(values[1]).padStart(2, "0") + "-" + String(values[2]).padStart(2, "0"), precision: "day" };
  }
  if (values.length === 2) {
    return { date: String(values[0]) + "-" + String(values[1]).padStart(2, "0"), precision: "month" };
  }
  return { date: String(values[0]), precision: "year" };
}

function normalizeIsoDate(value, year) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(value + "T00:00:00Z");
    if (!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value) {
      return { date: value, precision: "day" };
    }
  }
  if (Number.isInteger(year) && year >= 1000 && year <= 3000) {
    return { date: String(year), precision: "year" };
  }
  return { date: null, precision: null };
}

function normalizeAuthors(authors) {
  if (!Array.isArray(authors)) return [];
  return authors.slice(0, MAX_AUTHORS).map((author) => {
    if (typeof author === "string") return cleanText(author, 180);
    return cleanText(author?.name ?? [author?.given, author?.family].filter(Boolean).join(" "), 180);
  }).filter(Boolean);
}

function candidate({
  provider, providerId, doi, title, authors, publisher, published, sourceUrl, sourceType, retrievedAt,
}) {
  const normalizedTitle = cleanText(title);
  const normalizedUrl = safeHttpUrl(sourceUrl) ?? (normalizeDoi(doi) ? "https://doi.org/" + normalizeDoi(doi) : null);
  if (!normalizedTitle || !normalizedUrl) return null;
  return Object.freeze({
    provider,
    providerId: cleanText(providerId, 200),
    doi: normalizeDoi(doi),
    title: normalizedTitle,
    authors: normalizeAuthors(authors),
    publisher: cleanText(publisher, 300),
    publishedOn: published?.date ?? null,
    publicationDatePrecision: published?.precision ?? null,
    sourceUrl: normalizedUrl,
    sourceType: cleanText(sourceType, 80) ?? "academic",
    retrievedAt,
    rightsStatus: "unknown",
    contentIncluded: false,
  });
}

function normalizeCrossrefItem(item, retrievedAt) {
  const published = normalizeDateParts(
    item?.published?.["date-parts"] ?? item?.["published-print"]?.["date-parts"] ?? item?.["published-online"]?.["date-parts"],
  );
  const title = Array.isArray(item?.title) ? item.title[0] : item?.title;
  const publisher = Array.isArray(item?.["container-title"])
    ? item["container-title"][0] ?? item?.publisher
    : item?.publisher;
  return candidate({
    provider: "crossref",
    providerId: item?.DOI,
    doi: item?.DOI,
    title,
    authors: item?.author,
    publisher,
    published,
    sourceUrl: item?.URL,
    sourceType: item?.type,
    retrievedAt,
  });
}

function normalizeSemanticScholarItem(item, retrievedAt) {
  return candidate({
    provider: "semantic_scholar",
    providerId: item?.paperId,
    doi: item?.externalIds?.DOI,
    title: item?.title,
    authors: item?.authors,
    publisher: item?.venue,
    published: normalizeIsoDate(item?.publicationDate, item?.year),
    sourceUrl: item?.url,
    sourceType: "academic",
    retrievedAt,
  });
}

function normalizeOpenAlexItem(item, retrievedAt) {
  const authors = Array.isArray(item?.authorships)
    ? item.authorships.map((entry) => entry?.author?.display_name)
    : [];
  const landingUrl = item?.primary_location?.landing_page_url ?? item?.doi ?? item?.id;
  return candidate({
    provider: "openalex",
    providerId: item?.id,
    doi: item?.doi,
    title: item?.title,
    authors,
    publisher: item?.primary_location?.source?.display_name,
    published: normalizeIsoDate(item?.publication_date, item?.publication_year),
    sourceUrl: landingUrl,
    sourceType: item?.type ?? "academic",
    retrievedAt,
  });
}

function validateSearch(query, limit) {
  const normalized = typeof query === "string" ? query.trim() : "";
  if (normalized.length < 2 || normalized.length > 120) {
    throw new TypeError("Discovery query must contain 2 to 120 characters.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new TypeError("Discovery limit must be an integer between 1 and 20.");
  }
  return normalized;
}

function createRequest(fetchImpl, timeoutMs) {
  return async function requestJson(url, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json", ...headers },
        redirect: "error",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response?.ok) {
        const error = new Error("Academic source provider request failed.");
        error.code = response?.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_UNAVAILABLE";
        throw error;
      }
      const body = await response.text();
      if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
        const error = new Error("Academic source provider response exceeded the size limit.");
        error.code = "PROVIDER_RESPONSE_TOO_LARGE";
        throw error;
      }
      try {
        return JSON.parse(body);
      } catch {
        const error = new Error("Academic source provider returned invalid data.");
        error.code = "PROVIDER_INVALID_RESPONSE";
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
  };
}

function serializeRequests(task) {
  let queue = Promise.resolve();
  return (...args) => {
    const current = queue.then(() => task(...args), () => task(...args));
    queue = current.catch(() => undefined);
    return current;
  };
}

function normalizeTimeout(timeoutMs) {
  return Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30000
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS;
}

export function createCrossrefAdapter({ mailto, fetchImpl = globalThis.fetch, timeoutMs } = {}) {
  const contact = cleanText(mailto, 200);
  if (!contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || typeof fetchImpl !== "function") {
    throw new Error("Crossref adapter requires a valid contact email and fetch implementation.");
  }
  const requestJson = createRequest(fetchImpl, normalizeTimeout(timeoutMs));
  return Object.freeze({
    provider: "crossref",
    search: serializeRequests(async (query, limit = 10) => {
      const term = validateSearch(query, limit);
      const url = new URL(CROSSREF_ENDPOINT);
      url.searchParams.set("query.bibliographic", term);
      url.searchParams.set("rows", String(limit));
      url.searchParams.set("mailto", contact);
      url.searchParams.set("select", "DOI,title,author,publisher,container-title,published,published-print,published-online,type,URL");
      const payload = await requestJson(url.href, { "User-Agent": "MAVIS Editorial Discovery (mailto:" + contact + ")" });
      const retrievedAt = new Date().toISOString();
      return (Array.isArray(payload?.message?.items) ? payload.message.items : [])
        .map((item) => normalizeCrossrefItem(item, retrievedAt)).filter(Boolean);
    }),
  });
}

export function createSemanticScholarAdapter({ apiKey, fetchImpl = globalThis.fetch, timeoutMs } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Semantic Scholar adapter requires fetch.");
  const requestJson = createRequest(fetchImpl, normalizeTimeout(timeoutMs));
  const headers = typeof apiKey === "string" && apiKey.trim() ? { "x-api-key": apiKey.trim() } : {};
  return Object.freeze({
    provider: "semantic_scholar",
    search: serializeRequests(async (query, limit = 10) => {
      const term = validateSearch(query, limit);
      const url = new URL(SEMANTIC_SCHOLAR_ENDPOINT);
      url.searchParams.set("query", term);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("fields", "title,year,authors,venue,publicationDate,externalIds,url");
      const payload = await requestJson(url.href, headers);
      const retrievedAt = new Date().toISOString();
      return (Array.isArray(payload?.data) ? payload.data : [])
        .map((item) => normalizeSemanticScholarItem(item, retrievedAt)).filter(Boolean);
    }),
  });
}

export function createOpenAlexAdapter({
  apiKey, enabled = false, dailyBudgetUsd, fetchImpl = globalThis.fetch, timeoutMs,
} = {}) {
  if (!enabled || typeof apiKey !== "string" || !apiKey.trim() ||
      typeof dailyBudgetUsd !== "number" || !Number.isFinite(dailyBudgetUsd) || dailyBudgetUsd <= 0) {
    return null;
  }
  if (typeof fetchImpl !== "function") throw new Error("OpenAlex adapter requires fetch.");
  const requestJson = createRequest(fetchImpl, normalizeTimeout(timeoutMs));
  return Object.freeze({
    provider: "openalex",
    search: serializeRequests(async (query, limit = 10) => {
      const term = validateSearch(query, limit);
      const url = new URL(OPENALEX_ENDPOINT);
      url.searchParams.set("search", term);
      url.searchParams.set("per-page", String(limit));
      url.searchParams.set("select", "id,doi,title,publication_year,publication_date,authorships,primary_location,type");
      const payload = await requestJson(url.href, { Authorization: "Bearer " + apiKey.trim() });
      const retrievedAt = new Date().toISOString();
      return (Array.isArray(payload?.results) ? payload.results : [])
        .map((item) => normalizeOpenAlexItem(item, retrievedAt)).filter(Boolean);
    }),
  });
}

export function createAcademicSourceAdapters(config = {}) {
  const adapters = [];
  if (config.crossref?.enabled === true) {
    adapters.push(createCrossrefAdapter(config.crossref));
  }
  if (config.semanticScholar?.enabled === true) {
    adapters.push(createSemanticScholarAdapter(config.semanticScholar));
  }
  const openAlex = createOpenAlexAdapter(config.openAlex);
  if (openAlex) adapters.push(openAlex);
  return Object.freeze(adapters);
}

export async function searchAcademicSources(adapters, query, limit = 10) {
  const enabled = Array.isArray(adapters) ? adapters : [];
  const settled = await Promise.allSettled(enabled.map((adapter) => adapter.search(query, limit)));
  return settled.map((result, index) => ({
    provider: enabled[index]?.provider ?? "unknown",
    status: result.status,
    results: result.status === "fulfilled" ? result.value : [],
    errorCode: result.status === "rejected" ? result.reason?.code ?? "PROVIDER_UNAVAILABLE" : null,
  }));
}
