const NO_STORE_HEADERS = Object.freeze({ "Cache-Control": "no-store" });
const MAX_BODY_BYTES = 4096;
const ALLOWED_KEYS = new Set([
  "startDate",
  "endDate",
  "dimensions",
  "type",
  "dataState",
  "rowLimit",
  "startRow",
  "aggregationType",
]);

function jsonResponse(body, status, headers = NO_STORE_HEADERS) {
  return Response.json(body, { status, headers });
}

async function readBoundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      try { await reader.cancel(); } catch { /* Best-effort cancellation after rejection. */ }
      const error = new Error("Request body too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validateDependencies(dependencies) {
  for (const key of ["requireAdmin", "isJsonContentType", "matchesRequestOrigin", "parseKnowledgeSearchRateLimit"]) {
    if (typeof dependencies?.[key] !== "function") {
      throw new TypeError("Search Console handler requires " + key);
    }
  }
  if (dependencies.getClient !== undefined && typeof dependencies.getClient !== "function") {
    throw new TypeError("Search Console getClient dependency must be a function");
  }
}

export function createSearchConsoleHandler(dependencies) {
  validateDependencies(dependencies);
  const {
    requireAdmin,
    client,
    isJsonContentType,
    matchesRequestOrigin,
    parseKnowledgeSearchRateLimit,
  } = dependencies;

  return async function handleSearchConsole(request) {
    let access;
    try {
      access = await requireAdmin();
    } catch {
      return jsonResponse({ error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی ممکن نیست." } }, 503);
    }

    if (!access?.configured) {
      return jsonResponse({ error: { code: "SERVICE_UNAVAILABLE", message: "سرویس احراز هویت در دسترس نیست." } }, 503);
    }
    if (access.authenticationAvailable === false) {
      return jsonResponse({ error: { code: "AUTH_UNAVAILABLE", message: "سرویس احراز هویت پاسخ‌گو نیست." } }, 503);
    }
    if (!access.user) {
      return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "برای دسترسی باید وارد شوید." } }, 401);
    }
    if (access.adminCheckAvailable === false) {
      return jsonResponse({ error: { code: "AUTHORIZATION_UNAVAILABLE", message: "بررسی سطح دسترسی ممکن نیست." } }, 503);
    }
    if (!access.isAdmin) {
      return jsonResponse({ error: { code: "FORBIDDEN", message: "دسترسی به داده‌های رشد مجاز نیست." } }, 403);
    }

    if (!dependencies.matchesRequestOrigin(request.headers.get("origin"), request.url)) {
      return jsonResponse({ error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } }, 403);
    }
    if (!dependencies.isJsonContentType(request.headers.get("content-type"))) {
      return jsonResponse({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "نوع محتوای درخواست باید JSON باشد." } }, 415);
    }
    let rateLimitResult;
    try {
      rateLimitResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
    } catch {
      rateLimitResult = { error: true };
    }

    let rateLimit;
    try { rateLimit = parseKnowledgeSearchRateLimit(rateLimitResult); } catch { rateLimit = { status: "unavailable" }; }
    if (rateLimit.status === "unavailable") {
      return jsonResponse({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست؛ درخواست متوقف شد." } }, 503);
    }
    if (rateLimit.status === "limited") {
      return jsonResponse(
        { error: { code: "RATE_LIMITED", message: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." } },
        429,
        { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) },
      );
    }

    let payload;
    try {
      payload = await readBoundedJson(request);
    } catch (error) {
      const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
      return jsonResponse({
        error: {
          code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
          message: tooLarge ? "حجم درخواست بیش از حد مجاز است." : "بدنه درخواست باید JSON معتبر باشد.",
        },
      }, tooLarge ? 413 : 400);
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        Object.keys(payload).some((key) => !ALLOWED_KEYS.has(key))) {
      return jsonResponse({ error: { code: "INVALID_REQUEST", message: "ساختار درخواست معتبر نیست." } }, 400);
    }
    if (!Array.isArray(payload.dimensions) || payload.dimensions.length < 1 || payload.dimensions.length > 4 ||
        !Number.isInteger(payload.rowLimit ?? 1000) || (payload.rowLimit ?? 1000) < 1 || (payload.rowLimit ?? 1000) > 5000 ||
        !Number.isInteger(payload.startRow ?? 0) || (payload.startRow ?? 0) < 0 || (payload.startRow ?? 0) > 50000) {
      return jsonResponse({ error: { code: "INVALID_REQUEST", message: "محدوده ابعاد یا صفحه‌بندی معتبر نیست." } }, 400);
    }

    let activeClient = client;
    try {
      if (typeof dependencies.getClient === "function") {
        activeClient = await dependencies.getClient(access, request);
      }
    } catch {
      return jsonResponse({ error: { code: "CONNECTION_UNAVAILABLE", message: "اتصال امن Search Console در دسترس نیست؛ وضعیت اتصال را بررسی کنید." } }, 503);
    }
    if (!activeClient || typeof activeClient.querySearchAnalytics !== "function") {
      return jsonResponse({ error: { code: "NOT_CONFIGURED", message: "ابتدا اتصال امن Google Search Console را برقرار کنید." } }, 503);
    }

    try {
      const result = await activeClient.querySearchAnalytics(payload);
      if (!result?.ok) {
        return jsonResponse({ error: { code: "INVALID_SEARCH_CONSOLE_REQUEST", reason: result?.reason || "invalid_request", message: "بازه یا ابعاد درخواست Search Console معتبر نیست." } }, 400);
      }
      return jsonResponse(result, 200);
    } catch {
      return jsonResponse({ error: { code: "SEARCH_CONSOLE_UNAVAILABLE", message: "دریافت داده از Search Console انجام نشد؛ اطلاعات حساس ثبت یا نمایش داده نشد." } }, 502);
    }
  };
}
