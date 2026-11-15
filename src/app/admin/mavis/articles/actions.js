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
