import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { articles } from "../../../../data/articles";
import { auditGrowthLibrary } from "../../../../lib/mavis/growth-audit.mjs";
import MavisGrowthAudit from "../../../../components/admin/MavisGrowthAudit";
import { signOut } from "../../../admin/actions";

export const metadata = {
  title: "هوشمندی رشد و محتوا | MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisGrowthPage() {
  const { user, isAdmin, configured, authenticationAvailable, adminCheckAvailable } = await requireAdmin();
  if (!configured) redirect("/admin/login?error=config");
  if (authenticationAvailable === false) redirect("/admin/login?error=authorization");
  if (!user) redirect("/admin/login");
  if (adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!isAdmin) redirect("/admin/login?error=unauthorized");

  const audit = auditGrowthLibrary(articles);
  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link className="active" href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link href="/admin/mavis/articles">فهرست مقالات</Link>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>هوشمندی رشد و محتوا</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">GROWTH INTELLIGENCE · LOCAL AUDIT</span><h1>ممیزی کتابخانه محتوا</h1><p>تحلیل ساختاری محلی روی مقالات فعلی سایت، بدون ادعای داده زنده موتورهای جست‌وجو.</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          <MavisGrowthAudit audit={audit} />
          <section className="admin-help"><strong>مرحله بعدی این بازو</strong><p>اتصال درخواست‌محور به Search Console و Bing Webmaster پس از تأیید دسترسی OAuth و محدودیت API؛ هیچ داده جست‌وجو یا رتبه‌ای در این نسخه جعل یا شبیه‌سازی نمی‌شود.</p></section>
          <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
