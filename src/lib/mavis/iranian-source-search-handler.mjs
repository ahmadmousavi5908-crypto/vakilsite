const NO_STORE = Object.freeze({ "Cache-Control": "no-store" });
const MAX_BODY_BYTES = 4096;

function json(body, status, headers = NO_STORE) {
  return Response.json(body, { status, headers });
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      try { await reader.cancel(); } catch { /* Best effort. */ }
      const error = new Error("Payload too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createIranianSourceSearchHandler(dependencies) {
  for (const key of ["requireAdmin", "searchClient", "isJsonContentType", "matchesRequestOrigin", "parseKnowledgeSearchRateLimit"]) {
    if (typeof dependencies?.[key] !== "function" && key !== "searchClient") {
      throw new TypeError("Iranian source search handler requires " + key);
    }
  }
  const { requireAdmin, searchClient, isJsonContentType, matchesRequestOrigin, parseKnowledgeSearchRateLimit } = dependencies;

  return async function handle(request) {
    let access;
    try { access = await requireAdmin(); } catch {
      return json({ error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی ممکن نیست." } }, 503);
    }
    if (!access?.configured) return json({ error: { code: "AUTH_UNAVAILABLE", message: "سرویس احراز هویت در دسترس نیست." } }, 503);
    if (!access.user) return json({ error: { code: "UNAUTHENTICATED", message: "ابتدا وارد پنل مدیریت شوید." } }, 401);
    if (!access.isAdmin) return json({ error: { code: "FORBIDDEN", message: "دسترسی به جست‌وجوی منابع مجاز نیست." } }, 403);
    if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
      return json({ error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } }, 403);
    }
    if (!isJsonContentType(request.headers.get("content-type"))) {
      return json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "نوع محتوای درخواست باید JSON باشد." } }, 415);
    }
    if (!searchClient || typeof searchClient.search !== "function") {
      return json({ error: { code: "NOT_CONFIGURED", message: "اتصال موتور جست‌وجوی منابع ایرانی در تنظیمات امن سرور فعال نشده است." } }, 503);
    }

    let payload;
    try { payload = await readJson(request); } catch (error) {
      const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
      return json({ error: { code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", message: tooLarge ? "حجم درخواست بیش از حد مجاز است." : "درخواست JSON معتبر نیست." } }, tooLarge ? 413 : 400);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        Object.keys(payload).some((key) => !["query", "group", "limit"].includes(key))) {
      return json({ error: { code: "INVALID_REQUEST", message: "ساختار درخواست معتبر نیست." } }, 400);
    }

    const query = typeof payload.query === "string" ? payload.query.trim() : "";
    const group = payload.group ?? "all";
    const limit = payload.limit ?? 10;
    if (query.length < 2 || query.length > 180 || !["all", "official", "academic", "news"].includes(group) ||
        !Number.isInteger(limit) || limit < 1 || limit > 20) {
      return json({ error: { code: "INVALID_REQUEST", message: "عبارت، دسته منابع یا تعداد نتایج معتبر نیست." } }, 400);
    }

    let rateResult;
    try { rateResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit"); } catch { rateResult = { error: true }; }
    let rate;
    try { rate = parseKnowledgeSearchRateLimit(rateResult); } catch { rate = { status: "unavailable" }; }
    if (rate?.status === "unavailable") {
      return json({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست؛ جست‌وجو متوقف شد." } }, 503);
    }
    if (rate?.status === "limited") {
      return json({ error: { code: "RATE_LIMITED", message: "سهمیه جست‌وجو موقتاً تکمیل شده است." } }, 429, { ...NO_STORE, "Retry-After": String(rate.retryAfterSeconds) });
    }

    try {
      const result = await searchClient.search({ query, group, limit });
      if (!result?.ok) return json({ error: { code: "SEARCH_REJECTED", message: "عبارت جست‌وجو معتبر نیست." } }, 400);
      return json(result, 200);
    } catch {
      return json({ error: { code: "PROVIDER_UNAVAILABLE", message: "موتور جست‌وجوی منابع در حال حاضر پاسخ‌گو نیست." } }, 502);
    }
  };
}
