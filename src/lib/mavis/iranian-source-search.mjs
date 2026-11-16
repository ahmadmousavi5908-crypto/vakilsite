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


function decodeHtmlText(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function parseQavaninSearchResults(markup, limit) {
  const results = [];
  const rows = String(markup || "").matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi);
  for (const row of rows) {
    const rowAttributes = row[1] || "";
    const rowHtml = row[2] || "";
    const id = rowHtml.match(/IDS=(\d{1,20})/i)?.[1];
    if (!id) continue;
    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decodeHtmlText(cell[1]));
    if (cells.length < 4) continue;
    const title = cells[1]?.slice(0, 300);
    if (!title) continue;
    const approved = cells[2]?.slice(0, 40) || "";
    const approver = cells[3]?.slice(0, 180) || "";
    const repealed = /\bred\b/i.test(rowAttributes);
    const url = "https://qavanin.ir/Law/TreeText/?IDS=" + id;
    const matched = normalizeIranianSourceUrl(url);
    if (!matched) continue;
    results.push({
      title,
      url: matched.url,
      domain: matched.hostname,
      snippet: [
        approved ? "تاریخ تصویب: " + approved : "",
        approver ? "مرجع تصویب: " + approver : "",
        repealed ? "وضعیت درج‌شده در سامانه: منسوخ" : "وضعیت نهایی و اصلاحات باید در متن سند بررسی شود"
      ].filter(Boolean).join(" | "),
      score: null,
      publishedDate: null,
      sourceId: matched.source.id,
      sourceName: "سامانه ملی قوانین و مقررات کشور",
      sourceGroup: "official",
      sourceAuthority: "official_primary",
      documentKinds: matched.source.documentKinds,
      statusHint: repealed ? "repealed" : "unverified"
    });
    if (results.length >= limit) break;
  }
  return results;
}

function buildOfficialSearchLinks(query, group) {
  const links = [];
  if (group === "all" || group === "official") {
    const qavanin = new URL("https://qavanin.ir/");
    qavanin.searchParams.set("size", "25");
    qavanin.searchParams.set("PageNumber", "1");
    qavanin.searchParams.set("SortColumn", "APPROVEDATE");
    qavanin.searchParams.set("SortDesc", "True");
    qavanin.searchParams.set("CAPTION", query);
    qavanin.searchParams.set("IsTitleSearch", "true");
    qavanin.searchParams.set("SeachTextType", "1");
    links.push({
      id: "qavanin",
      title: "سامانه ملی قوانین و مقررات کشور",
      description: "جست‌وجوی مستقیم عنوان در قوانین، مقررات، آرای قضایی و نظرات حقوقی",
      url: qavanin.href
    });
    links.push({
      id: "dotic",
      title: "پایگاه ملی اطلاع‌رسانی قوانین و مقررات",
      description: "درگاه رسمی مکمل برای جست‌وجو و بررسی متن مصوبات",
      url: "https://www.dotic.ir/"
    });
    links.push({
      id: "rrk",
      title: "روزنامه رسمی کشور",
      description: "بررسی انتشار رسمی، شماره و تاریخ روزنامه رسمی",
      url: "https://rrk.ir/ords/r/rrs/rrs-front/home"
    });
  }
  const domains = group === "all"
    ? [
        ...getIranianSourceDomains("official").slice(3, 6),
        ...getIranianSourceDomains("academic").slice(0, 3),
        ...getIranianSourceDomains("secondary").slice(0, 1)
      ]
    : group === "official"
      ? getIranianSourceDomains("official").slice(3)
      : getIranianSourceDomains(group);
  for (const domain of domains.slice(0, 7)) {
    links.push({
      id: "search-" + domain,
      title: "جست‌وجو در " + domain,
      description: "پیوند جست‌وجوی وب محدود به دامنه منتخب؛ نتیجه باید در منبع اصلی راستی‌آزمایی شود",
      url: "https://www.google.com/search?q=" + encodeURIComponent("site:" + domain + " " + query)
    });
  }
  return links;
}

export function createIranianSourceSearchFallback({ browser, timeoutMs = 18000 } = {}) {
  const timeout = Number.isInteger(timeoutMs) && timeoutMs >= 3000 && timeoutMs <= 30000
    ? timeoutMs
    : 18000;

  return Object.freeze({
    async search({ query, group = "all", limit = 10 } = {}) {
      const cleanQuery = typeof query === "string" ? query.normalize("NFC").trim() : "";
      if (cleanQuery.length < 2 || cleanQuery.length > 180) return { ok: false, reason: "invalid_query" };
      if (!["all", "official", "academic", "secondary"].includes(group)) return { ok: false, reason: "invalid_group" };
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) return { ok: false, reason: "invalid_limit" };

      const searchLinks = buildOfficialSearchLinks(cleanQuery, group);
      const results = [];
      const providerErrors = [];
      if ((group === "all" || group === "official") && typeof browser?.quickAction === "function") {
        const url = searchLinks.find((item) => item.id === "qavanin")?.url;
        if (url) {
          try {
            const response = await browser.quickAction("content", {
              url,
              gotoOptions: { waitUntil: "networkidle2", timeout }
            });
            if (!response?.ok) {
              providerErrors.push({ provider: "qavanin_browser_run", code: "UPSTREAM_UNAVAILABLE" });
            } else {
              const markup = await response.text();
              if (markup.length > 2_000_000) {
                providerErrors.push({ provider: "qavanin_browser_run", code: "RESPONSE_TOO_LARGE" });
              } else {
                results.push(...parseQavaninSearchResults(markup, limit));
                if (!results.length) providerErrors.push({ provider: "qavanin_browser_run", code: "NO_PARSEABLE_RESULTS" });
              }
            }
          } catch {
            providerErrors.push({ provider: "qavanin_browser_run", code: "UPSTREAM_UNAVAILABLE" });
          }
        }
      } else if (group === "all" || group === "official") {
        providerErrors.push({ provider: "qavanin_browser_run", code: "BROWSER_BINDING_UNAVAILABLE" });
      }

      return {
        ok: true,
        query: cleanQuery,
        results: results.slice(0, limit),
        searchLinks,
        provider: results.length ? "cloudflare_browser_run_qavanin" : "official_portal_fallback",
        sourcePolicy: "iranian_allowlist_only",
        providerErrors
      };
    }
  });
}
