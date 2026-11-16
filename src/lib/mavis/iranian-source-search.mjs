import { getIranianSourceDomains, normalizeIranianSourceUrl } from "./iranian-source-registry.mjs";

const ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 12000;

function normalizeResult(result) {
  const matched = normalizeIranianSourceUrl(result?.url);
  if (!matched) return null;
  const title = typeof result.title === "string" ? result.title.trim().slice(0, 300) : "";
  if (!title) return null;
  const parsedPublishedDate = typeof result.published_date === "string" ? Date.parse(result.published_date) : NaN;
  const publishedDate = Number.isFinite(parsedPublishedDate)
    ? new Date(parsedPublishedDate).toISOString().slice(0, 10)
    : null;
  return {
    title,
    url: matched.url,
    domain: matched.hostname,
    snippet: typeof result.content === "string" ? result.content.trim().slice(0, 900) : "",
    score: Number.isFinite(result.score) ? Math.max(0, Math.min(1, result.score)) : null,
    publishedDate,
    sourceId: matched.source.id,
    sourceName: matched.source.name,
    sourceGroup: matched.source.group,
    sourceAuthority: matched.source.authority,
    documentKinds: matched.source.documentKinds,
  };
}

export function createIranianSourceSearch({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key || typeof fetchImpl !== "function") throw new Error("Iranian source search is not configured.");
  const timeout = Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30000 ? timeoutMs : DEFAULT_TIMEOUT_MS;

  return Object.freeze({
    async search({ query, group = "all", limit = 10 } = {}) {
      const cleanQuery = typeof query === "string" ? query.normalize("NFC").trim() : "";
      if (cleanQuery.length < 2 || cleanQuery.length > 180) return { ok: false, reason: "invalid_query" };
      if (!["all", "official", "academic", "secondary"].includes(group)) return { ok: false, reason: "invalid_group" };
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) return { ok: false, reason: "invalid_limit" };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetchImpl(ENDPOINT, {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          signal: controller.signal,
          headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            query: cleanQuery,
            search_depth: "basic",
            topic: "general",
            max_results: limit,
            include_domains: getIranianSourceDomains(group),
            include_domains_mode: "restrict",
            include_answer: false,
            include_raw_content: false,
            include_images: false,
            include_usage: true,
            include_published_date: true,
          }),
        });
        if (!response?.ok) throw new Error("Iranian source provider request failed.");
        const payload = await response.json();
        const results = (Array.isArray(payload?.results) ? payload.results : [])
          .map(normalizeResult).filter(Boolean).slice(0, limit);
        return {
          ok: true,
          query: cleanQuery,
          results,
          usageCredits: Number.isFinite(payload?.usage?.credits) ? payload.usage.credits : null,
          provider: "tavily",
          sourcePolicy: "iranian_allowlist_only",
        };
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

export function createIranianSourceSearchFromEnv(env = process.env, options = {}) {
  const apiKey = env.MAVIS_IRAN_SOURCE_SEARCH_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) return null;
  try {
    return createIranianSourceSearch({
      apiKey,
      timeoutMs: Number.parseInt(env.MAVIS_IRAN_SOURCE_SEARCH_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10),
      ...options,
    });
  } catch {
    return null;
  }
}
