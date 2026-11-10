const NO_STORE_HEADERS = Object.freeze({ "Cache-Control": "no-store" });
const MAX_BODY_BYTES = 4096;

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
      try {
        await reader.cancel();
      } catch {
        // The payload is already rejected; cancellation is best-effort.
      }
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
  const required = [
    "requireAdmin",
    "retrieveMavisKnowledge",
    "isJsonContentType",
    "matchesRequestOrigin",
    "parseKnowledgeSearchRateLimit",
  ];

  for (const key of required) {
    if (typeof dependencies?.[key] !== "function") {
      throw new TypeError(`Knowledge search handler requires ${key}`);
    }
  }
}

/**
 * Creates a testable server-side request handler.
 * Privileged dependencies are injected only by the server route module.
 */
export function createKnowledgeSearchHandler(dependencies) {
  validateDependencies(dependencies);

  const {
    requireAdmin,
    retrieveMavisKnowledge,
    isJsonContentType,
    matchesRequestOrigin,
    parseKnowledgeSearchRateLimit,
  } = dependencies;

  return async function handleKnowledgeSearch(request) {
    let access;
    try {
      access = await requireAdmin();
    } catch {
      return jsonResponse(
        { error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی در حال حاضر ممکن نیست." } },
        503,
      );
    }

    if (!access?.configured) {
      return jsonResponse(
        { error: { code: "SERVICE_UNAVAILABLE", message: "سرویس احراز هویت در دسترس نیست." } },
        503,
      );
    }

    if (access.authenticationAvailable === false) {
      return jsonResponse(
        { error: { code: "AUTH_UNAVAILABLE", message: "سرویس احراز هویت در حال حاضر پاسخ‌گو نیست." } },
        503,
      );
    }

    if (!access.user) {
      return jsonResponse(
        { error: { code: "UNAUTHENTICATED", message: "برای دسترسی باید وارد شوید." } },
        401,
      );
    }

    if (access.adminCheckAvailable === false) {
      return jsonResponse(
        { error: { code: "AUTHORIZATION_UNAVAILABLE", message: "بررسی سطح دسترسی در حال حاضر ممکن نیست." } },
        503,
      );
    }

    if (!access.isAdmin) {
      return jsonResponse(
        { error: { code: "FORBIDDEN", message: "دسترسی به پژوهش داخلی مجاز نیست." } },
        403,
      );
    }

    const origin = request.headers.get("origin");
    if (!matchesRequestOrigin(origin, request.url)) {
      return jsonResponse(
        { error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } },
        403,
      );
    }

    let rateLimitResult;
    try {
      rateLimitResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
    } catch {
      rateLimitResult = { error: true };
    }

    let rateLimit;
    try {
      rateLimit = parseKnowledgeSearchRateLimit(rateLimitResult);
    } catch {
      rateLimit = { status: "unavailable" };
    }

    if (rateLimit.status === "unavailable") {
      return jsonResponse(
        { error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست؛ جست‌وجو موقتاً متوقف شد." } },
        503,
      );
    }

    if (rateLimit.status === "limited") {
      return jsonResponse(
        { error: { code: "RATE_LIMITED", message: "تعداد درخواست‌های جست‌وجو بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." } },
        429,
        {
          ...NO_STORE_HEADERS,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      );
    }

    if (!isJsonContentType(request.headers.get("content-type"))) {
      return jsonResponse(
        { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "نوع محتوای درخواست باید JSON باشد." } },
        415,
      );
    }

    let payload;
    try {
      payload = await readBoundedJson(request);
    } catch (error) {
      const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
      return jsonResponse(
        {
          error: {
            code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
            message: tooLarge ? "حجم درخواست بیش از حد مجاز است." : "بدنه درخواست باید JSON معتبر باشد.",
          },
        },
        tooLarge ? 413 : 400,
      );
    }

    const query = typeof payload?.query === "string" ? payload.query.trim() : "";
    const limit = payload?.limit === undefined ? 10 : payload.limit;

    if (query.length < 2 || query.length > 120) {
      return jsonResponse(
        { error: { code: "INVALID_QUERY", message: "عبارت جست‌وجو باید بین ۲ تا ۱۲۰ نویسه باشد." } },
        400,
      );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      return jsonResponse(
        { error: { code: "INVALID_LIMIT", message: "تعداد نتایج باید عدد صحیح بین ۱ تا ۲۰ باشد." } },
        400,
      );
    }

    try {
      return jsonResponse(retrieveMavisKnowledge(query, limit), 200);
    } catch {
      return jsonResponse(
        { error: { code: "SEARCH_FAILED", message: "جست‌وجوی داخلی انجام نشد." } },
        500,
      );
    }
  };
}
