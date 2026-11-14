const PROVIDERS = Object.freeze({
  crossref: "https://api.crossref.org/works",
  semanticScholar: "https://api.semanticscholar.org/graph/v1/paper/search",
  openAlex: "https://api.openalex.org/works",
});

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_QUERY_LENGTH = 160;
const MAX_RESULTS = 20;

function cleanText(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function datePrecision(value) {
  if (typeof value !== "string" || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(value)) return null;
  return value;
}

function crossrefDate(item) {
  for (const key of ["published-online", "published-print", "issued", "created"]) {
    const parts = item?.[key]?.["date-parts"]?.[0];
    if (!Array.isArray(parts) || !Number.isInteger(parts[0])) continue;
    const year = String(parts[0]).padStart(4, "0");
    if (Number.isInteger(parts[1]) && parts[1] >= 1 && parts[1] <= 12) {
      const month = String(parts[1]).padStart(2, "0");
      if (Number.isInteger(parts[2]) && parts[2] >= 1 && parts[2] <= 31) {
        return datePrecision(`${year}-${month}-${String(parts[2]).padStart(2, "0")}`);
      }
      return datePrecision(`${year}-${month}`);
    }
    return datePrecision(year);
  }
  return null;
}

function authorNames(authors) {
  if (!Array.isArray(authors)) return [];
  return authors.slice(0, 30).map((author) => {
    if (typeof author === "string") return cleanText(author, 180);
    return cleanText([author?.given, author?.family].filter(Boolean).join(" "), 180)
      || cleanText(author?.name, 180);
  }).filter(Boolean);
}

function normalizeCrossref(item) {
  const title = cleanText(item?.title?.[0], 500);
  const doi = cleanText(item?.DOI, 200).toLowerCase();
  const url = safeUrl(item?.URL) || (doi ? safeUrl(`https://doi.org/${encodeURIComponent(doi)}`) : null);
  if (!title || !url) return null;
  return {
    provider: "crossref",
    providerRecordId: doi || url,
    doi: doi || null,
    title,
    authors: authorNames(item?.author),
    publisher: cleanText(item?.publisher, 300) || null,
    venue: cleanText(item?.["container-title"]?.[0], 300) || null,
    publicationDate: crossrefDate(item),
    sourceUrl: url,
    sourceType: "academic",
    rightsStatus: "unknown",
  };
}

function normalizeSemanticScholar(item) {
  const title = cleanText(item?.title, 500);
  const paperId = cleanText(item?.paperId, 200);
  const url = safeUrl(item?.url) || (paperId ? safeUrl(`https://www.semanticscholar.org/paper/${encodeURIComponent(paperId)}`) : null);
  if (!title || !paperId || !url) return null;
  const externalIds = item?.externalIds && typeof item.externalIds === "object" ? item.externalIds : {};
  const doi = cleanText(externalIds.DOI, 200).toLowerCase();
  return {
    provider: "semantic_scholar",
    providerRecordId: paperId,
    doi: doi || null,
    title,
    authors: authorNames(item?.authors?.map((author) => author?.name)),
    publisher: null,
    venue: cleanText(item?.venue, 300) || null,
    publicationDate: datePrecision(item?.publicationDate) || (Number.isInteger(item?.year) ? datePrecision(String(item.year)) : null),
    sourceUrl: url,
    sourceType: "academic",
    rightsStatus: "unknown",
  };
}

function normalizeOpenAlex(item) {
  const title = cleanText(item?.title, 500);
  const id = cleanText(item?.id, 300);
  const url = safeUrl(id);
  if (!title || !url) return null;
  const doi = cleanText(item?.doi, 300).replace(/^https?:\/\/doi\.org\//i, "").toLowerCase();
  const authors = Array.isArray(item?.authorships)
    ? item.authorships.slice(0, 30).map((entry) => cleanText(entry?.author?.display_name, 180)).filter(Boolean)
    : [];
  return {
    provider: "openalex",
    providerRecordId: id,
    doi: doi || null,
    title,
    authors,
    publisher: cleanText(item?.primary_location?.source?.host_organization_name, 300) || null,
    venue: cleanText(item?.primary_location?.source?.display_name, 300) || null,
    publicationDate: datePrecision(item?.publication_date),
    sourceUrl: safeUrl(item?.primary_location?.landing_page_url) || url,
    sourceType: "academic",
    rightsStatus: "unknown",
  };
}

function boundedLimit(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_RESULTS, Math.max(1, Math.trunc(number))) : 10;
}

function buildRequest(provider, query, limit, env) {
  const url = new URL(PROVIDERS[provider]);
  const headers = { Accept: "application/json" };

  if (provider === "crossref") {
    url.searchParams.set("query.bibliographic", query);
    url.searchParams.set("rows", String(limit));
    url.searchParams.set("select", "DOI,title,author,publisher,container-title,published-online,published-print,issued,created,URL,type");
    const mailto = cleanText(env.MAVIS_CROSSREF_MAILTO, 200);
    if (mailto && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailto)) url.searchParams.set("mailto", mailto);
    headers["User-Agent"] = "MAVISSourceDiscovery/1.0 (metadata-only; contact configured by administrator)";
  }

  if (provider === "semanticScholar") {
    url.searchParams.set("query", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fields", "paperId,title,year,authors,venue,publicationDate,externalIds,url");
    if (env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = env.SEMANTIC_SCHOLAR_API_KEY;
  }

  if (provider === "openAlex") {
    if (!env.OPENALEX_API_KEY || !(Number(env.MAVIS_OPENALEX_MAX_COST_USD) > 0)) {
      return { disabled: true, reason: "OpenAlex requires an API key and an explicit positive usage budget." };
    }
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", String(limit));
    url.searchParams.set("select", "id,doi,title,publication_date,authorships,primary_location");
    headers.Authorization = `Bearer ${env.OPENALEX_API_KEY}`;
  }

  return { url, headers };
}

async function readJsonBounded(response, maxBytes) {
  const declaredLength = Number(response.headers?.get?.("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error("UPSTREAM_RESPONSE_TOO_LARGE");
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error("UPSTREAM_RESPONSE_TOO_LARGE");
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("UPSTREAM_INVALID_JSON");
  }
}

function extractItems(provider, payload) {
  if (provider === "crossref") return Array.isArray(payload?.message?.items) ? payload.message.items : [];
  if (provider === "semanticScholar") return Array.isArray(payload?.data) ? payload.data : [];
  if (provider === "openAlex") return Array.isArray(payload?.results) ? payload.results : [];
  return [];
}

/**
 * Creates isolated, metadata-only scholarly discovery adapters.
 * Fetch is injected for deterministic tests; no arbitrary URL can enter this layer.
 */
export function createMavisSourceDiscoveryAdapters({
  fetchImpl = globalThis.fetch,
  env = process.env,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxResponseBytes = MAX_RESPONSE_BYTES,
} = {}) {
  async function search(provider, rawQuery, rawLimit = 10) {
    if (!Object.hasOwn(PROVIDERS, provider)) return { ok: false, provider, error: "UNSUPPORTED_PROVIDER" };
    const query = cleanText(rawQuery, MAX_QUERY_LENGTH);
    if (query.length < 2 || query.length > MAX_QUERY_LENGTH) return { ok: false, provider, error: "INVALID_QUERY" };
    if (typeof fetchImpl !== "function") return { ok: false, provider, error: "FETCH_UNAVAILABLE" };

    const limit = boundedLimit(rawLimit);
    const request = buildRequest(provider, query, limit, env || {});
    if (request.disabled) return { ok: false, provider, error: "PROVIDER_DISABLED", detail: request.reason };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(15000, Math.max(500, timeoutMs)));
    try {
      const response = await fetchImpl(request.url, {
        method: "GET",
        headers: request.headers,
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });
      if (response.status === 429) return { ok: false, provider, error: "RATE_LIMITED" };
      if (!response.ok) return { ok: false, provider, error: response.status >= 500 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_REJECTED" };

      const payload = await readJsonBounded(response, maxResponseBytes);
      const normalizer = provider === "crossref"
        ? normalizeCrossref
        : provider === "semanticScholar" ? normalizeSemanticScholar : normalizeOpenAlex;
      const candidates = extractItems(provider, payload).slice(0, limit).map(normalizer).filter(Boolean);
      return { ok: true, provider, candidates, retrievedAt: new Date().toISOString() };
    } catch (error) {
      const message = error?.message;
      return {
        ok: false,
        provider,
        error: message === "UPSTREAM_RESPONSE_TOO_LARGE" || message === "UPSTREAM_INVALID_JSON"
          ? message
          : controller.signal.aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_NETWORK_ERROR",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    searchCrossref: (query, limit) => search("crossref", query, limit),
    searchSemanticScholar: (query, limit) => search("semanticScholar", query, limit),
    searchOpenAlex: (query, limit) => search("openAlex", query, limit),
  });
}
