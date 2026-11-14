import Link from "next/link";
import { redirect } from "next/navigation";
import { articles } from "../../../../data/articles";
import MavisArticleCatalog from "../../../../components/admin/MavisArticleCatalog";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { signOut } from "../../../admin/actions";

export const metadata = {
  title: "کتابخانه مقالات | MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisArticlesPage() {
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
              <p>فهرست یکپارچه محتوای فعلی سایت برای جست‌وجو، بررسی ساختار و مشاهده منابع.</p>
            </div>
            <div className="admin-status"><i /> دسترسی مدیر تأیید شده</div>
          </section>
          <MavisArticleCatalog articles={articles} />
          <section className="admin-help">
            <strong>وضعیت این مرحله</strong>
            <p>این پیش‌نمایش به‌صورت فقط‌خواندنی از داده فعلی سایت استفاده می‌کند. اتصال به دیتابیس، ورود منابع بیرونی، ویرایش، تأیید، انتشار و آرشیو تا تکمیل کنترل‌های امنیتی و آزمون مستقل غیرفعال هستند.</p>
          </section>
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
