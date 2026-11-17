import { getIranianSourceDomains, normalizeIranianSourceUrl } from "./iranian-source-registry.mjs";

const SEARCH_ENDPOINT = "https://api.exa.ai/search";
const CONTENTS_ENDPOINT = "https://api.exa.ai/contents";
const DEFAULT_TIMEOUT_MS = 12000;

const LEGAL_METADATA_SCHEMA = {
  type: "object",
  properties: {
    author: { type: "string", description: "Author or authors, only if explicitly stated; otherwise empty." },
    publication: { type: "string", description: "Journal, publisher, court, or issuing publication explicitly named in the source." },
    publicationDate: { type: "string", description: "Publication or issuance date exactly as stated in the source; do not infer." },
    documentNumber: { type: "string", description: "Official opinion, decision, article, or document number exactly as stated; otherwise empty." },
    issuingAuthority: { type: "string", description: "Court, council, legislature, or institution that issued the document, only when explicit." },
    documentType: { type: "string", description: "Document type such as رأی وحدت رویه، رأی قضایی، قانون، مقاله علمی، نظریه مشورتی." },
    abstract: { type: "string", description: "A concise neutral summary in Persian, maximum 500 characters, grounded only in the source." },
    headings: { type: "array", items: { type: "string" }, description: "Up to eight explicit section headings, preserving their original wording." }
  }
};

function normalizeResult(result) {
  const matched = normalizeIranianSourceUrl(result?.url);
  if (!matched) return null;
  const title = typeof result.title === "string" ? result.title.trim().slice(0, 300) : "";
  if (!title) return null;
  const parsedPublishedDate = typeof result.publishedDate === "string" ? Date.parse(result.publishedDate) : NaN;
  const publishedDate = Number.isFinite(parsedPublishedDate) ? new Date(parsedPublishedDate).toISOString().slice(0, 10) : null;
  const highlights = Array.isArray(result.highlights) ? result.highlights.filter((item) => typeof item === "string").join("\n") : "";
  return {
    title, url: matched.url, domain: matched.hostname, snippet: highlights.trim().slice(0, 900),
    score: null, publishedDate, sourceId: matched.source.id, sourceName: matched.source.name,
    sourceGroup: matched.source.group, sourceAuthority: matched.source.authority, documentKinds: matched.source.documentKinds,
  };
}

function parseStructuredMetadata(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

export function createIranianSourceSearch({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key || typeof fetchImpl !== "function") throw new Error("Iranian source search is not configured.");
  const timeout = Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30000 ? timeoutMs : DEFAULT_TIMEOUT_MS;

  async function postJson(endpoint, body, controller) {
    const response = await fetchImpl(endpoint, {
      method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!response?.ok) throw new Error("Iranian source provider request failed.");
    return response.json();
  }

  return Object.freeze({
    async search({ query, group = "all", limit = 10 } = {}) {
      const cleanQuery = typeof query === "string" ? query.normalize("NFC").trim() : "";
      if (cleanQuery.length < 2 || cleanQuery.length > 180) return { ok: false, reason: "invalid_query" };
      if (!["all", "official", "academic", "secondary"].includes(group)) return { ok: false, reason: "invalid_group" };
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) return { ok: false, reason: "invalid_limit" };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const payload = await postJson(SEARCH_ENDPOINT, {
          query: cleanQuery, type: "auto", numResults: limit,
          includeDomains: getIranianSourceDomains(group), contents: { highlights: true },
        }, controller);
        const results = (Array.isArray(payload?.results) ? payload.results : []).map(normalizeResult).filter(Boolean).slice(0, limit);
        return {
          ok: true, query: cleanQuery, results,
          usageCostUsd: Number.isFinite(payload?.costDollars?.total) ? payload.costDollars.total : null,
          provider: "exa", sourcePolicy: "iranian_allowlist_only",
        };
      } finally { clearTimeout(timer); }
    },
    async extract({ url: rawUrl } = {}) {
      const target = normalizeIranianSourceUrl(rawUrl);
      if (!target) return { ok: false, reason: "invalid_url" };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(timeout, 30000));
      try {
        const payload = await postJson(CONTENTS_ENDPOINT, {
          ids: [target.url],
          summary: {
            query: [
              "این صفحه را فقط بر اساس اطلاعات صریح خود منبع تحلیل کن.",
              "فیلدهای ناموجود را خالی برگردان؛ شماره، تاریخ، نویسنده یا مرجع را حدس نزن.",
              "چکیده فارسی حداکثر ۵۰۰ نویسه باشد و متن کامل منبع را کپی نکن."
            ].join(" "),
            schema: LEGAL_METADATA_SCHEMA,
          },
        }, controller);
        const extracted = Array.isArray(payload?.results)
          ? payload.results.find((item) => normalizeIranianSourceUrl(item?.url)?.url === target.url) : null;
        const metadata = parseStructuredMetadata(extracted?.summary);
        if (!metadata) return { ok: false, reason: "content_unavailable" };
        const headings = Array.isArray(metadata.headings)
          ? metadata.headings.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, 120)).filter(Boolean).slice(0, 8) : [];
        const normalizedMetadata = {
          author: typeof metadata.author === "string" ? metadata.author.trim().slice(0, 180) : "",
          publication: typeof metadata.publication === "string" ? metadata.publication.trim().slice(0, 180) : "",
          publicationDate: typeof metadata.publicationDate === "string" ? metadata.publicationDate.trim().slice(0, 80) : "",
          documentNumber: typeof metadata.documentNumber === "string" ? metadata.documentNumber.trim().slice(0, 120) : "",
          issuingAuthority: typeof metadata.issuingAuthority === "string" ? metadata.issuingAuthority.trim().slice(0, 180) : "",
          documentType: typeof metadata.documentType === "string" ? metadata.documentType.trim().slice(0, 100) : "",
          abstract: typeof metadata.abstract === "string" ? metadata.abstract.trim().slice(0, 500) : "",
          headings,
        };
        const content = [normalizedMetadata.abstract, ...headings.map((heading) => "## " + heading)].filter(Boolean).join("\n\n");
        if (!content && !Object.values(normalizedMetadata).some((value) => Array.isArray(value) ? value.length : Boolean(value))) {
          return { ok: false, reason: "content_unavailable" };
        }
        return {
          ok: true, url: target.url, content, metadata: normalizedMetadata, sourceId: target.source.id,
          sourceName: target.source.name,
          usageCostUsd: Number.isFinite(payload?.costDollars?.total) ? payload.costDollars.total : null,
        };
      } finally { clearTimeout(timer); }
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
              const payload = await response.json();
              if (payload?.success !== true || typeof payload.result !== "string") {
                providerErrors.push({ provider: "qavanin_browser_run", code: "UPSTREAM_UNAVAILABLE" });
              } else if (payload.result.length > 2_000_000) {
                providerErrors.push({ provider: "qavanin_browser_run", code: "RESPONSE_TOO_LARGE" });
              } else {
                results.push(...parseQavaninSearchResults(payload.result, limit));
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
