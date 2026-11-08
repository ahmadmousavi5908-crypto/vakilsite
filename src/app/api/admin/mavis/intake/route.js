import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/supabase/admin";
import { createServiceClient } from "../../../../../lib/supabase/service";
import { parseKnowledgeSearchRateLimit } from "../../../../../lib/mavis/rate-limit.mjs";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../../../../lib/mavis/request-guards.mjs";
import {
  parseAdminIntakeListParams,
  parseAdminIntakeListResult,
  parseAdminIntakeStatusUpdate,
  parseAdminIntakeUpdateResult,
} from "../../../../../lib/mavis/intake-admin.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const MAX_BODY_BYTES = 2048;

function errorResponse(code, message, status, extraHeaders = {}) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } },
  );
}

async function authorizeAdmin(request, requireOrigin) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { response: errorResponse("AUTH_UNAVAILABLE", "بررسی دسترسی در دسترس نیست.", 503) };
  }

  if (!access.configured || access.authenticationAvailable === false || access.adminCheckAvailable === false) {
    return { response: errorResponse("AUTH_UNAVAILABLE", "سرویس احراز هویت یا مجوزدهی در دسترس نیست.", 503) };
  }
  if (!access.user) {
    return { response: errorResponse("UNAUTHENTICATED", "برای دسترسی باید وارد شوید.", 401) };
  }
  if (!access.isAdmin) {
    return { response: errorResponse("FORBIDDEN", "دسترسی مدیر لازم است.", 403) };
  }
  if (typeof access.user.sub !== "string") {
    return { response: errorResponse("INVALID_ADMIN_IDENTITY", "شناسه مدیر معتبر نیست.", 403) };
  }
  if (requireOrigin && !matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return { response: errorResponse("ORIGIN_REJECTED", "مبدأ درخواست مجاز نیست.", 403) };
  }

  let limitResult;
  try {
    limitResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
  } catch {
    limitResult = { error: true };
  }
  const limit = parseKnowledgeSearchRateLimit(limitResult);
  if (limit.status === "unavailable") {
    return { response: errorResponse("RATE_LIMIT_UNAVAILABLE", "کنترل ظرفیت سرویس در دسترس نیست.", 503) };
  }
  if (limit.status === "limited") {
    return {
      response: errorResponse(
        "RATE_LIMITED",
        "تعداد درخواست‌های مدیریتی بیش از حد مجاز است.",
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      ),
    };
  }

  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch {
    return { response: errorResponse("DATABASE_UNAVAILABLE", "سرویس داده‌های محرمانه در دسترس نیست.", 503) };
  }

  return { access, serviceClient };
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

export async function GET(request) {
  const authorized = await authorizeAdmin(request, false);
  if (authorized.response) return authorized.response;

  const params = parseAdminIntakeListParams(request.url);
  if (!params.ok) {
    return errorResponse("INVALID_QUERY", "فیلتر یا صفحه‌بندی درخواست معتبر نیست.", 400);
  }

  let result;
  try {
    result = await authorized.serviceClient.rpc("list_mavis_public_intake_submissions", {
      p_actor_user_id: authorized.access.user.sub,
      p_status: params.value.status,
      p_limit: params.value.limit,
      p_offset: params.value.offset,
    });
  } catch {
    result = { error: true };
  }

  const parsed = parseAdminIntakeListResult(result);
  if (parsed.status !== "ok") {
    return errorResponse("INTAKE_LIST_UNAVAILABLE", "فهرست درخواست‌ها در دسترس نیست.", 503);
  }

  return NextResponse.json(
    { items: parsed.items, count: parsed.items.length, limit: params.value.limit, offset: params.value.offset },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

export async function PATCH(request) {
  const authorized = await authorizeAdmin(request, true);
  if (authorized.response) return authorized.response;

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

  const update = parseAdminIntakeStatusUpdate(payload);
  if (!update.ok) {
    return errorResponse("INVALID_STATUS_UPDATE", "شناسه درخواست یا وضعیت جدید معتبر نیست.", 400);
  }

  let result;
  try {
    result = await authorized.serviceClient.rpc("update_mavis_public_intake_status", {
      p_actor_user_id: authorized.access.user.sub,
      p_submission_id: update.value.submissionId,
      p_status: update.value.status,
    });
  } catch {
    result = { error: true };
  }

  const parsed = parseAdminIntakeUpdateResult(result);
  if (parsed.status === "unavailable") {
    return errorResponse("INTAKE_UPDATE_UNAVAILABLE", "تغییر وضعیت درخواست انجام نشد.", 503);
  }
  if (parsed.status === "not_found") {
    return errorResponse("INTAKE_NOT_FOUND", "درخواست موردنظر پیدا نشد.", 404);
  }

  return NextResponse.json(
    { updated: true, submissionId: update.value.submissionId, status: update.value.status },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
