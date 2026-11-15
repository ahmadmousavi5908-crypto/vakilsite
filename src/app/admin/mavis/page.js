import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/supabase/admin";
import { getMavisKnowledgeInventory } from "../../../lib/mavis/knowledge-registry";
import MavisKnowledgeSearch from "../../../components/admin/MavisKnowledgeSearch";
import MavisSearchConsolePanel from "../../../components/admin/MavisSearchConsolePanel";
import { signOut } from "../actions";

export const metadata = {
  title: "مرکز دانش MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisAdminPage() {
  const { user, isAdmin, configured, authenticationAvailable, adminCheckAvailable } = await requireAdmin();
  if (!configured) redirect("/admin/login?error=config");
  if (authenticationAvailable === false) redirect("/admin/login?error=authorization");
  if (!user) redirect("/admin/login");
  if (adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!isAdmin) redirect("/admin/login?error=unauthorized");

  const inventory = getMavisKnowledgeInventory();

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">و</span>
          <span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span>
        </Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link className="active" href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link href="/admin/mavis/growth">ممیزی محتوا و هوشمندی رشد</Link>
          <Link href="/admin/mavis/articles">کتابخانه مقالات</Link>
          <a href="#knowledge-search">پژوهش حقوقی</a>
          <a href="#growth-intelligence">هوشمندی رشد</a>
        </nav>
        <div className="admin-sidebar-foot">
          <span>دسترسی مدیر</span>
          <Link href="/">مشاهده وب‌سایت ←</Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><span>فضای مدیریت / MAVIS</span><strong>مرکز پژوهش و دانش</strong></div>
          <form action={signOut}><button type="submit">خروج امن</button></form>
        </header>
        <main className="admin-content">
          <section className="admin-welcome">
            <div>
              <span className="admin-eyebrow">MAVIS KNOWLEDGE WORKSPACE</span>
              <h1>مرکز دانش و پژوهش</h1>
              <p>جست‌وجوی داخلی در کتابخانه حقوقی، مقالات منتشرشده و یادداشت‌های پژوهشی؛ بدون دسترسی به پرونده‌های موکل یا سرویس مدل خارجی.</p>
            </div>
            <div className="admin-status"><i /> دسترسی مدیر تأیید شده</div>
          </section>
          <section className="admin-stats">
            <article><span>اصطلاحات حقوقی</span><strong>{inventory.terms.toLocaleString("fa-IR")}</strong><small>از کتابخانه موجود</small></article>
            <article><span>قوانین ثبت‌شده</span><strong>{inventory.laws.toLocaleString("fa-IR")}</strong><small>همراه با وضعیت بررسی</small></article>
            <article><span>مقالات و خلاصه‌ها</span><strong>{(inventory.legalArticles + inventory.publishedArticles + inventory.researchNotes).toLocaleString("fa-IR")}</strong><small>{inventory.legalArticles.toLocaleString("fa-IR")} خلاصه ماده · {inventory.publishedArticles.toLocaleString("fa-IR")} مقاله سایت · {inventory.researchNotes.toLocaleString("fa-IR")} یادداشت پژوهشی</small></article>
          </section>
          <section id="knowledge-search"><MavisKnowledgeSearch /></section>
          <section id="growth-intelligence"><MavisSearchConsolePanel /></section>
          <section className="admin-help">
            <strong>مرز استفاده از نتایج</strong>
            <p>این نسخه فقط مدخل‌های موجود را بازیابی و مرتب می‌کند. منبع ثانویه یا وضعیت «نیازمند بازبینی» به‌عنوان قانون معتبر معرفی نمی‌شود. خروجی، نظر حقوقی یا محاسبه مهلت نیست و هر نتیجه نیازمند بررسی وکیل است.</p>
          </section>
          <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
