"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { articles as publicStaticArticles } from "../../../../data/articles";
import { parseMavisArticleDraftInput } from "../../../../lib/mavis/article-draft-input.mjs";
import { normalizeMavisManualSourceInput } from "../../../../lib/mavis/manual-source-input.mjs";
import { generateMavisEditorialSuggestions } from "../../../../lib/mavis/editorial-ai.mjs";
import { queryMavisEditorialArticles } from "../../../../lib/mavis/editorial-table.mjs";
import { buildMavisStaticArticleImport } from "../../../../lib/mavis/static-article-import.mjs";
import { isMavisArticleImageOwnedByUser } from "../../../../lib/mavis/article-image-metadata.mjs";
import { analyzeMavisArticleKeywordCoverage } from "../../../../lib/mavis/article-keyword-coverage.mjs";

async function attachStaticArticleSources(articleId, initialVersion, sources, skippedSources = 0) {
  let currentVersion = initialVersion;
  let importedSources = 0;
  let skipped = skippedSources;

  for (const source of sources) {
    const result = await addMavisManualArticleSource(articleId, currentVersion, source);
    if (result?.ok) {
      currentVersion = result.currentVersion;
      importedSources += 1;
    } else {
      skipped += 1;
    }
  }

  return { currentVersion, importedSources, skippedSources: skipped };
}

export async function saveMavisArticleDraft(formData) {
  const parsed = parseMavisArticleDraftInput(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const isStaticArticleSlug = publicStaticArticles.some((article) => article.slug === parsed.payload.slug);

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای ذخیره پیش‌نویس، ورود با حساب مدیر الزامی است." };
  }

  if (parsed.image && !isMavisArticleImageOwnedByUser(
    parsed.image,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    access.user.sub,
  )) {
    return { ok: false, error: "تصویر باید از باکت رسمی همین سایت و پوشه حساب مدیر بارگذاری شده باشد." };
  }

  if (isStaticArticleSlug) {
    if (!parsed.articleId) {
      return { ok: false, error: "این مقاله از محتوای فعلی سایت آمده است. ابتدا آن را به‌صورت پیش‌نویس نسخه‌دار وارد کنید." };
    }
    const { data: existing, error: lookupError } = await queryMavisEditorialArticles(access.supabase, (table) =>
      table.select("id, slug, status").eq("id", parsed.articleId).maybeSingle()
    );
    if (lookupError || !existing || existing.slug !== parsed.payload.slug
      || !["draft", "changes_requested", "needs_update"].includes(existing.status)) {
      return { ok: false, error: "فقط پیش‌نویس واردشده از همان مقاله فعلی قابل ویرایش است." };
    }
  }

  try {
    const { data, error } = await access.supabase.rpc("save_mavis_article_draft_with_metadata", {
      p_payload: parsed.payload,
      p_focus_keyword: parsed.focusKeyword || null,
      p_related_keywords: parsed.relatedKeywords,
      p_article_id: parsed.articleId,
      p_expected_version: parsed.expectedVersion,
      p_change_note: parsed.articleId ? "Administrator draft edit" : "Initial editorial draft",
      p_image: parsed.image,
    });

    if (error?.code === "23505") return { ok: false, error: "این نامک قبلاً استفاده شده است. نامک دیگری انتخاب کنید." };
    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله تغییر کرده است. صفحه را تازه‌سازی کنید و تغییرات جدید را دوباره اعمال کنید." };
    if (error?.code === "P0002") return { ok: false, error: "پیش‌نویس پیدا نشد یا دیگر در دسترس نیست." };
    if (error?.code === "55000") return { ok: false, error: "این مقاله دیگر در وضعیت قابل ویرایش نیست." };
    if (error?.code === "42883" || error?.code === "PGRST202") {
      return {
        ok: false,
        error: parsed.image
          ? "زیرساخت ذخیره تصویر و فراداده سئو هنوز روی این پایگاه داده فعال نشده است؛ پیش‌نویس ذخیره نشد."
          : "زیرساخت ذخیره پیش‌نویس و فراداده سئو هنوز روی این پایگاه داده فعال نشده است.",
      };
    }
    if (error) return { ok: false, error: "ذخیره پیش‌نویس انجام نشد. ورودی‌ها و اتصال پایگاه داده را بررسی کنید." };
    if (typeof data !== "string" || !data) return { ok: false, error: "پاسخ پایگاه داده معتبر نبود." };

    return { ok: true, articleId: data };
  } catch {
    return { ok: false, error: "ارتباط امن با پایگاه داده برقرار نشد." };
  }
}

