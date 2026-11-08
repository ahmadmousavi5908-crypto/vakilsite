import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = new Set([
  "idempotency_key", "contact_name", "contact_phone", "contact_email",
  "preferred_contact_method", "city", "legal_area", "matter_summary",
  "privacy_notice_accepted", "contact_consent", "third_party_consent", "marketing_consent",
]);

export function normalizeIntakePhone(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\s()\-]/g, "");
}
export function isValidIntakeIp(value) {
  return typeof value === "string" && isIP(value.trim()) !== 0;
}

export function createIntakeRateKey(secret, phone, ip) {
  if (typeof secret !== "string" || secret.length < 32 || !isValidIntakeIp(ip)) {
    throw new TypeError("Invalid intake rate-key configuration");
  }
  return createHmac("sha256", secret)
    .update(normalizeIntakePhone(phone) + "\n" + ip.trim())
    .digest("hex");
}

export function validateIntakePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { code: "INVALID_REQUEST", message: "بدنه درخواست معتبر نیست." };
  if (Object.keys(payload).some((key) => !ALLOWED_FIELDS.has(key))) return { code: "UNEXPECTED_FIELDS", message: "فیلد اضافی در درخواست وجود دارد." };
  if (!UUID_PATTERN.test(payload.idempotency_key || "")) return { code: "INVALID_IDEMPOTENCY_KEY", message: "شناسه درخواست معتبر نیست." };
  if (typeof payload.contact_name !== "string" || payload.contact_name.trim().length < 2 || payload.contact_name.trim().length > 100) return { code: "INVALID_NAME", message: "نام باید بین ۲ تا ۱۰۰ نویسه باشد." };
  if (typeof payload.contact_phone !== "string" || !/^\+?[0-9]{8,18}$/.test(normalizeIntakePhone(payload.contact_phone))) return { code: "INVALID_PHONE", message: "شماره تماس معتبر نیست." };
  if (payload.contact_email !== undefined && payload.contact_email !== null && typeof payload.contact_email !== "string") return { code: "INVALID_EMAIL", message: "نشانی ایمیل معتبر نیست." };
  if (payload.contact_email && (payload.contact_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email.trim()))) return { code: "INVALID_EMAIL", message: "نشانی ایمیل معتبر نیست." };
  if (!["phone", "email"].includes(payload.preferred_contact_method)) return { code: "INVALID_CONTACT_METHOD", message: "روش تماس انتخاب‌شده معتبر نیست." };
  if (payload.preferred_contact_method === "email" && !payload.contact_email) return { code: "EMAIL_REQUIRED", message: "برای تماس از طریق ایمیل، ایمیل الزامی است." };
  if (typeof payload.city !== "string" || payload.city.trim().length < 2 || payload.city.trim().length > 80) return { code: "INVALID_CITY", message: "شهر باید بین ۲ تا ۸۰ نویسه باشد." };
  if (typeof payload.legal_area !== "string" || payload.legal_area.trim().length < 2 || payload.legal_area.trim().length > 100) return { code: "INVALID_LEGAL_AREA", message: "موضوع حقوقی را مشخص کنید." };
  if (typeof payload.matter_summary !== "string" || payload.matter_summary.trim().length < 20 || payload.matter_summary.trim().length > 4000) return { code: "INVALID_SUMMARY", message: "شرح کوتاه باید بین ۲۰ تا ۴۰۰۰ نویسه باشد." };
  if (payload.privacy_notice_accepted !== true || payload.contact_consent !== true) return { code: "CONSENT_REQUIRED", message: "تأیید اطلاعیه حریم خصوصی و رضایت تماس الزامی است." };
  for (const field of ["third_party_consent", "marketing_consent"]) {
    if (payload[field] !== undefined && typeof payload[field] !== "boolean") return { code: "INVALID_OPTIONAL_CONSENT", message: "مقدار رضایت اختیاری معتبر نیست." };
  }
  return null;
}
