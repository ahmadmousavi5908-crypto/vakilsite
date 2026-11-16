import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { articles } from "../../../../data/articles";
import { auditGrowthLibrary } from "../../../../lib/mavis/growth-audit.mjs";
import MavisGrowthAudit from "../../../../components/admin/MavisGrowthAudit";
import MavisSearchConsolePanel from "../../../../components/admin/MavisSearchConsolePanel";
import MavisCompetitorResearch from "../../../../components/admin/MavisCompetitorResearch";
import { signOut } from "../../../admin/actions";

export const metadata = {
  title: "هوشمندی رشد و محتوا | MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisGrowthPage() {
  const access = await requireAdmin();
  const { user, isAdmin, configured, authenticationAvailable, adminCheckAvailable } = access;
  if (!configured) redirect("/admin/login?error=config");
  if (authenticationAvailable === false) redirect("/admin/login?error=authorization");
  if (!user) redirect("/admin/login");
  if (adminCheckAvailable === false) redirect("/admin/login?error=authorization");
  if (!isAdmin) redirect("/admin/login?error=unauthorized");

  let cmsNotice = "";
  let cmsArticles = [];
  if (access.supabase) {
    const { data, error } = await access.supabase
      .from("mavis_editorial_articles")
      .select("id,slug,title,category,excerpt,content,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(700);

    if (error) {
      cmsNotice = "مقالات CMS در این نوبت از پایگاه داده خوانده نشدند؛ ممیزی فقط روی کتابخانه قدیمی اجرا شده است.";
    } else {
      const rows = Array.isArray(data) ? data : [];
      const ids = rows.map((row) => row.id).filter(Boolean);
      let sourceRows = [];
      if (ids.length) {
        const sourceResult = await access.supabase
          .from("mavis_article_sources")
          .select("article_id,source:mavis_sources!mavis_article_sources_source_id_fkey(id,title,canonical_url,source_type)")
          .in("article_id", ids);
        if (!sourceResult.error) sourceRows = Array.isArray(sourceResult.data) ? sourceResult.data : [];
      }

      const sourcesByArticle = new Map();
      for (const row of sourceRows) {
        const source = Array.isArray(row.source) ? row.source[0] : row.source;
        if (!source) continue;
        const current = sourcesByArticle.get(row.article_id) || [];
        current.push({ title: source.title, url: source.canonical_url, sourceType: source.source_type });
        sourcesByArticle.set(row.article_id, current);
      }

      cmsArticles = rows.map((row) => {
        const content = row.content && typeof row.content === "object" ? row.content : {};
        const sources = sourcesByArticle.get(row.id) || (Array.isArray(content.sources) ? content.sources : []);
        return {
          slug: row.slug,
          title: row.title,
          category: row.category,
          excerpt: row.excerpt,
          intro: content.intro || "",
          sections: Array.isArray(content.sections) ? content.sections : [],
          checklist: Array.isArray(content.checklist) ? content.checklist : [],
          warning: content.warning || "",
          sources
        };
      });
    }
  }

  const merged = new Map();
  for (const article of articles) if (article?.slug) merged.set(article.slug, article);
  for (const article of cmsArticles) if (article?.slug) merged.set(article.slug, article);
  const audit = auditGrowthLibrary([...merged.values()]);

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link className="active" href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link href="/admin/mavis/articles">کتابخانه مقالات</Link>
          <Link href="/admin/mavis">جست‌وجوی دانش و Search Console</Link>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>هوشمندی رشد و محتوا</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome">
            <div><span className="admin-eyebrow">GROWTH INTELLIGENCE · SEARCH · CONTENT</span><h1>مرکز هوشمندی رشد و پژوهش بازار</h1><p>ترکیب ممیزی محلی محتوا، داده واقعی Search Console و مشاهده صفحات عمومی بازار؛ هر شاخص با منشأ و محدودیت خودش نمایش داده می‌شود.</p></div>
            <div className="admin-status"><i /> دسترسی مدیر تأیید شده</div>
          </section>
          {cmsNotice ? <p className="admin-help">{cmsNotice}</p> : null}
          <MavisGrowthAudit audit={audit} />
          <MavisSearchConsolePanel />
          <MavisCompetitorResearch />
          <section className="admin-help">
            <strong>حدود داده و تصمیم‌گیری</strong>
            <p>فرصت‌های کلیدواژه از داده واقعی Search Console محاسبه می‌شوند. پژوهش رقبا، مشاهده نتایج عمومی وب است و رتبه، ترافیک یا حجم جست‌وجوی رقبا را ادعا نمی‌کند. پیشنهاد محتوا باید با منابع حقوقی معتبر و بازبینی وکیل تکمیل شود.</p>
          </section>
          <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"} · مقالات CMS بررسی‌شده: {cmsArticles.length.toLocaleString("fa-IR")}</span>
        </main>
      </div>
    </div>
  );
}
