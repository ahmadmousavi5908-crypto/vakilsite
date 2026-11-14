import Link from "next/link";
import { redirect } from "next/navigation";
import { articles } from "../../../../data/articles";
import MavisArticleCatalog from "../../../../components/admin/MavisArticleCatalog";
import MavisDraftList from "../../../../components/admin/MavisDraftList";
import MavisSourceDiscovery from "../../../../components/admin/MavisSourceDiscovery";
import MavisReviewQueue from "../../../../components/admin/MavisReviewQueue";
import MavisPublicationQueue from "../../../../components/admin/MavisPublicationQueue";
import { decodeMavisArticleCursor, encodeMavisArticleCursor } from "../../../../lib/mavis/editorial-cursor.mjs";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { signOut } from "../../../admin/actions";

export const metadata = {
  title: "کتابخانه مقالات | MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisArticlesPage({ searchParams }) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    redirect("/admin/login?error=authorization");
  }

  if (!access.configured) redirect("/admin/login?error=config");
  if (access.authenticationAvailable === false || access.adminCheckAvailable === false) {
    redirect("/admin/login?error=authorization");
  }
  if (!access.user) redirect("/admin/login");
  if (!access.isAdmin) redirect("/admin/login?error=unauthorized");

  const params = await searchParams;
  const cursorValue = typeof params?.cursor === "string" ? params.cursor : "";
  const cursor = decodeMavisArticleCursor(cursorValue);
  let draftRows = [];
  let nextCursor = null;
  let draftError = null;

  if (cursorValue && !cursor) {
    draftError = "نشانی صفحه‌بندی معتبر نیست. از صفحه اول کتابخانه شروع کنید.";
  } else {
    try {
      let query = access.supabase
        .from("mavis_articles")
        .select("id, slug, title, category, status, current_version, updated_at")
        .in("status", ["draft", "changes_requested", "needs_update"])
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(26);

      if (cursor) {
        query = query.or(`updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`);
      }

      const { data, error } = await query;
      if (error) {
        draftError = error.code === "42P01" || error.code === "PGRST205"
          ? "جدول مقالات هنوز در این پایگاه داده ایجاد نشده است. migrationهای CMS باید در همین محیط اعمال شوند."
          : "خواندن پیش‌نویس‌ها انجام نشد. دسترسی مدیر و اتصال پایگاه داده را بررسی کنید.";
      } else {
        const rows = Array.isArray(data) ? data : [];
        if (rows.length > 25) {
          const lastVisible = rows[24];
          nextCursor = encodeMavisArticleCursor(lastVisible);
          draftRows = rows.slice(0, 25);
        } else {
          draftRows = rows;
        }
      }
    } catch {
      draftError = "ارتباط امن با پایگاه داده برقرار نشد.";
    }
  }

  let reviewRows = [];
  let reviewError = null;
  try {
    const { data, error } = await access.supabase
      .from("mavis_articles")
      .select("id, slug, title, category, current_version, updated_at")
      .eq("status", "in_review")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) reviewError = "خواندن صف بازبینی انجام نشد. اتصال پایگاه داده را بررسی کنید.";
    else reviewRows = Array.isArray(data) ? data : [];
  } catch {
    reviewError = "ارتباط امن با پایگاه داده برقرار نشد.";
  }

  let approvedRows = [];
  let publishedRows = [];
  let publicationError = null;
  try {
    const [approvedResult, publishedResult] = await Promise.all([
      access.supabase
        .from("mavis_articles")
        .select("id, slug, title, category, current_version, updated_at")
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(50),
      access.supabase
        .from("mavis_articles")
        .select("id, slug, title, category, current_version, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50),
    ]);
    if (approvedResult.error || publishedResult.error) {
      publicationError = "خواندن فهرست انتشار انجام نشد. migration انتشار باید در همین پایگاه داده اعمال شده باشد.";
    } else {
      approvedRows = Array.isArray(approvedResult.data) ? approvedResult.data : [];
      publishedRows = Array.isArray(publishedResult.data) ? publishedResult.data : [];
    }
  } catch {
    publicationError = "ارتباط امن برای خواندن وضعیت انتشار برقرار نشد.";
  }

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">و</span>
          <span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span>
        </Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link className="active" href="/admin/mavis/articles">کتابخانه مقالات</Link>
        </nav>
        <div className="admin-sidebar-foot">
          <span>دسترسی مدیر</span>
          <Link href="/">مشاهده وب‌سایت ←</Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><span>فضای مدیریت / MAVIS</span><strong>کتابخانه مقالات</strong></div>
          <form action={signOut}><button type="submit">خروج امن</button></form>
        </header>
        <main className="admin-content">
          <section className="admin-welcome">
            <div>
              <span className="admin-eyebrow">MAVIS · CONTENT WORKSPACE</span>
              <h1>مدیریت و بازبینی مقالات</h1>
              <p>مدیریت پیش‌نویس‌های دیتابیسی در کنار فهرست فقط‌خواندنی مقالات فعلی سایت.</p>
            </div>
            <div className="admin-status"><i /> دسترسی مدیر تأیید شده</div>
          </section>
          <MavisSourceDiscovery />
          <MavisReviewQueue rows={reviewRows} error={reviewError} />
          <MavisPublicationQueue approvedRows={approvedRows} publishedRows={publishedRows} error={publicationError} />
          <MavisDraftList rows={draftRows} nextCursor={nextCursor} error={draftError} />
          <MavisArticleCatalog articles={articles} />
          <section className="admin-help">
            <strong>وضعیت این مرحله</strong>
            <p>جست‌وجوی منابع و ساخت پیش‌نویس فراداده‌ای فعال است. پیش‌نویس پس از ذخیره نسخه مشخص می‌تواند وارد صف بازبینی شود. تصمیم بازبین به همان نسخه متصل است؛ انتشار و لغو انتشار نیز عملیات جداگانه مدیر و نسخه‌محور هستند. صفحه عمومی فعلی تا تکمیل مسیر دیتابیسی بدون تغییر باقی می‌ماند.</p>
          </section>
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
