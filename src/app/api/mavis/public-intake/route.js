import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { isJsonContentType, matchesRequestOrigin } from "../../../../lib/mavis/request-guards.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 8192;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = new Set([
  "idempotency_key", "contact_name", "contact_phone", "contact_email",
  "preferred_contact_method", "city", "legal_area", "matter_summary",
  "privacy_notice_accepted", "contact_consent", "third_party_consent", "marketing_consent",
]);

function respond(code, message, status, extra = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: NO_STORE });
}

async function readBoundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      const error = new Error("Payload too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function normalizePhone(value) {
  return String(value ?? "").replace(/[\s()\-]/g, "");
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "بدنه درخواست معتبر نیست.";
  if (Object.keys(payload).some((key) => !ALLOWED_FIELDS.has(key))) return "فیلد اضافی در درخواست وجود دارد.";
  if (!UUID_PATTERN.test(payload.idempotency_key || "")) return "شناسه درخواست معتبر نیست.";
  if (typeof payload.contact_name !== "string" || payload.contact_name.trim().length < 2 || payload.contact_name.trim().length > 100) return "نام باید بین ۲ تا ۱۰۰ نویسه باشد.";
  if (!/^\+?[0-9]{8,18}$/.test(normalizePhone(payload.contact_phone))) return "شماره تماس معتبر نیست.";
  if (payload.contact_email && (typeof payload.contact_email !== "string" || payload.contact_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email.trim()))) return "نشانی ایمیل معتبر نیست.";
  if (!["phone", "email"].includes(payload.preferred_contact_method)) return "روش تماس انتخاب‌شده معتبر نیست.";
  if (payload.preferred_contact_method === "email" && !payload.contact_email) return "برای تماس از طریق ایمیل، ایمیل الزامی است.";
  if (typeof payload.city !== "string" || payload.city.trim().length < 2 || payload.city.trim().length > 80) return "شهر باید بین ۲ تا ۸۰ نویسه باشد.";
  if (typeof payload.legal_area !== "string" || payload.legal_area.trim().length < 2 || payload.legal_area.trim().length > 100) return "موضوع حقوقی را مشخص کنید.";
  if (typeof payload.matter_summary !== "string" || payload.matter_summary.trim().length < 20 || payload.matter_summary.trim().length > 4000) return "شرح کوتاه باید بین ۲۰ تا ۴۰۰۰ نویسه باشد.";
  if (payload.privacy_notice_accepted !== true || payload.contact_consent !== true) return "تأیید اطلاعیه حریم خصوصی و رضایت تماس الزامی است.";
  for (const field of ["third_party_consent", "marketing_consent"]) {
    if (payload[field] !== undefined && typeof payload[field] !== "boolean") return "مقدار رضایت اختیاری معتبر نیست.";
  }
  return null;
}

export async function POST(request) {
  if (process.env.MAVIS_INTAKE_ENABLED !== "true") {
    return respond("INTAKE_DISABLED", "ثبت درخواست در حال حاضر فعال نشده است.", 503);
  }

  const secret = process.env.MAVIS_INTAKE_RATE_LIMIT_SECRET;
  const noticeVersion = process.env.MAVIS_INTAKE_PRIVACY_NOTICE_VERSION;
  const retentionDays = Number(process.env.MAVIS_INTAKE_RETENTION_DAYS);
  if (typeof secret !== "string" || secret.length < 32 || !noticeVersion || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return respond("INTAKE_NOT_CONFIGURED", "تنظیمات امنیتی و سیاست نگهداری اطلاعات کامل نیست.", 503);
  }
  if (process.env.MAVIS_INTAKE_TRUSTED_PROXY_HEADERS !== "true") {
    return respond("TRUSTED_PROXY_REQUIRED", "پیکربندی امن نشانی مبدأ درخواست تکمیل نشده است.", 503);
  }

  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return respond("ORIGIN_REJECTED", "مبدأ درخواست مجاز نیست.", 403);
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return respond("UNSUPPORTED_MEDIA_TYPE", "نوع درخواست باید JSON باشد.", 415);
  }

  let payload;
  try {
    payload = await readBoundedJson(request);
  } catch (error) {
    return error?.code === "PAYLOAD_TOO_LARGE"
      ? respond("PAYLOAD_TOO_LARGE", "حجم درخواست بیش از حد مجاز است.", 413)
      : respond("INVALID_JSON", "بدنه درخواست باید JSON معتبر باشد.", 400);
  }

  const validationError = validatePayload(payload);
  if (validationError) return respond("INVALID_REQUEST", validationError, 400);

  const clientIp = request.headers.get("x-real-ip")?.trim() || "";
  if (!clientIp || !isIP(clientIp)) {
    return respond("CLIENT_IP_UNAVAILABLE", "نشانی امن مبدأ درخواست قابل تشخیص نیست.", 503);
  }

  const normalizedPhone = normalizePhone(payload.contact_phone);
  const rateKey = createHmac("sha256", secret).update(normalizedPhone + "\n" + clientIp).digest("hex");
  const submission = { ...payload };
  delete submission.idempotency_key;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return respond("DATABASE_UNAVAILABLE", "اتصال امن به سامانه ثبت درخواست در دسترس نیست.", 503);
  }

  let result;
  try {
    result = await supabase.rpc("submit_mavis_public_intake", {
      p_payload: submission,
      p_rate_key_hmac: rateKey,
      p_idempotency_key: payload.idempotency_key,
      p_privacy_notice_version: noticeVersion,
      p_retention_days: retentionDays,
    });
  } catch {
    return respond("INTAKE_UNAVAILABLE", "ثبت درخواست در حال حاضر ممکن نیست. اطلاعات شما ثبت‌شده محسوب نمی‌شود.", 503);
  }

  if (result.error) return respond("INTAKE_UNAVAILABLE", "ثبت درخواست در پایگاه داده تأیید نشد؛ اطلاعات شما ثبت‌شده محسوب نمی‌شود.", 503);
  const data = result.data;
  if (!data || typeof data !== "object" || typeof data.ok !== "boolean") {
    return respond("INTAKE_UNAVAILABLE", "پاسخ سامانه ثبت درخواست معتبر نیست.", 503);
  }
  if (!data.ok) {
    if (data.code === "rate_limited") {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." } },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(Math.max(1, Math.min(900, Number(data.retry_after_seconds) || 60))) } },
      );
    }
    return respond(data.code || "INVALID_REQUEST", "اطلاعات درخواست با الزامات ثبت سازگار نیست.", 400);
  }
  if (!UUID_PATTERN.test(data.reference_code || "")) {
    return respond("INTAKE_UNAVAILABLE", "شناسه پیگیری معتبر دریافت نشد؛ ثبت درخواست تأیید نشده است.", 503);
  }

  return NextResponse.json(
    { ok: true, reference_code: data.reference_code, duplicate: data.duplicate === true, message: "درخواست شما در سامانه ثبت شد. شناسه پیگیری را نگهداری کنید." },
    { status: 201, headers: NO_STORE },
  );
}
