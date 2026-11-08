import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { getMavisKnowledgeInventory } from "../../../../lib/mavis/knowledge-registry";
import MavisResearchDossier from "../../../../components/admin/MavisResearchDossier";
import { signOut } from "../../actions";

export const metadata = {
  title: "بسته شواهد پژوهش حقوقی | MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisResearchPage() {
  const access = await requireAdmin();
  if (!access.configured) redirect("/admin/login?error=config");
  if (access.authenticationAvailable === false || access.adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!access.user) redirect("/admin/login");
  if (!access.isAdmin) redirect("/admin/login?error=unauthorized");

  const inventory = getMavisKnowledgeInventory();
  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link className="active" href="/admin/mavis/research">پژوهشگر حقوقی</Link>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>پژوهشگر حقوقی وکیل</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">LAWYER COPILOT · SOURCE-AWARE RESEARCH</span><h1>پژوهشگر حقوقی وکیل</h1><p>ساخت بسته شواهد از کتابخانه موجود، همراه با ارجاع‌ها، وضعیت بررسی و خلأهای لازم برای تکمیل پژوهش.</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          <section className="admin-stats">
            <article><span>اصطلاحات قابل جست‌وجو</span><strong>{inventory.terms.toLocaleString("fa-IR")}</strong><small>از کتابخانه مشترک</small></article>
            <article><span>قوانین ثبت‌شده</span><strong>{inventory.laws.toLocaleString("fa-IR")}</strong><small>با وضعیت بازبینی</small></article>
            <article><span>خلاصه مواد</span><strong>{inventory.articles.toLocaleString("fa-IR")}</strong><small>بدون ایجاد دانشنامه موازی</small></article>
          </section>
          <MavisResearchDossier />
          <section className="admin-help"><strong>اصل پژوهش قابل استناد</strong><p>هیچ منبع ثانویه یا پیوند عمومی به‌عنوان متن رسمی و معتبر روز معرفی نمی‌شود. پیش از اتکا در لایحه یا مشاوره، متن اولیه، اصلاحات و نسخ، تاریخ لازم‌الاجرا شدن و اثر حقوقی رأی باید توسط وکیل بررسی شود.</p></section>
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
