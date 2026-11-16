const NO_STORE_HEADERS = Object.freeze({ "Cache-Control": "no-store" });
const MAX_BODY_BYTES = 2048;

function jsonResponse(body, status) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

async function readPayload(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      try { await reader.cancel(); } catch { /* Best-effort cancellation. */ }
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

export function createSearchConsoleToolsHandler(dependencies) {
  const required = ["requireAdmin", "isJsonContentType", "matchesRequestOrigin", "parseKnowledgeSearchRateLimit"];
  for (const key of required) {
    if (typeof dependencies?.[key] !== "function") throw new TypeError("Search Console tools handler requires " + key);
  }
  if (typeof dependencies.getClient !== "function") throw new TypeError("Search Console tools handler requires getClient");

  return async function handle(request) {
    let access;
    try { access = await dependencies.requireAdmin(); } catch {
      return jsonResponse({ error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی ممکن نیست." } }, 503);
    }
    if (!access?.configured) return jsonResponse({ error: { code: "SERVICE_UNAVAILABLE", message: "سرویس احراز هویت در دسترس نیست." } }, 503);
    if (!access.user) return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "برای دسترسی باید وارد شوید." } }, 401);
    if (!access.isAdmin) return jsonResponse({ error: { code: "FORBIDDEN", message: "دسترسی مدیر لازم است." } }, 403);
    if (!dependencies.matchesRequestOrigin(request.headers.get("origin"), request.url)) {
      return jsonResponse({ error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } }, 403);
    }
    if (!dependencies.isJsonContentType(request.headers.get("content-type"))) {
      return jsonResponse({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "نوع محتوای درخواست باید JSON باشد." } }, 415);
    }

    let rateLimitResult;
    try { rateLimitResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit"); } catch {
      rateLimitResult = { error: true };
    }
    let rateLimit;
    try { rateLimit = dependencies.parseKnowledgeSearchRateLimit(rateLimitResult); } catch {
      rateLimit = { status: "unavailable" };
    }
    if (rateLimit.status === "unavailable") return jsonResponse({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست." } }, 503);
    if (rateLimit.status === "limited") return jsonResponse({ error: { code: "RATE_LIMITED", message: "تعداد درخواست‌ها بیش از حد مجاز است." } }, 429);

    let payload;
    try { payload = await readPayload(request); } catch (error) {
      const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
      return jsonResponse({ error: { code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", message: tooLarge ? "حجم درخواست بیش از حد مجاز است." : "بدنه درخواست معتبر نیست." } }, tooLarge ? 413 : 400);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return jsonResponse({ error: { code: "INVALID_REQUEST", message: "ساختار درخواست معتبر نیست." } }, 400);
    }

    let client;
    try { client = await dependencies.getClient(access, request); } catch {
      return jsonResponse({ error: { code: "CONNECTION_UNAVAILABLE", message: "اتصال امن Search Console در دسترس نیست." } }, 503);
    }
    if (!client) return jsonResponse({ error: { code: "NOT_CONFIGURED", message: "ابتدا Google Search Console را متصل کنید." } }, 503);

    try {
      if (payload.action === "inspect" && Object.keys(payload).every((key) => ["action", "url"].includes(key)) &&
          typeof payload.url === "string" && payload.url.length <= 2048 &&
          typeof client.inspectUrl === "function") {
        const result = await client.inspectUrl(payload.url);
        return jsonResponse({ ok: true, result }, 200);
      }
      if (payload.action === "sitemaps" && Object.keys(payload).length === 1 &&
          typeof client.listSitemaps === "function") {
        const result = await client.listSitemaps();
        return jsonResponse({ ok: true, result }, 200);
      }
      return jsonResponse({ error: { code: "INVALID_REQUEST", message: "درخواست بررسی نشانی یا نقشه سایت معتبر نیست." } }, 400);
    } catch {
      return jsonResponse({ error: { code: "SEARCH_CONSOLE_UNAVAILABLE", message: "دریافت اطلاعات از Google Search Console انجام نشد." } }, 502);
    }
  };
}
