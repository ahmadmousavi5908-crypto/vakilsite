import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "../../../../../../lib/supabase/admin";
import MavisArticleEditor from "../../../../../../components/admin/MavisArticleEditor";
import { signOut } from "../../../../../admin/actions";

export const metadata = {
  title: "ویرایش پیش‌نویس مقاله | MAVIS",
  robots: { index: false, follow: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditMavisArticlePage({ params }) {
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

  let article;
  try {
    const { data, error } = await access.supabase
      .from("mavis_articles")
      .select("id, slug, title, author_name, excerpt, category, tags, content, content_schema_version, seo_title, seo_description, status, current_version, updated_at")
      .eq("id", id)
      .in("status", ["draft", "changes_requested", "needs_update"])
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        redirect("/admin/mavis/articles?error=editorial-unavailable");
      }
      redirect("/admin/mavis/articles?error=editorial-read");
    }
    article = data;
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    redirect("/admin/mavis/articles?error=editorial-read");
  }

  if (!article) notFound();

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
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>ویرایش پیش‌نویس</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">MAVIS · VERSIONED DRAFT</span><h1>ویرایش مقاله</h1><p>نسخه فعلی: {article.current_version.toLocaleString("fa-IR")} · آخرین تغییر: {new Date(article.updated_at).toLocaleString("fa-IR")}</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          <MavisArticleEditor initialArticle={article} />
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