export async function importMavisStaticArticleToDraft(rawSlug) {
  const slug = typeof rawSlug === "string" ? rawSlug.trim() : "";
  const article = publicStaticArticles.find((item) => item.slug === slug);
  if (!article) return { ok: false, error: "مقاله ثابت موردنظر پیدا نشد." };

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }
  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای ورود مقاله به CMS، دسترسی مدیر الزامی است." };
  }

  try {
    const imported = buildMavisStaticArticleImport(article);
    const { data: existing, error: lookupError } = await queryMavisEditorialArticles(access.supabase, (table) =>
      table.select("id, slug, status, current_version").eq("slug", slug).maybeSingle()
    );
    if (lookupError) return { ok: false, error: "وضعیت مقاله در CMS بررسی نشد." };
    if (existing) {
      if (!["draft", "changes_requested", "needs_update"].includes(existing.status)) {
        return { ok: false, error: "این مقاله از قبل در CMS ثبت شده و در وضعیت قابل ورود مجدد نیست." };
      }
      const sourceResult = await attachStaticArticleSources(
        existing.id,
        existing.current_version,
        imported.sources,
        imported.skippedSources
      );
      revalidatePath("/admin/mavis/articles");
      revalidatePath("/admin/mavis/articles/" + existing.id + "/edit");
      return {
        ok: true,
        articleId: existing.id,
        alreadyImported: true,
        importedSources: sourceResult.importedSources,
        skippedSources: sourceResult.skippedSources,
      };
    }

    const { data: articleId, error } = await access.supabase.rpc("save_mavis_article_draft", {
      p_payload: imported.payload,
      p_article_id: null,
      p_expected_version: null,
      p_change_note: "Imported current static article as a versioned draft; public content unchanged.",
    });
    if (error?.code === "23505") {
      return { ok: false, error: "این نامک هم‌زمان در CMS ثبت شده است. فهرست را تازه‌سازی کنید." };
    }
    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر برای ورود مقاله تأیید نشد." };
    if (error?.code === "22023") return { ok: false, error: "ساختار مقاله فعلی با محدودیت‌های CMS سازگار نیست." };
    if (error || typeof articleId !== "string" || !articleId) {
      return { ok: false, error: "ساخت پیش‌نویس نسخه‌دار انجام نشد." };
    }

    const sourceResult = await attachStaticArticleSources(
      articleId,
      1,
      imported.sources,
      imported.skippedSources
    );

    revalidatePath("/admin/mavis/articles");
    revalidatePath("/admin/mavis/articles/" + articleId + "/edit");
    revalidatePath("/articles");
    revalidatePath("/articles/library");

    return {
      ok: true,
      articleId,
      alreadyImported: false,
      importedSources: sourceResult.importedSources,
      skippedSources: sourceResult.skippedSources,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof TypeError
        ? error.message
        : "ورود امن مقاله به CMS انجام نشد.",
    };
  }
}



