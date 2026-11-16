const ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 12000;

function normalizeResult(result) {
  if (!result || typeof result !== "object") return null;
  let url;
  try {
    url = new URL(result.url);
    if (url.protocol !== "https:" || url.username || url.password) return null;
  } catch {
    return null;
  }

  const title = typeof result.title === "string" ? result.title.trim().slice(0, 240) : "";
  if (!title) return null;

  const parsedDate = typeof result.published_date === "string" ? Date.parse(result.published_date) : NaN;
  return {
    title,
    url: url.href,
    domain: url.hostname.toLowerCase(),
    snippet: typeof result.content === "string" ? result.content.trim().slice(0, 900) : "",
    score: Number.isFinite(result.score) ? Math.max(0, Math.min(1, result.score)) : null,
    publishedDate: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString().slice(0, 10) : null,
  };
}

export function createGeneralWebSearch({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key || typeof fetchImpl !== "function") throw new Error("General web search is not configured.");
  const timeout = Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30000
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS;

  return Object.freeze({
    async search({ query, limit = 8 } = {}) {
      const cleanQuery = typeof query === "string" ? query.normalize("NFC").trim() : "";
      if (cleanQuery.length < 2 || cleanQuery.length > 180) return { ok: false, reason: "invalid_query" };
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) return { ok: false, reason: "invalid_limit" };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetchImpl(ENDPOINT, {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: cleanQuery,
            search_depth: "basic",
            topic: "general",
            max_results: limit,
            include_answer: false,
            include_raw_content: false,
            include_images: false,
            include_usage: true,
          }),
        });
        if (!response?.ok) throw new Error("Web search provider request failed.");
        const payload = await response.json();
        const results = (Array.isArray(payload?.results) ? payload.results : [])
          .map(normalizeResult)
          .filter(Boolean)
          .slice(0, limit);

        return {
          ok: true,
          query: cleanQuery,
          results,
          provider: "tavily",
          usageCredits: Number.isFinite(payload?.usage?.credits) ? payload.usage.credits : null,
          scope: "public_web",
        };
      } finally {
        clearTimeout(timer);
      }
    },
    async extract({ url: rawUrl, query = "" } = {}) {
      let target;
      try {
        target = new URL(typeof rawUrl === "string" ? rawUrl : "");
        if (target.protocol !== "https:" || target.username || target.password) {
          return { ok: false, reason: "invalid_url" };
        }
      } catch {
        return { ok: false, reason: "invalid_url" };
      }

      const cleanQuery = typeof query === "string" ? query.normalize("NFC").trim().slice(0, 180) : "";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetchImpl("https://api.tavily.com/extract", {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            urls: [target.href],
            ...(cleanQuery ? { query: cleanQuery } : {}),
            extract_depth: "basic",
            format: "markdown",
            include_images: false,
            include_usage: true,
          }),
        });
        if (!response?.ok) throw new Error("Web extraction provider request failed.");
        const payload = await response.json();
        const extracted = Array.isArray(payload?.results)
          ? payload.results.find((item) => {
              try { return new URL(item?.url).href === target.href; } catch { return false; }
            })
          : null;
        const content = typeof extracted?.raw_content === "string" ? extracted.raw_content.trim().slice(0, 12000) : "";
        if (!content) return { ok: false, reason: "content_unavailable" };
        return {
          ok: true,
          url: target.href,
          content,
          usageCredits: Number.isFinite(payload?.usage?.credits) ? payload.usage.credits : null,
          scope: "public_web",
        };
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

export function createGeneralWebSearchFromEnv(env = process.env, options = {}) {
  const apiKey = env.MAVIS_IRAN_SOURCE_SEARCH_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) return null;
  try {
    return createGeneralWebSearch({
      apiKey,
      timeoutMs: Number.parseInt(env.MAVIS_IRAN_SOURCE_SEARCH_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10),
      ...options,
    });
  } catch {
    return null;
  }
}
