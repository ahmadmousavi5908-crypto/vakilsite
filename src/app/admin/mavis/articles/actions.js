"use server";

import { requireAdmin } from "../../../../lib/supabase/admin";
import { articles as publicStaticArticles } from "../../../../data/articles";
import { parseMavisArticleDraftInput } from "../../../../lib/mavis/article-draft-input.mjs";

export async function saveMavisArticleDraft(formData) {
  const parsed = parseMavisArticleDraftInput(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (publicStaticArticles.some((article) => article.slug === parsed.payload.slug)) {
    return { ok: false, error: "این نامک متعلق به یکی از راهنماهای ثابت سایت است. برای مقاله جدید، نامک دیگری انتخاب کنید." };
  }

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


export async function submitMavisArticleForReview(articleId, expectedVersion) {
  if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)
    || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "شناسه یا نسخه مقاله معتبر نیست." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }
  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای ارسال مقاله به بازبینی، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc("submit_mavis_article_for_review", {
      p_article_id: articleId,
      p_expected_version: expectedVersion,
    });
    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله تغییر کرده است. صفحه را تازه‌سازی و نسخه جدید را بررسی کنید." };
    if (error?.code === "55000") return { ok: false, error: "این مقاله در وضعیت قابل ارسال برای بازبینی نیست." };
    if (error?.code === "P0002") return { ok: false, error: "مقاله پیدا نشد." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "گردش‌کار بازبینی هنوز روی پایگاه داده فعال نشده است." };
    if (error) return { ok: false, error: "ارسال مقاله برای بازبینی انجام نشد." };
    if (!data || data.status !== "in_review" || data.articleVersion !== expectedVersion) {
      return { ok: false, error: "پاسخ پایگاه داده برای ارسال بازبینی معتبر نبود." };
    }
    return { ok: true, articleId, articleVersion: expectedVersion };
  } catch {
    return { ok: false, error: "ارتباط امن با سرور برقرار نشد." };
  }
}

export async function decideMavisArticleReview(articleId, articleVersion, decision, decisionNote = "") {
  if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)
    || !Number.isInteger(articleVersion) || articleVersion < 1
    || !["approved", "changes_requested", "rejected"].includes(decision)
    || typeof decisionNote !== "string" || decisionNote.length > 2000) {
    return { ok: false, error: "اطلاعات تصمیم بازبینی معتبر نیست." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }
  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای ثبت تصمیم بازبینی، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc("decide_mavis_article_review", {
      p_article_id: articleId,
      p_article_version: articleVersion,
      p_decision: decision,
      p_decision_note: decisionNote,
    });
    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله با نسخه در حال بازبینی یکسان نیست. بررسی را دوباره بارگذاری کنید." };
    if (error?.code === "55000") return { ok: false, error: "این مقاله دیگر در صف بازبینی نیست." };
    if (error?.code === "P0002") return { ok: false, error: "مقاله پیدا نشد." };
    if (error?.code === "22023") return { ok: false, error: "تصمیم یا یادداشت بازبینی معتبر نیست." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "گردش‌کار بازبینی هنوز روی پایگاه داده فعال نشده است." };
    if (error) return { ok: false, error: "ثبت تصمیم بازبینی انجام نشد." };
    if (!data || data.articleVersion !== articleVersion || data.decision !== decision) {
      return { ok: false, error: "پاسخ پایگاه داده برای تصمیم بازبینی معتبر نبود." };
    }
    return { ok: true, status: data.status };
  } catch {
    return { ok: false, error: "ارتباط امن با سرور برقرار نشد." };
  }
}


