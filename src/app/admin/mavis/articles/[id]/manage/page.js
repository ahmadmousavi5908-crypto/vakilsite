import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "../../../../../../lib/supabase/admin";
import MavisPublicationManager from "../../../../../../components/admin/MavisPublicationManager";
import { signOut } from "../../../../../admin/actions";

export const metadata = {
  title: "مدیریت انتشار مقاله | MAVIS",
  robots: { index: false, follow: false },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ManageMavisArticlePage({ params }) {
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
    .select("id, slug, title, category, status, current_version, updated_at, published_at, archived_from_status")
    .eq("id", id)
    .maybeSingle();

  if (articleError) redirect("/admin/mavis/articles?error=publication-read");
  if (!article) notFound();

  const [versionResult, approvalResult] = await Promise.all([
    access.supabase
      .from("mavis_article_versions")
      .select("version, snapshot, change_note, created_at")
      .eq("article_id", id)
      .order("version", { ascending: false })
      .limit(30),
    access.supabase
      .from("mavis_article_approvals")
      .select("id, article_version, decision, reviewer_id, decision_note, created_at")
      .eq("article_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (versionResult.error) redirect("/admin/mavis/articles?error=publication-versions");
  if (approvalResult.error) redirect("/admin/mavis/articles?error=publication-approvals");

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
        <header className="admin-topbar"><div><span>فضای مدیریت / MAVIS</span><strong>مدیریت انتشار</strong></div><form action={signOut}><button type="submit">خروج امن</button></form></header>
        <main className="admin-content">
          <section className="admin-welcome"><div><span className="admin-eyebrow">MAVIS · PUBLICATION CONTROL</span><h1>انتشار، آرشیو و نسخه‌ها</h1><p>انتشار فقط پس از تأیید نسخه فعلی ممکن است؛ بازگردانی نسخه قبلی، مقاله را دوباره به پیش‌نویس تبدیل می‌کند.</p></div><div className="admin-status"><i /> دسترسی مدیر تأیید شده</div></section>
          <MavisPublicationManager article={article} versions={versionResult.data || []} approvals={approvalResult.data || []} />
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