export async function searchMavisLocalArchive(rawQuery) {
  const query = typeof rawQuery === "string" ? rawQuery.trim().replace(/\s+/g, " ") : "";
  if (query.length < 2 || query.length > 200) {
    return { ok: false, error: "عبارت جست‌وجو باید بین ۲ تا ۲۰۰ نویسه باشد." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "جست‌وجوی آرشیو داخلی فقط برای مدیر مجاز است." };
  }

  try {
    const { data, error } = await access.supabase.rpc("search_mavis_local_archive", {
      p_query: query,
      p_limit: 40,
    });
    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر برای جست‌وجوی آرشیو تأیید نشد." };
    if (error?.code === "22023") return { ok: false, error: "عبارت جست‌وجو معتبر نیست." };
    if (error?.code === "42883" || error?.code === "PGRST202") {
      return { ok: false, error: "موتور جست‌وجوی آفلاین هنوز روی پایگاه داده فعال نشده است؛ مهاجرت شماره ۰۱۷ لازم است." };
    }
    if (error || !Array.isArray(data)) {
      return { ok: false, error: "جست‌وجو در آرشیو داخلی انجام نشد." };
    }
    return { ok: true, query, results: data, searchedAt: new Date().toISOString(), offline: true };
  } catch {
    return { ok: false, error: "ارتباط امن با آرشیو داخلی برقرار نشد." };
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

  // Reserve a globally shared daily budget before any billable OpenAlex search.
  try {
    const { data, error } = await access.supabase.rpc("consume_mavis_openalex_daily_budget");
    const budget = Array.isArray(data) ? data[0] : data;
    if (error) {
      providerErrors.push({ provider: "openalex", error: "BUDGET_CONTROL_UNAVAILABLE" });
    } else if (!budget?.allowed) {
      providerErrors.push({ provider: "openalex", error: "DAILY_BUDGET_EXHAUSTED" });
    } else {
      const result = await adapters.searchOpenAlex(query, 5);
      if (result.ok) results.push(...result.candidates);
      else providerErrors.push({ provider: "openalex", error: result.error });
    }
  } catch {
    providerErrors.push({ provider: "openalex", error: "BUDGET_CONTROL_UNAVAILABLE" });
  }

  const normalizedCandidates = results.slice(0, 15);
  if (!normalizedCandidates.length) {
    return { ok: true, query, results: [], providerErrors, searchedAt: new Date().toISOString() };
  }

  try {
    const { data, error } = await access.supabase.rpc("store_mavis_source_candidates", {
      p_candidates: normalizedCandidates,
    });
    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر برای ذخیره نتایج جست‌وجو تأیید نشد." };
    if (error?.code === "22023") return { ok: false, error: "فراداده دریافتی از منابع معتبر نبود و در صف ذخیره نشد." };
    if (error?.code === "42883" || error?.code === "PGRST202") {
      return { ok: false, error: "صف پایدار منابع هنوز روی پایگاه داده فعال نشده است." };
    }
    if (error || !Array.isArray(data?.candidates)) {
      return { ok: false, error: "نتایج جست‌وجو ذخیره نشدند؛ برای جلوگیری از گم‌شدن منابع، آن‌ها را موقت نمایش نمی‌دهیم." };
    }

    return {
      ok: true,
      query,
      results: data.candidates,
      providerErrors,
      searchedAt: new Date().toISOString(),
      persisted: true,
    };
  } catch {
    return { ok: false, error: "ذخیره امن نتایج جست‌وجو در صف منابع انجام نشد." };
  }
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
    const { data: article, error: articleLookupError } = await queryMavisEditorialArticles(access.supabase, (table) =>
      table
        .select("id, current_version, content, focus_keyword, related_keywords")
        .eq("id", articleId)
        .maybeSingle()
    );
    if (articleLookupError) return { ok: false, error: "نسخه و محتوای مقاله برای کنترل کلیدواژه بررسی نشد." };
    if (!article) return { ok: false, error: "مقاله پیدا نشد." };
    if (article.current_version !== expectedVersion) {
      return { ok: false, error: "نسخه مقاله تغییر کرده است. صفحه را تازه‌سازی کنید و تغییرات جدید را دوباره بررسی کنید." };
    }

    const keywordCoverage = analyzeMavisArticleKeywordCoverage(article);
    if (keywordCoverage.hasFocusKeyword && !keywordCoverage.focusKeywordPresent) {
      return {
        ok: false,
        error: "عبارت کلیدی اصلی در مقدمه یا متن مقاله دیده نمی‌شود. آن را طبیعی و مرتبط با موضوع در متن به‌کار ببرید؛ صرف ثبت در فیلد سئو کافی نیست."
      };
    }
    if (keywordCoverage.relatedKeywordCount > 0 && keywordCoverage.matchedRelatedKeywords.length === 0) {
      return {
        ok: false,
        error: "هیچ‌یک از عبارت‌های مرتبط در متن مقاله پوشش داده نشده است. عبارت‌های نامرتبط را حذف کنید یا فقط مواردی را نگه دارید که واقعاً در متن پاسخ داده شده‌اند."
      };
    }

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

function revalidatePublicMavisArticlePaths() {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/articles/library");
  revalidatePath("/articles/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

async function notifyMavisArticleIndexNow(access, articleId) {
  try {
    const { data, error } = await queryMavisEditorialArticles(access.supabase, (table) =>
      table.select("slug").eq("id", articleId).maybeSingle()
    );
    if (error || typeof data?.slug !== "string" || !data.slug) {
      return { state: "skipped", reason: "article_slug_unavailable" };
    }
    const { submitIndexNowUrls } = await import("../../../../lib/indexnow-client.mjs");
    return await submitIndexNowUrls([
      "/articles/" + data.slug,
      "/articles",
      "/articles/library",
    ]);
  } catch {
    return { state: "unavailable" };
  }
}

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

    if (error?.code === "42501") return { ok: false, error: "دسترسی انتشار برای حساب مدیر در پایگاه داده تأیید نشد. ورود مدیر و مجوز تابع انتشار باید بررسی شود." };
    if (error?.code === "40001") return { ok: false, error: "نسخه مقاله تغییر کرده است. فهرست را تازه‌سازی و دوباره بررسی کنید." };
    if (error?.code === "55000") return { ok: false, error: "مقاله در وضعیت قابل انتشار نیست یا تأیید همان نسخه در پایگاه داده ثبت نشده است." };
    if (error?.code === "P0002") return { ok: false, error: "مقاله پیدا نشد." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "تابع انتشار مقاله روی پایگاه داده متصل به سایت نصب یا در دسترس نیست. مهاجرت انتشار باید روی همان پایگاه داده اجرا شود." };
    if (error) return { ok: false, error: "تغییر وضعیت انتشار انجام نشد." };

    const expectedStatus = action === "publish_mavis_article" ? "published" : "approved";
    if (!data || data.articleVersion !== expectedVersion || data.status !== expectedStatus) {
      return { ok: false, error: "پاسخ پایگاه داده برای تغییر وضعیت معتبر نبود." };
    }

    revalidatePublicMavisArticlePaths();
    const indexNow = await notifyMavisArticleIndexNow(access, articleId);
    return { ok: true, status: data.status, indexNow };
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


async function runMavisArticleLifecycleAction(rpcName, args, expectedStatus, options = {}) {
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
    let wasPublished = false;
    if (options.notifyIfPreviouslyPublished === true && typeof args?.p_article_id === "string") {
      const { data: before, error: beforeError } = await queryMavisEditorialArticles(access.supabase, (table) =>
        table.select("status").eq("id", args.p_article_id).maybeSingle()
      );
      wasPublished = !beforeError && before?.status === "published";
    }

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
    revalidatePublicMavisArticlePaths();
    const indexNow = wasPublished
      ? await notifyMavisArticleIndexNow(access, args.p_article_id)
      : undefined;
    return { ok: true, data, ...(indexNow ? { indexNow } : {}) };
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
  }, "archived", { notifyIfPreviouslyPublished: true });
  return result.ok
    ? { ok: true, status: result.data.status, ...(result.indexNow ? { indexNow: result.indexNow } : {}) }
    : result;
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

export async function importMavisSourceCandidateById(candidateId) {
  if (typeof candidateId !== "string" || !/^[0-9a-f-]{36}$/i.test(candidateId)) {
    return { ok: false, error: "شناسه منبع معتبر نیست." };
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
    const { data, error } = await access.supabase.rpc("import_mavis_source_candidate_from_queue", {
      p_candidate_id: candidateId,
    });
    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر برای واردکردن منبع تأیید نشد." };
    if (error?.code === "55000") return { ok: false, error: "این منبع در وضعیت قابل واردکردن نیست." };
    if (error?.code === "P0002") return { ok: false, error: "منبع در صف پیدا نشد." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "واردکردن از صف منابع هنوز فعال نشده است." };
    if (error || !data || typeof data.articleId !== "string") return { ok: false, error: "ساخت پیش‌نویس از منبع انجام نشد." };
    return { ok: true, articleId: data.articleId, created: data.created === true, status: data.status };
  } catch {
    return { ok: false, error: "ارتباط امن با سرور برقرار نشد." };
  }
}

export async function ignoreMavisSourceCandidate(candidateId, note = "") {
  if (typeof candidateId !== "string" || !/^[0-9a-f-]{36}$/i.test(candidateId)
    || typeof note !== "string" || note.length > 1000) {
    return { ok: false, error: "اطلاعات بایگانی منبع معتبر نیست." };
  }
  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }
  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, error: "برای بایگانی منبع، ورود با حساب مدیر الزامی است." };
  }
  try {
    const { data, error } = await access.supabase.rpc("ignore_mavis_source_candidate", {
      p_candidate_id: candidateId,
      p_note: note,
    });
    if (error?.code === "42501") return { ok: false, error: "دسترسی مدیر تأیید نشد." };
    if (error?.code === "55000") return { ok: false, error: "منبع واردشده قابل بایگانی نیست." };
    if (error?.code === "P0002") return { ok: false, error: "منبع در صف پیدا نشد." };
    if (error?.code === "42883" || error?.code === "PGRST202") return { ok: false, error: "بایگانی منبع هنوز فعال نشده است." };
    if (error || data?.status !== "ignored") return { ok: false, error: "بایگانی منبع انجام نشد." };
    return { ok: true, status: data.status };
  } catch {
    return { ok: false, error: "ارتباط امن با سرور برقرار نشد." };
  }
}


