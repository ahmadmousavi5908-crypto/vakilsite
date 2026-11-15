import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../../lib/supabase/admin";
import MavisArticleEditor from "../../../../../components/admin/MavisArticleEditor";
import { signOut } from "../../../../admin/actions";

export const metadata = {
  title: "ساخت پیش‌نویس مقاله | MAVIS",
  robots: { index: false, follow: false },
};

export default async function NewMavisArticlePage() {
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

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link className="active" href="/admin/mavis/articles">کتابخانه مقالات</Link>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>ساخت پیش‌نویس مقاله</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">MAVIS · EDITORIAL CMS</span><h1>ایجاد محتوای جدید</h1><p>فرم ساخت پیش‌نویس ساختاریافته با ذخیره امن و نسخه‌بندی‌شده.</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          <MavisArticleEditor />
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