const ARTICLE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function runMavisPublicationAction(action, articleId, expectedVersion) {
  if (typeof articleId !== "string" || !ARTICLE_UUID_PATTERN.test(articleId)
    || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "شناسه یا نسخه مقاله معتبر نیست." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای تغییر وضعیت انتشار، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc(action, {
      p_article_id: articleId,
      p_expected_version: expectedVersion,
    });

    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله تغییر کرده است. فهرست را تازه‌سازی و دوباره بررسی کنید." };
    if (error?.code === "55000") return { ok: false, error: "وضعیت مقاله برای این عملیات مجاز نیست یا تأیید نسخه معتبر پیدا نشد." };
    if (error?.code === "P0002") return { ok: false, error: "مقاله پیدا نشد." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "گردش‌کار انتشار هنوز روی پایگاه داده فعال نشده است." };
    if (error) return { ok: false, error: "تغییر وضعیت انتشار انجام نشد." };

    const expectedStatus = action === "publish_mavis_article" ? "published" : "approved";
    if (!data || data.articleVersion !== expectedVersion || data.status !== expectedStatus) {
      return { ok: false, error: "پاسخ پایگاه داده برای تغییر وضعیت معتبر نبود." };
    }

    return { ok: true, status: data.status };
  } catch {
    return { ok: false, error: "ارتباط امن با سرور برقرار نشد." };
  }
}

export async function publishMavisArticle(articleId, expectedVersion) {
  return runMavisPublicationAction("publish_mavis_article", articleId, expectedVersion);
}

export async function unpublishMavisArticle(articleId, expectedVersion) {
  return runMavisPublicationAction("unpublish_mavis_article", articleId, expectedVersion);
}


async function runMavisArticleLifecycleAction(rpcName, args, expectedStatus) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }
  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای این عملیات، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc(rpcName, args);
    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر تأیید نشد." };
    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله تغییر کرده است. صفحه را تازه‌سازی و دوباره بررسی کنید." };
    if (error?.code === "P0002") return { ok: false, error: "مقاله یا نسخه موردنظر پیدا نشد." };
    if (error?.code === "55000") return { ok: false, error: error.message || "مقاله در وضعیت مناسب این عملیات نیست." };
    if (error?.code === "22023") return { ok: false, error: "اطلاعات عملیات معتبر نیست." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "گردش‌کار انتشار هنوز روی پایگاه داده فعال نشده است." };
    if (error) return { ok: false, error: "عملیات انجام نشد. وضعیت پایگاه داده را بررسی کنید." };
    if (!data || (expectedStatus && data.status !== expectedStatus)) {
      return { ok: false, error: "پاسخ پایگاه داده برای این عملیات معتبر نبود." };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "ارتباط امن با سرور برقرار نشد." };
  }
}

export async function archiveMavisArticle(articleId, expectedVersion, note = "") {
  if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)
    || !Number.isInteger(expectedVersion) || expectedVersion < 1
    || typeof note !== "string" || note.length > 1000) {
    return { ok: false, error: "اطلاعات آرشیو معتبر نیست." };
  }
  const result = await runMavisArticleLifecycleAction("archive_mavis_article", {
    p_article_id: articleId,
    p_expected_version: expectedVersion,
    p_note: note,
  }, "archived");
  return result.ok ? { ok: true, status: result.data.status } : result;
}

export async function restoreMavisArticle(articleId, expectedVersion) {
  if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)
    || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "شناسه یا نسخه مقاله معتبر نیست." };
  }
  const result = await runMavisArticleLifecycleAction("restore_mavis_article", {
    p_article_id: articleId,
    p_expected_version: expectedVersion,
  });
  return result.ok ? { ok: true, status: result.data.status } : result;
}

export async function rollbackMavisArticleVersion(articleId, expectedCurrentVersion, targetVersion, note = "") {
  if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)
    || !Number.isInteger(expectedCurrentVersion) || expectedCurrentVersion < 1
    || !Number.isInteger(targetVersion) || targetVersion < 1
    || targetVersion >= expectedCurrentVersion
    || typeof note !== "string" || note.length > 1000) {
    return { ok: false, error: "نسخه انتخاب‌شده برای بازگردانی معتبر نیست." };
  }
  const result = await runMavisArticleLifecycleAction("rollback_mavis_article_version", {
    p_article_id: articleId,
    p_expected_current_version: expectedCurrentVersion,
    p_target_version: targetVersion,
    p_note: note,
  }, "draft");
  return result.ok ? {
    ok: true,
    status: result.data.status,
    articleVersion: result.data.articleVersion,
    rollbackOfVersion: result.data.rollbackOfVersion,
  } : result;
}
