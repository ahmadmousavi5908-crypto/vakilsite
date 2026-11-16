import { requireAdmin } from "../../../../../lib/supabase/admin";
import { createGeneralWebSearchFromEnv } from "../../../../../lib/mavis/general-web-search.mjs";
import { isJsonContentType, matchesRequestOrigin } from "../../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const extractClient = createGeneralWebSearchFromEnv(process.env);

function json(body, status) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function POST(request) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return json({ error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی مدیر ممکن نیست." } }, 503);
  }

  if (!access?.configured) return json({ error: { code: "AUTH_UNAVAILABLE", message: "احراز هویت در دسترس نیست." } }, 503);
  if (!access.user) return json({ error: { code: "UNAUTHENTICATED", message: "ابتدا وارد پنل مدیریت شوید." } }, 401);
  if (!access.isAdmin) return json({ error: { code: "FORBIDDEN", message: "دسترسی مدیر لازم است." } }, 403);
  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return json({ error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } }, 403);
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "درخواست باید JSON باشد." } }, 415);
  }
  if (!extractClient) {
    return json({ error: { code: "NOT_CONFIGURED", message: "کلید امن سرویس استخراج وب تنظیم نشده است." } }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "حجم درخواست بیش از حد مجاز است." } }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: { code: "INVALID_JSON", message: "ساختار درخواست معتبر نیست." } }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || Object.keys(payload).some((key) => !["url", "query"].includes(key))) {
    return json({ error: { code: "INVALID_REQUEST", message: "ساختار درخواست معتبر نیست." } }, 400);
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  if (url.length > 2048 || query.length > 180) {
    return json({ error: { code: "INVALID_REQUEST", message: "نشانی یا عبارت جست‌وجو بیش از حد مجاز است." } }, 400);
  }

  let rateResult;
  try {
    rateResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
  } catch {
    rateResult = { error: true };
  }
  let rate;
  try {
    rate = parseKnowledgeSearchRateLimit(rateResult);
  } catch {
    rate = { status: "unavailable" };
  }
  if (rate?.status === "unavailable") {
    return json({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست؛ استخراج متوقف شد." } }, 503);
  }
  if (rate?.status === "limited") {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "سهمیه جست‌وجو موقتاً تکمیل شده است." } },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const result = await extractClient.extract({ url, query });
    if (!result?.ok) {
      return json({ error: { code: "EXTRACTION_UNAVAILABLE", message: "متن قابل‌استخراجی از این صفحه دریافت نشد." } }, 422);
    }
    return json(result, 200);
  } catch {
    return json({ error: { code: "PROVIDER_UNAVAILABLE", message: "سرویس استخراج وب در حال حاضر پاسخ‌گو نیست." } }, 502);
  }
}
