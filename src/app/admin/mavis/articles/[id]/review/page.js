import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "../../../../../../lib/supabase/admin";
import MavisArticleReview from "../../../../../../components/admin/MavisArticleReview";
import { signOut } from "../../../../../admin/actions";

export const metadata = {
  title: "بازبینی نسخه مقاله | MAVIS",
  robots: { index: false, follow: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReviewMavisArticlePage({ params }) {
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

  const { id } = await params;
  if (!UUID_PATTERN.test(id || "")) notFound();

  const { data: article, error: articleError } = await access.supabase
    .from("mavis_articles")
    .select("id, slug, title, category, status, current_version, updated_at")
    .eq("id", id)
    .eq("status", "in_review")
    .maybeSingle();

  if (articleError) redirect("/admin/mavis/articles?error=review-read");
  if (!article) notFound();

  const { data: version, error: versionError } = await access.supabase
    .from("mavis_article_versions")
    .select("article_id, version, snapshot, created_at, change_note")
    .eq("article_id", article.id)
    .eq("version", article.current_version)
    .maybeSingle();

  if (versionError || !version || !version.snapshot || typeof version.snapshot !== "object") {
    redirect("/admin/mavis/articles?error=review-version");
  }

  let sources = [];
  const { data: links } = await access.supabase
    .from("mavis_article_sources")
    .select("source_id")
    .eq("article_id", article.id);

  if (Array.isArray(links) && links.length) {
    const sourceIds = [...new Set(links.map((item) => item.source_id).filter(Boolean))];
    if (sourceIds.length) {
      const { data } = await access.supabase
        .from("mavis_sources")
        .select("id, title, canonical_url, source_type, rights_status")
        .in("id", sourceIds);
      sources = Array.isArray(data) ? data : [];
    }
  }

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
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>بازبینی نسخه مقاله</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome">
            <div><span className="admin-eyebrow">MAVIS · REVIEW WORKFLOW</span><h1>بازبینی مقاله</h1><p>{article.title} · نسخه {article.current_version.toLocaleString("fa-IR")}</p></div>
            <div className="admin-status"><i /> در انتظار تصمیم مدیر</div>
          </section>
          <MavisArticleReview article={article} version={version} sources={sources} />
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