export async function addMavisManualArticleSource(articleId, expectedVersion, sourceInput) {
  if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)
    || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, code: "INVALID_ARTICLE_VERSION", error: "شناسه یا نسخه پیش‌نویس معتبر نیست." };
  }

  let normalized;
  try {
    normalized = normalizeMavisManualSourceInput(sourceInput);
  } catch (error) {
    return { ok: false, code: "INVALID_SOURCE", error: error.message || "اطلاعات منبع معتبر نیست." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, code: "ADMIN_AUTH_REQUIRED", error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, code: "ADMIN_AUTH_REQUIRED", error: "برای ثبت منبع، ورود با حساب مدیر الزامی است." };
  }

  try {
    const { data, error } = await access.supabase.rpc("add_mavis_manual_article_source", {
      p_article_id: articleId,
      p_expected_version: expectedVersion,
      p_source: normalized.source,
      p_relation_type: normalized.relationType,
    });

    if (error?.code === "42883" || error?.code === "PGRST202") {
      return {
        ok: false,
        code: "MAVIS_SOURCE_MIGRATION_PENDING",
        error: "ثبت و اتصال منبع پس از فعال‌سازی Migration 019 روی Staging در دسترس قرار می‌گیرد."
      };
    }
    if (error?.code === "42501") return { ok: false, code: "FORBIDDEN", error: "دسترسی مدیر برای ثبت منبع تأیید نشد." };
    if (error?.code === "40001") return { ok: false, code: "VERSION_CONFLICT", error: "نسخه پیش‌نویس تغییر کرده است. صفحه را تازه‌سازی کنید." };
    if (error?.code === "55000") return { ok: false, code: "ARTICLE_NOT_EDITABLE", error: "منبع فقط به پیش‌نویس قابل ویرایش متصل می‌شود." };
    if (error?.code === "22023") return { ok: false, code: "INVALID_SOURCE", error: "عنوان، نشانی یا نوع منبع معتبر نیست." };
    if (error || !data?.ok || !data?.source?.id) {
      return { ok: false, code: "SOURCE_ATTACH_FAILED", error: "ثبت و اتصال منبع انجام نشد." };
    }

    revalidatePath("/admin/mavis/articles");
    revalidatePath("/admin/mavis/articles/" + articleId + "/edit");
    revalidatePath("/articles");
    revalidatePath("/articles/library");

    return {
      ok: true,
      alreadyAttached: data.already_attached === true,
      currentVersion: data.current_version,
      source: data.source
    };
  } catch {
    return { ok: false, code: "SOURCE_ATTACH_FAILED", error: "ارتباط امن با پایگاه داده برقرار نشد." };
  }
}

