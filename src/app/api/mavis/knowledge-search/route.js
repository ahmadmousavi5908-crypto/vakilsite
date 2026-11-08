import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { searchMavisKnowledge } from "../../../../lib/mavis/knowledge-registry";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 4096;

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
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return NextResponse.json(
      { error: { code: "AUTH_UNAVAILABLE", message: "بررسی دسترسی در حال حاضر ممکن نیست." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!access.configured) {
    return NextResponse.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "سرویس احراز هویت در دسترس نیست." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!access.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "برای دسترسی باید وارد شوید." } },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  if (access.adminCheckAvailable === false) {
    return NextResponse.json(
      { error: { code: "AUTHORIZATION_UNAVAILABLE", message: "بررسی سطح دسترسی در حال حاضر ممکن نیست." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!access.isAdmin) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "دسترسی به پژوهش داخلی مجاز نیست." } },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const origin = request.headers.get("origin");

  if (!matchesRequestOrigin(origin, request.url)) {
    return NextResponse.json(
      { error: { code: "ORIGIN_REJECTED", message: "مبدأ درخواست مجاز نیست." } },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "نوع محتوای درخواست باید JSON باشد." } },
      { status: 415, headers: NO_STORE_HEADERS },
    );
  }

  let payload;
  try {
    payload = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
    return NextResponse.json(
      {
        error: {
          code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
          message: tooLarge ? "حجم درخواست بیش از حد مجاز است." : "بدنه درخواست باید JSON معتبر باشد.",
        },
      },
      { status: tooLarge ? 413 : 400, headers: NO_STORE_HEADERS },
    );
  }

  const query = typeof payload?.query === "string" ? payload.query.trim() : "";
  const limit = payload?.limit === undefined ? 10 : payload.limit;

  if (query.length < 2 || query.length > 120) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "عبارت جست‌وجو باید بین ۲ تا ۱۲۰ نویسه باشد." } },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    return NextResponse.json(
      { error: { code: "INVALID_LIMIT", message: "تعداد نتایج باید عدد صحیح بین ۱ تا ۲۰ باشد." } },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let rateLimitResult;
  try {
    rateLimitResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
  } catch {
    rateLimitResult = { error: true };
  }

  const rateLimit = parseKnowledgeSearchRateLimit(rateLimitResult);
  if (rateLimit.status === "unavailable") {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT_UNAVAILABLE", message: "کنترل ظرفیت سرویس در دسترس نیست؛ جست‌وجو موقتاً متوقف شد." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (rateLimit.status === "limited") {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "تعداد درخواست‌های جست‌وجو بیش از حد مجاز است. کمی بعد دوباره تلاش کنید." } },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const results = searchMavisKnowledge(query, limit).map((record) => ({
      id: record.id,
      record_type: record.record_type,
      title: record.title,
      canonical: record.canonical,
      article_number: record.article_number,
      law_id: record.law_id,
      definition: record.definition,
      summary: record.summary,
      review_status: record.review_status,
      status: record.status,
      source_url: record.source_url,
      sources: record.sources,
      notes: record.notes,
      path: record.path,
      search_score: record.search_score,
      matched_field: record.matched_field,
    }));

    return NextResponse.json(
      {
        query,
        count: results.length,
        results,
        notice: "این خروجی فقط بازیابی از کتابخانه موجود است؛ نظر حقوقی، بررسی اعتبار روز قانون یا تحلیل پرونده محسوب نمی‌شود.",
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "SEARCH_FAILED", message: "جست‌وجوی داخلی انجام نشد." } },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
