const ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 12000;
const OWN_DOMAIN = "vakilahmadmousavi.ir";

function cleanText(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function parsedDomain(value) {
  const raw = cleanText(value, 260).toLowerCase();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : "https://" + raw);
  } catch {
    return null;
  }
}

function isOwnDomainInput(value) {
  const parsed = parsedDomain(value);
  return parsed?.protocol === "https:" && parsed.hostname.replace(/^www\./, "") === OWN_DOMAIN;
}

function normalizeDomain(value) {
  const parsed = parsedDomain(value);
  if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
  const host = parsed.hostname.replace(/^www\./, "");
  if (!host.includes(".") || host === "localhost" || host === OWN_DOMAIN ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.endsWith(".local")) return null;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return null;
  return host;
}

export function normalizeMavisCompetitorResearchInput(input = {}) {
  const query = cleanText(input.query, 250).replace(/[\u0000-\u001f\u007f]/g, " ");
  const location = cleanText(input.location || "اهواز، خوزستان", 100);
  if (query.length < 3) throw new TypeError("عبارت پژوهش باید دست‌کم سه نویسه داشته باشد.");

  const rawDomains = Array.isArray(input.domains)
    ? input.domains
    : typeof input.domains === "string"
      ? input.domains.split(/[,\u060C\n]/)
      : [];
  const domains = [...new Set(rawDomains.map(normalizeDomain).filter(Boolean))].slice(0, 8);
  if (rawDomains.some((item) => cleanText(item, 260) && !normalizeDomain(item) && !isOwnDomainInput(item))) {
    throw new TypeError("یکی از دامنه‌ها معتبر نیست؛ فقط نام دامنه بدون مسیر وارد کنید.");
  }

  const limit = Number.isInteger(input.limit) ? input.limit : 8;
  if (limit < 3 || limit > 8) throw new TypeError("تعداد نتایج باید بین ۳ تا ۸ باشد.");
  return { query, location, domains, limit };
}

function normalizeResult(item) {
  let url;
  try { url = new URL(item?.url); } catch { return null; }
  const domain = url.hostname.replace(/^www\./, "");
  if (url.protocol !== "https:" || url.username || url.password || domain === OWN_DOMAIN) return null;
  const title = cleanText(item?.title, 300);
  if (!title) return null;
  const publishedTimestamp = typeof item.published_date === "string" ? Date.parse(item.published_date) : NaN;
  return {
    title,
    url: url.toString(),
    domain,
    snippet: cleanText(item?.content, 600),
    relevanceScore: Number.isFinite(item?.score) ? Math.max(0, Math.min(1, item.score)) : null,
    publishedDate: Number.isFinite(publishedTimestamp) ? new Date(publishedTimestamp).toISOString().slice(0, 10) : null
  };
}

export function createMavisCompetitorSearch({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const key = cleanText(apiKey, 500);
  if (!key || typeof fetchImpl !== "function") throw new Error("Growth search is not configured.");
  const timeout = Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30000 ? timeoutMs : DEFAULT_TIMEOUT_MS;

  return Object.freeze({
    async search(input = {}) {
      let normalized;
      try { normalized = normalizeMavisCompetitorResearchInput(input); }
      catch (error) { return { ok: false, reason: "invalid_input", message: error.message }; }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const query = [normalized.query, normalized.location, "ایران"].filter(Boolean).join(" ");
        const body = {
          query,
          search_depth: "basic",
          topic: "general",
          max_results: normalized.limit,
          exclude_domains: [OWN_DOMAIN],
          include_answer: false,
          include_raw_content: false,
          include_images: false,
          include_usage: true,
          include_published_date: true
        };
        if (normalized.domains.length) {
          body.include_domains = normalized.domains;
          body.include_domains_mode = "restrict";
        }

        const response = await fetchImpl(ENDPOINT, {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(body)
        });
        if (!response?.ok) throw new Error("Growth search provider request failed.");
        const payload = await response.json();
        const results = (Array.isArray(payload?.results) ? payload.results : [])
          .map(normalizeResult)
          .filter(Boolean)
          .filter((item) => !normalized.domains.length || normalized.domains.some((domain) => item.domain === domain || item.domain.endsWith("." + domain)))
          .slice(0, normalized.limit);
        return {
          ok: true,
          query: normalized.query,
          location: normalized.location,
          domains: normalized.domains,
          results,
          usageCredits: Number.isFinite(payload?.usage?.credits) ? payload.usage.credits : null,
          retrievedAt: new Date().toISOString(),
          mode: "public_serp_observation",
          limitations: [
            "نتایج وابسته به زمان و موقعیت جست‌وجو هستند و رتبه ثابت رقبا را اثبات نمی‌کنند.",
            "امتیاز ارائه‌دهنده فقط ارتباط نتیجه با عبارت جست‌وجو را نشان می‌دهد؛ حجم جست‌وجو یا ترافیک نیست.",
            "خلاصه صفحات رقبا منبع حقوقی معتبر محسوب نمی‌شود و محتوای کامل آن‌ها دریافت یا ذخیره نشده است."
          ]
        };
      } finally {
        clearTimeout(timer);
      }
    }
  });
}

export function createMavisCompetitorSearchFromEnv(env = process.env, options = {}) {
  const apiKey = env.MAVIS_GROWTH_SEARCH_API_KEY || env.MAVIS_IRAN_SOURCE_SEARCH_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) return null;
  try {
    return createMavisCompetitorSearch({
      apiKey,
      timeoutMs: Number.parseInt(env.MAVIS_GROWTH_SEARCH_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10),
      ...options
    });
  } catch {
    return null;
  }
}