export async function generateMavisEditorialDraft(formData) {
  if (!formData || typeof formData.get !== "function") {
    return { ok: false, code: "INVALID_FORM", error: "اطلاعات فرم معتبر نیست." };
  }

  let access;
  try {
    access = await requireAdmin();
  } catch {
    return { ok: false, code: "ADMIN_AUTH_REQUIRED", error: "احراز هویت مدیر در دسترس نیست. دوباره وارد پنل شوید." };
  }

  if (!access?.isAdmin || !access?.supabase || !access?.user?.sub) {
    return { ok: false, code: "ADMIN_AUTH_REQUIRED", error: "برای استفاده از دستیار تحریریه، ورود مدیر الزامی است." };
  }

  const apiKey = process.env.MAVIS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
  let workersAi;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    workersAi = getCloudflareContext().env?.AI;
  } catch {
    // Local Node.js development can continue through the optional OpenAI fallback.
  }
  if (typeof workersAi?.run !== "function" && !apiKey) {
    return {
      ok: false,
      code: "MAVIS_AI_NOT_CONFIGURED",
      error: "سرویس هوش مصنوعی در این محیط فعال نیست. اتصال Workers AI یا کلید پشتیبان باید تنظیم شود."
    };
  }

  const articleId = String(formData.get("article_id") || "");
  let sources = [];

  if (/^[0-9a-f-]{36}$/i.test(articleId)) {
    const relation = "source:mavis_sources!mavis_article_sources_source_id_fkey(id,title,canonical_url,source_type,external_id,author_name,publisher,published_on,rights_status,metadata)";
    let sourceResult = await access.supabase
      .from("mavis_article_sources")
      .select("relation_type,citation_label," + relation)
      .eq("article_id", articleId)
      .order("sort_order", { ascending: true });

    if (sourceResult.error && /metadata|PGRST204|42703/i.test(sourceResult.error.message || "")) {
      sourceResult = await access.supabase
        .from("mavis_article_sources")
        .select("relation_type,citation_label,source:mavis_sources!mavis_article_sources_source_id_fkey(id,title,canonical_url,source_type,external_id,author_name,publisher,published_on,rights_status)")
        .eq("article_id", articleId)
        .order("sort_order", { ascending: true });
    }

    if (sourceResult.error) {
      return { ok: false, code: "SOURCE_CONTEXT_UNAVAILABLE", error: "فهرست منابع متصل به مقاله خوانده نشد." };
    }

    sources = (sourceResult.data || []).map((row) => {
      const source = Array.isArray(row.source) ? row.source[0] : row.source;
      return source ? {
        ...source,
        relation_type: row.relation_type,
        citation_label: row.citation_label,
        metadata: source.metadata || {}
      } : null;
    }).filter(Boolean);
  }

  const { data: limit, error: limitError } = await access.supabase.rpc("consume_mavis_editorial_ai_limit");
  if (limitError?.code === "42883" || limitError?.code === "PGRST202") {
    return {
      ok: false,
      code: "MAVIS_AI_RATE_LIMIT_NOT_READY",
      error: "محدودکننده مصرف هوش مصنوعی هنوز فعال نشده است؛ Migration 019 باید روی Staging اجرا شود."
    };
  }
  if (limitError || !limit || typeof limit.allowed !== "boolean") {
    return { ok: false, code: "MAVIS_AI_RATE_LIMIT_UNAVAILABLE", error: "کنترل سهمیه دستیار هوشمند در دسترس نیست." };
  }
  if (!limit.allowed) {
    return {
      ok: false,
      code: "MAVIS_AI_RATE_LIMITED",
      retryAfterSeconds: limit.retry_after_seconds,
      error: "سهمیه تولید پیش‌نویس موقتاً تکمیل شده است. کمی بعد دوباره تلاش کنید."
    };
  }

  const sectionHeadings = formData.getAll("section_heading");
  const sectionBodies = formData.getAll("section_body");
  const sections = sectionHeadings.map((heading, index) => ({
    heading: String(heading || ""),
    body: String(sectionBodies[index] || "")
  }));
  const tags = String(formData.get("tags") || "")
    .split(/[,\u060C]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const input = {
    topic: String(formData.get("title") || formData.get("excerpt") || formData.get("category") || ""),
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    category: String(formData.get("category") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    intro: String(formData.get("intro") || ""),
    warning: String(formData.get("warning") || ""),
    checklist: String(formData.get("checklist") || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    sections,
    tags,
    focusKeyword: String(formData.get("focus_keyword") || "").trim(),
    relatedKeywords: String(formData.get("related_keywords") || "")
      .split(/[,\u060C]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20),
    sources
  };

  const model = typeof workersAi?.run === "function"
    ? process.env.MAVIS_WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    : process.env.MAVIS_EDITORIAL_MODEL || "gpt-6-astra";
  const result = await generateMavisEditorialSuggestions(input, {
    apiKey,
    ai: workersAi,
    model
  });

  if (!result.ok) {
    const messages = {
      MAVIS_AI_INVALID_INPUT: result.message || "برای تولید پیش‌نویس، موضوع یا عنوان مقاله را وارد کنید.",
      MAVIS_AI_NETWORK_ERROR: "ارتباط با سرویس مدل برقرار نشد.",
      MAVIS_AI_TIMEOUT: "پاسخ سرویس مدل بیش از زمان مجاز طول کشید؛ دوباره تلاش کنید.",
      MAVIS_AI_RESPONSE_TOO_LARGE: "پاسخ سرویس مدل از محدوده امن بزرگ‌تر بود و پذیرفته نشد.",
      MAVIS_AI_PROVIDER_ERROR: "سرویس مدل درخواست را نپذیرفت. کلید و دسترسی API را بررسی کنید.",
      MAVIS_AI_INCOMPLETE_RESPONSE: "پاسخ مدل کامل نشد؛ دوباره تلاش کنید.",
      MAVIS_AI_REFUSED: "مدل به این درخواست پاسخ نداد.",
      MAVIS_AI_INVALID_OUTPUT: "ساختار پاسخ مدل معتبر نبود؛ دوباره تلاش کنید."
    };
    return { ok: false, code: result.code, error: messages[result.code] || "تولید پیش‌نویس انجام نشد." };
  }

  return {
    ok: true,
    model: result.model,
    remainingRequests: limit.remaining,
    suggestions: result.suggestions
  };
}
