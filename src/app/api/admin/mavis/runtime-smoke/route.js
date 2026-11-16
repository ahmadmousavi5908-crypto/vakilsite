import { requireAdmin } from "../../../../../lib/supabase/admin";
import { generateMavisEditorialSuggestions } from "../../../../../lib/mavis/editorial-ai.mjs";
import { isJsonContentType, matchesRequestOrigin } from "../../../../../lib/mavis/request-guards.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  let env;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    env = getCloudflareContext().env;
  } catch {
    return Response.json({ error: { code: "WORKER_CONTEXT_UNAVAILABLE" } }, { status: 503 });
  }

  if (env?.MAVIS_STAGING_DIAGNOSTICS_ENABLED !== "true") {
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return Response.json({ error: { code: "AUTH_UNAVAILABLE" } }, { status: 503 });
  }
  if (!access?.configured) return Response.json({ error: { code: "AUTH_UNAVAILABLE" } }, { status: 503 });
  if (!access?.user) return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  if (!access?.isAdmin || !access?.supabase) {
    return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }
  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return Response.json({ error: { code: "ORIGIN_REJECTED" } }, { status: 403 });
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return Response.json({ error: { code: "UNSUPPORTED_MEDIA_TYPE" } }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1024) {
    return Response.json({ error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 0) {
      return Response.json({ error: { code: "INVALID_REQUEST" } }, { status: 400 });
    }
  } catch {
    return Response.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  if (typeof env?.AI?.run !== "function") {
    return Response.json({ error: { code: "WORKERS_AI_BINDING_UNAVAILABLE" } }, { status: 503 });
  }

  let limit;
  try {
    const result = await access.supabase.rpc("consume_mavis_editorial_ai_limit");
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (result.error || typeof row?.allowed !== "boolean") {
      return Response.json({ error: { code: "RATE_LIMIT_UNAVAILABLE" } }, { status: 503 });
    }
    if (!row.allowed) {
      return Response.json({ error: { code: "RATE_LIMITED" } }, {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(row.retry_after_seconds || 60) }
      });
    }
    limit = row;
  } catch {
    return Response.json({ error: { code: "RATE_LIMIT_UNAVAILABLE" } }, { status: 503 });
  }

  const model = env.MAVIS_WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const result = await generateMavisEditorialSuggestions({
    topic: "MAVIS Staging runtime integration smoke test",
    title: "آزمون اتصال دستیار تحریریه ماویس",
    category: "آزمون فنی",
    excerpt: "آزمون کوتاه اتصال مدل در محیط آزمایشی، بدون ذخیره یا انتشار محتوا.",
    intro: "یک طرح آموزشی عمومی درباره اهمیت بررسی و استناد به منابع معتبر حقوقی تهیه کن.",
    sections: [
      { heading: "اعتبارسنجی منبع", body: "تفاوت منبع اولیه و ثانویه را به‌صورت عمومی توضیح بده و هیچ قانون یا شماره ماده‌ای ذکر نکن." },
      { heading: "بازبینی انسانی", body: "توضیح بده چرا هر پیش‌نویس حقوقی باید پیش از انتشار توسط وکیل بررسی شود." }
    ],
    sources: []
  }, { ai: env.AI, model });

  if (!result.ok) {
    return Response.json({ error: { code: result.code || "WORKERS_AI_FAILED" } }, { status: 502 });
  }

  return Response.json({
    ok: true,
    provider: result.provider,
    model: result.model,
    outputValidated: true,
    evidenceGapsCount: result.suggestions.evidenceGaps.length,
    remainingRequests: Number.isInteger(limit.remaining) ? limit.remaining : null
  }, { headers: { "Cache-Control": "no-store" } });
}
