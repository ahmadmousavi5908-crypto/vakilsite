import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { articles } from "../../../../data/articles";
import { auditGrowthLibrary } from "../../../../lib/mavis/growth-audit.mjs";
import MavisArticleInventory from "../../../../components/admin/MavisArticleInventory";
import { signOut } from "../../../admin/actions";

export const metadata = {
  title: "فهرست مقالات | MAVIS",
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
  if (access.authenticationAvailable === false || access.adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!access.user) redirect("/admin/login");
  if (!access.isAdmin) redirect("/admin/login?error=unauthorized");

  const audit = auditGrowthLibrary(articles);
  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link className="active" href="/admin/mavis/articles">فهرست مقالات</Link>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>فهرست مقالات</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">CONTENT LIBRARY · EDITORIAL REVIEW</span><h1>کتابخانه متمرکز مقالات</h1><p>نمای فشرده و قابل جست‌وجوی مقالات فعلی برای بازبینی ساختار، منابع و اولویت اصلاح.</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          <MavisArticleInventory articles={articles} audit={audit} />
          <section className="admin-help"><strong>مرز نسخه فعلی</strong><p>این صفحه داده فعلی را فقط‌خواندنی نمایش می‌دهد. پیش از فعال‌کردن ویرایش و انتشار از پنل، باید منبع داده مقالات، نسخه‌بندی، تأیید انسانی، ثبت رویداد و اتصال بدون اختلال به صفحات عمومی به‌صورت کنترل‌شده منتقل و آزمون شود.</p></section>
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
