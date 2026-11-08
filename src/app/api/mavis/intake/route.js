import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/service";
import { triageLegalIntake } from "../../../../lib/mavis/legal-intake-triage.mjs";
import { validatePublicIntake } from "../../../../lib/mavis/public-intake-validation.mjs";
import {
  createIntakeRateLimitHash,
  getTrustedClientIp,
  hasOnlyAllowedIntakeFields,
  parseIntakeRateLimit,
  parseIntakeRetentionDays,
} from "../../../../lib/mavis/intake-request.mjs";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../../../lib/mavis/request-guards.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const MAX_BODY_BYTES = 8192;

function errorResponse(code, message, status, extraHeaders = {}) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } },
  );
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
      await reader.cancel();
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

export async function POST(request) {
  if (process.env.MAVIS_INTAKE_ENABLED !== "true") {
    return errorResponse("INTAKE_DISABLED", "ثبت درخواست آنلاین در حال حاضر فعال نیست.", 503);
  }

  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return errorResponse("ORIGIN_REJECTED", "مبدأ درخواست مجاز نیست.", 403);
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return errorResponse("UNSUPPORTED_MEDIA_TYPE", "نوع محتوای درخواست باید JSON باشد.", 415);
  }

  let payload;
  try {
    payload = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
    return errorResponse(
      tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
      tooLarge ? "حجم درخواست بیش از حد مجاز است." : "بدنه درخواست باید JSON معتبر باشد.",
      tooLarge ? 413 : 400,
    );
  }

  if (!hasOnlyAllowedIntakeFields(payload)) {
    return errorResponse("INVALID_FIELDS", "ساختار یا فیلدهای درخواست معتبر نیست.", 400);
  }

  const validation = validatePublicIntake(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "برخی اطلاعات لازم یا معتبر نیستند.", fields: validation.errors } },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const triage = triageLegalIntake(validation.value.summary);
  if (!triage.ok) {
    return errorResponse("TRIAGE_FAILED", "شرح درخواست برای اولویت‌بندی اولیه کافی نیست.", 400);
  }

  const retentionDays = parseIntakeRetentionDays(process.env.MAVIS_INTAKE_RETENTION_DAYS);
  const consentVersion = process.env.MAVIS_INTAKE_CONSENT_VERSION;
  const rateLimitSecret = process.env.MAVIS_INTAKE_RATE_LIMIT_SECRET;
  const trustedIp = getTrustedClientIp(request.headers, process.env.MAVIS_TRUST_X_REAL_IP === "true");
  const keyHash = createIntakeRateLimitHash(trustedIp, rateLimitSecret);

  if (!retentionDays || typeof consentVersion !== "string" ||
      consentVersion.trim().length < 1 || consentVersion.length > 40 ||
      !keyHash) {
    return errorResponse("INTAKE_NOT_CONFIGURED", "تنظیمات امن ثبت درخواست کامل نیست.", 503);
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return errorResponse("DATABASE_UNAVAILABLE", "سرویس ثبت درخواست در دسترس نیست.", 503);
  }

  let rateLimitResult;
  try {
    rateLimitResult = await supabase.rpc("consume_mavis_public_intake_rate_limit", {
      p_key_hash: keyHash,
    });
  } catch {
    rateLimitResult = { error: true };
  }

  const rateLimit = parseIntakeRateLimit(rateLimitResult);
  if (rateLimit.status === "unavailable") {
    return errorResponse("RATE_LIMIT_UNAVAILABLE", "کنترل ظرفیت ثبت درخواست در دسترس نیست.", 503);
  }
  if (rateLimit.status === "limited") {
    return errorResponse(
      "RATE_LIMITED",
      "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  const databasePayload = {
    fullName: validation.value.fullName,
    phone: validation.value.phone,
    caseType: validation.value.caseType,
    summary: validation.value.summary,
    urgency: validation.value.urgency,
    opposingParty: validation.value.opposingParty || "",
    consent: true,
    marketingConsent: validation.value.marketingConsent,
    thirdPartyDataNoticeAcknowledged: validation.value.thirdPartyDataNoticeAcknowledged,
  };

  let submissionResult;
  try {
    submissionResult = await supabase.rpc("submit_mavis_public_intake", {
      p_payload: databasePayload,
      p_review_priority: triage.reviewPriority,
      p_detected_signals: triage.detectedSignals,
      p_requires_deadline_check: triage.requiresDeadlineCheck,
      p_retention_expires_at: new Date(Date.now() + retentionDays * 86400000).toISOString(),
      p_consent_version: consentVersion.trim(),
    });
  } catch {
    submissionResult = { error: true };
  }

  const receipt = Array.isArray(submissionResult?.data) && submissionResult.data.length === 1
    ? submissionResult.data[0]
    : null;

  if (submissionResult?.error || !receipt ||
      typeof receipt.tracking_code !== "string" ||
      !/^[0-9a-f]{32}$/.test(receipt.tracking_code)) {
    return errorResponse("SUBMISSION_UNAVAILABLE", "ثبت درخواست انجام نشد؛ اطلاعات شما ثبت‌شده تلقی نمی‌شود.", 503);
  }

  return NextResponse.json(
    {
      received: true,
      trackingCode: receipt.tracking_code,
      receivedAt: receipt.created_at,
      notice: "درخواست اولیه ثبت و برای بررسی انسانی در صف قرار گرفت. این رسید به معنی پذیرش وکالت، بررسی تعارض منافع یا ارائه نظر حقوقی نیست.",
    },
    { status: 202, headers: NO_STORE_HEADERS },
  );
}
