import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { searchMavisKnowledge } from "../../../../lib/mavis/knowledge-registry";
import { buildLegalResearchDossier } from "../../../../lib/mavis/legal-research-dossier.mjs";
import { isJsonContentType, matchesRequestOrigin } from "../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 4096;

async function readBoundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
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

function respond(code, message, status, extra = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: NO_STORE });
}

export async function POST(request) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return respond("AUTH_UNAVAILABLE", "بررسی دسترسی در حال حاضر ممکن نیست.", 503);
  }

  if (!access.configured || access.authenticationAvailable === false || access.adminCheckAvailable === false) {
    return respond("AUTHORIZATION_UNAVAILABLE", "سرویس احراز هویت یا بررسی دسترسی در دسترس نیست.", 503);
  }
  if (!access.user) return respond("UNAUTHENTICATED", "برای دسترسی باید وارد شوید.", 401);
  if (!access.isAdmin) return respond("FORBIDDEN", "دسترسی به پرونده پژوهشی داخلی مجاز نیست.", 403);

  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return respond("ORIGIN_REJECTED", "مبدأ درخواست مجاز نیست.", 403);
  }

  let rateLimitResult;
  try {
    rateLimitResult = await access.supabase.rpc("consume_mavis_knowledge_search_limit");
  } catch {
    rateLimitResult = { error: true };
  }
  const rateLimit = parseKnowledgeSearchRateLimit(rateLimitResult);
  if (rateLimit.status === "unavailable") return respond("RATE_LIMIT_UNAVAILABLE", "کنترل ظرفیت سرویس در دسترس نیست.", 503);
  if (rateLimit.status === "limited") {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "ظرفیت پژوهش موقتاً تکمیل شده است." } },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return respond("UNSUPPORTED_MEDIA_TYPE", "نوع درخواست باید JSON باشد.", 415);
  }

  let payload;
  try {
    payload = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error?.code === "PAYLOAD_TOO_LARGE";
    return respond(tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", tooLarge ? "حجم درخواست بیش از حد مجاز است." : "بدنه درخواست باید JSON معتبر باشد.", tooLarge ? 413 : 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => !["query", "limit"].includes(key))) {
    return respond("INVALID_REQUEST", "ساختار درخواست معتبر نیست.", 400);
  }
  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  const limit = payload.limit === undefined ? 10 : payload.limit;
  if (query.length < 2 || query.length > 120) return respond("INVALID_QUERY", "عبارت پژوهش باید بین ۲ تا ۱۲۰ نویسه باشد.", 400);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) return respond("INVALID_LIMIT", "تعداد مدخل‌ها باید عدد صحیح بین ۱ تا ۱۰ باشد.", 400);

  try {
    const results = searchMavisKnowledge(query, limit);
    const dossier = buildLegalResearchDossier({ query, results });
    return NextResponse.json(dossier, { status: 200, headers: NO_STORE });
  } catch {
    return respond("DOSSIER_FAILED", "ساخت بسته شواهد پژوهش انجام نشد.", 500);
  }
}
