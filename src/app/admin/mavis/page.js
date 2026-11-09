import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/supabase/admin";
import { getMavisKnowledgeInventory } from "../../../lib/mavis/knowledge-registry";
import MavisKnowledgeSearch from "../../../components/admin/MavisKnowledgeSearch";
import MavisIntakeInbox from "../../../components/admin/MavisIntakeInbox";
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
          <Link href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link href="/admin/mavis/articles">فهرست مقالات</Link>
          <a href="#mavis-intake-inbox">صندوق درخواست‌های اولیه</a>
          <a href="#knowledge-search">پژوهش حقوقی</a>
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
              <p>جست‌وجوی داخلی در داده‌های حقوقی فعلی؛ بدون اتصال به پرونده‌های موکل یا سرویس مدل خارجی.</p>
            </div>
            <div className="admin-status"><i /> دسترسی مدیر تأیید شده</div>
          </section>

          <section className="admin-stats">
            <article><span>اصطلاحات حقوقی</span><strong>{inventory.terms.toLocaleString("fa-IR")}</strong><small>از کتابخانه موجود</small></article>
            <article><span>قوانین ثبت‌شده</span><strong>{inventory.laws.toLocaleString("fa-IR")}</strong><small>همراه با وضعیت بررسی</small></article>
            <article><span>مقالات و خلاصه‌ها</span><strong>{(inventory.articles + inventory.publishedArticles).toLocaleString("fa-IR")}</strong><small>{inventory.articles.toLocaleString("fa-IR")} خلاصه ماده · {inventory.publishedArticles.toLocaleString("fa-IR")} مقاله منتشرشده متصل</small></article>
          </section>

          <MavisIntakeInbox />

          <section id="knowledge-search">
            <MavisKnowledgeSearch />
          </section>

          <section className="admin-help">
            <strong>مرز استفاده از نتایج</strong>
            <p>این نسخه فقط مدخل‌های موجود را بازیابی و مرتب می‌کند. وضعیت «نیازمند بازبینی» یا «منبع ثانویه» باید همان‌طور که ثبت شده حفظ شود. نتیجه جست‌وجو، نظر حقوقی، تنقیح قانون یا تأیید اعتبار فعلی منبع نیست.</p>
          </section>
          <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
