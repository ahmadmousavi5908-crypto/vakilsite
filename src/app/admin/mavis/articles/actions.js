"use server";

import { requireAdmin } from "../../../../lib/supabase/admin";
import { parseMavisArticleDraftInput } from "../../../../lib/mavis/article-draft-input.mjs";

export async function saveMavisArticleDraft(formData) {
  const parsed = parseMavisArticleDraftInput(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای ذخیره پیش‌نویس، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc("save_mavis_article_draft", {
      p_payload: parsed.payload,
      p_article_id: parsed.articleId,
      p_expected_version: parsed.expectedVersion,
      p_change_note: parsed.articleId ? "Administrator draft edit" : "Initial editorial draft",
    });

    if (error?.code === "23505") return { ok: false, error: "این نامک قبلاً استفاده شده است. نامک دیگری انتخاب کنید." };
    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله تغییر کرده است. صفحه را تازه‌سازی کنید و تغییرات جدید را دوباره اعمال کنید." };
    if (error?.code === "P0002") return { ok: false, error: "پیش‌نویس پیدا نشد یا دیگر در دسترس نیست." };
    if (error?.code === "55000") return { ok: false, error: "این مقاله دیگر در وضعیت قابل ویرایش نیست." };
    if (error?.code === "42883" || error?.code === "PGRST202") {
      return { ok: false, error: "زیرساخت ذخیره پیش‌نویس هنوز روی این پایگاه داده فعال نشده است." };
    }
    if (error) return { ok: false, error: "ذخیره پیش‌نویس انجام نشد. ورودی‌ها و اتصال پایگاه داده را بررسی کنید." };
    if (typeof data !== "string" || !data) return { ok: false, error: "پاسخ پایگاه داده معتبر نبود." };

    return { ok: true, articleId: data };
  } catch {
    return { ok: false, error: "ارتباط امن با پایگاه داده برقرار نشد." };
  }
}


export async function searchMavisEditorialSources(rawQuery) {
  const query = typeof rawQuery === "string" ? rawQuery.trim().replace(/\s+/g, " ") : "";
  if (query.length < 2 || query.length > 160) {
    return { ok: false, error: "عبارت جست‌وجو باید بین ۲ تا ۱۶۰ نویسه باشد." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای جست‌وجوی منابع، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data: limitRows, error: limitError } = await access.supabase.rpc("consume_mavis_source_discovery_limit");
    if (limitError) {
      return { ok: false, error: "سرویس کنترل تعداد درخواست‌ها در دسترس نیست؛ برای حفظ امنیت، جست‌وجو متوقف شد." };
    }
    const limit = Array.isArray(limitRows) ? limitRows[0] : limitRows;
    if (!limit?.allowed) {
      return { ok: false, error: "تعداد جست‌وجوها به سقف مجاز رسیده است. کمی بعد دوباره تلاش کنید.", retryAfterSeconds: limit?.retry_after_seconds || 60 };
    }
  } catch {
    return { ok: false, error: "کنترل امنیتی جست‌وجو انجام نشد؛ درخواست اجرا نشد." };
  }

  const { createMavisSourceDiscoveryAdapters } = await import("../../../../lib/mavis/source-discovery-adapters.mjs");
  const adapters = createMavisSourceDiscoveryAdapters();
  const providers = [
    ["crossref", adapters.searchCrossref],
    ["semantic_scholar", adapters.searchSemanticScholar],
    ["openalex", adapters.searchOpenAlex],
  ];
  const results = [];
  const providerErrors = [];

  // Keep requests sequential to respect provider concurrency limits.
  for (const [provider, search] of providers) {
    try {
      const result = await search(query, 5);
      if (result.ok) results.push(...result.candidates);
      else providerErrors.push({ provider, error: result.error });
    } catch {
      providerErrors.push({ provider, error: "UPSTREAM_UNAVAILABLE" });
    }
  }

  return {
    ok: true,
    query,
    results: results.slice(0, 15),
    providerErrors,
    searchedAt: new Date().toISOString(),
  };
}


export async function importMavisSourceCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { ok: false, error: "اطلاعات منبع معتبر نیست." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای واردکردن منبع، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc("import_mavis_source_candidate", {
      p_candidate: candidate,
    });

    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر برای واردکردن منبع تأیید نشد." };
    if (error?.code === "22023") return { ok: false, error: "فراداده منبع معتبر نیست یا ساختار آن پشتیبانی نمی‌شود." };
    if (error?.code === "42883" || error?.code === "PGRST202") {
      return { ok: false, error: "قابلیت واردکردن منبع هنوز روی پایگاه داده فعال نشده است." };
    }
    if (error) return { ok: false, error: "ساخت پیش‌نویس انجام نشد. وضعیت پایگاه داده را بررسی کنید." };
    if (!data || typeof data.articleId !== "string" || typeof data.created !== "boolean") {
      return { ok: false, error: "پاسخ پایگاه داده برای واردکردن منبع معتبر نبود." };
    }

    return {
      ok: true,
      articleId: data.articleId,
      created: data.created,
    };
  } catch {
    return { ok: false, error: "ارتباط امن با پایگاه داده برقرار نشد." };
  }
}
