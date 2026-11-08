import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { searchMavisKnowledge } from "../../../../lib/mavis/knowledge-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request) {
  const access = await requireAdmin();

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

  if (!access.isAdmin) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "دسترسی به پژوهش داخلی مجاز نیست." } },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "بدنه درخواست باید JSON معتبر باشد." } },
      { status: 400, headers: NO_STORE_HEADERS },
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
