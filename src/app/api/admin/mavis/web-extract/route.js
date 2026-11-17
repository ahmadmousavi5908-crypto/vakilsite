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

async function readBoundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
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

export async function POST(request) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return json({ error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی مدیر ممکن نیست." } }, 503);
  }
  if (!access?.configured || access.authenticationAvailable === false || access.adminCheckAvailable === false) {
    return json({ error: { code: "AUTH_UNAVAILABLE", message: "احراز هویت و بررسی دسترسی در دسترس نیست." } }, 503);
  }
  if (!access.user) return json({ error: { code: "UNAUTHENTICATED", message: "ابتدا وارد پنل مدیریت شوید." } }, 401);
  if (!access.isAdmin) return json({ error: { code: "FORBIDDEN", message: "دسترسی مدیر لازم است." } }, 403);
  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return json({ error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } }, 403);
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "درخواست باید JSON باشد." } }, 415);
  }
  if (!extractClient) return json({ error: { code: "NOT_CONFIGURED", message: "کلید امن استخراج وب در این محیط تنظیم نشده است." } }, 503);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return json({ error: { code: "PAYLOAD_TOO_LARGE", message: "حجم درخواست بیش از حد مجاز است." } }, 413);
  let payload;
  try {
    payload = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
    return json({ error: { code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", message: tooLarge ? "حجم درخواست بیش از حد مجاز است." : "ساختار درخواست معتبر نیست." } }, tooLarge ? 413 : 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || Object.keys(payload).some((key) => key !== "url")) {
    return json({ error: { code: "INVALID_REQUEST", message: "ساختار درخواست معتبر نیست." } }, 400);
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";
  if (url.length > 2048) {
    return json({ error: { code: "INVALID_REQUEST", message: "نشانی منبع بیش از حد مجاز است." } }, 400);
  }
  try {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.username || target.password) throw new Error("Unsafe URL");
  } catch {
    return json({ error: { code: "INVALID_URL", message: "فقط نشانی HTTPS معتبر و بدون اطلاعات ورود پذیرفته می‌شود." } }, 400);
  }

  let rateResult;
  try {
    rateResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
  } catch {
    rateResult = { error: true };
  }
  const rate = parseKnowledgeSearchRateLimit(rateResult);
  if (rate.status === "unavailable") return json({ error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست." } }, 503);
  if (rate.status === "limited") {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "سهمیه استخراج وب موقتاً تکمیل شده است." } },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const result = await extractClient.extract({ url });
    if (!result?.ok) return json({ error: { code: "EXTRACTION_UNAVAILABLE", message: "متن قابل‌استخراجی از این صفحه دریافت نشد." } }, 422);
    return json(result, 200);
  } catch {
    return json({ error: { code: "PROVIDER_UNAVAILABLE", message: "سرویس استخراج وب در حال حاضر پاسخ‌گو نیست." } }, 502);
  }
}
