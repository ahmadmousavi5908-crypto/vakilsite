import Link from "next/link";
import { redirect } from "next/navigation";
import { articles as siteArticles } from "../../../../data/articles";
import { requireAdmin } from "../../../../lib/supabase/admin";
import MavisEditorialStudio from "../../../../components/admin/MavisEditorialStudio";
import { signOut } from "../../actions";

export const metadata = {
  title: "میز تحریریه MAVIS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MavisEditorialPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, user, isAdmin, configured, authenticationAvailable, adminCheckAvailable } = await requireAdmin();
  if (!configured) redirect("/admin/login?error=config");
  if (authenticationAvailable === false) redirect("/admin/login?error=authorization");
  if (!user) redirect("/admin/login");
  if (adminCheckAvailable === false || !isAdmin) redirect("/admin/login?error=unauthorized");

  const { data, error } = await supabase
    .from("mavis_editorial_articles")
    .select("id,slug,draft_content,published_content,status,legal_review_status,author_name,reviewer_name,is_indexable,published_at,updated_at,draft_updated_at")
    .order("updated_at", { ascending: false });

  const records = Array.isArray(data) ? data : [];
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  const merged = siteArticles.map((article) => {
    const record = bySlug.get(article.slug);
    if (!record) return { ...article, source: "site", status: "site_published", isIndexable: true };
    return {
      ...article,
      ...(record.draft_content || {}),
      id: record.id,
      slug: record.slug,
      source: "cms",
      status: record.status,
      legalReviewStatus: record.legal_review_status,
      authorName: record.author_name,
      reviewerName: record.reviewer_name,
      isIndexable: record.is_indexable,
      publishedAt: record.published_at,
      updatedAt: record.draft_updated_at || record.updated_at,
      hasPublishedSnapshot: Boolean(record.published_content),
    };
  });
  for (const record of records) {
    if (siteArticles.some((article) => article.slug === record.slug)) continue;
    merged.push({
      ...(record.draft_content || {}),
      id: record.id,
      slug: record.slug,
      source: "cms",
      status: record.status,
      legalReviewStatus: record.legal_review_status,
      authorName: record.author_name,
      reviewerName: record.reviewer_name,
      isIndexable: record.is_indexable,
      publishedAt: record.published_at,
      updatedAt: record.draft_updated_at || record.updated_at,
      hasPublishedSnapshot: Boolean(record.published_content),
    });
  }

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span className="admin-brand-mark">و</span><span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span></Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link className="active" href="/admin/mavis/editorial">میز تحریریه</Link>
          <a href="#editorial-table">بانک مقالات</a>
          <a href="#article-editor">ویرایشگر مقاله</a>
        </nav>
        <div className="admin-sidebar-foot"><span>دسترسی مدیر</span><Link href="/">مشاهده وب‌سایت ←</Link></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><span>فضای مدیریت / MAVIS</span><strong>میز تحریریه و مدیریت محتوا</strong></div>
          <form action={signOut}><button type="submit">خروج امن</button></form>
        </header>
        <main className="admin-content">
          <section className="admin-welcome">
            <div><span className="admin-eyebrow">MAVIS EDITORIAL STUDIO</span><h1>میز تحریریه هوشمند</h1><p>بانک یکپارچه مقالات، ویرایش نسخه‌ها، کنترل بازبینی حقوقی و انتشار دستی؛ بدون تغییر خودکار محتوای سایت.</p></div>
            <div className="admin-status"><i /> محیط خصوصی مدیر</div>
          </section>
          {params?.saved ? <div className="admin-alert success" role="status">پیش‌نویس ذخیره شد؛ نسخه منتشرشده تغییری نکرد.</div> : null}
          {params?.published ? <div className="admin-alert success" role="status">نسخه جدید با دستور مدیر منتشر شد.</div> : null}
          {params?.error ? <div className="admin-alert error" role="alert">{params.error === "review" ? "برای انتشار، نام نویسنده و بازبین، تأیید بازبینی حقوقی و حداقل یک منبع معتبر لازم است." : params.error === "validation" ? "اطلاعات مقاله کامل نیست؛ عنوان، نشانی، خلاصه، مقدمه و متن را بررسی کنید." : "ذخیره اطلاعات انجام نشد. وضعیت مهاجرت پایگاه داده و دسترسی مدیر را بررسی کنید."}</div> : null}
          {error ? <div className="admin-alert error" role="alert">خواندن بانک مقالات انجام نشد؛ ابتدا مهاجرت شماره ۰۰۶ را اجرا کنید.</div> : null}
          <MavisEditorialStudio articles={merged} />
          <section className="admin-help"><strong>اصل کنترل انتشار</strong><p>ویرایش و ذخیره پیش‌نویس، نسخه عمومی را تغییر نمی‌دهد. فقط دکمه انتشار پس از تأیید صریح مدیر، نسخه جدید را در صفحات عمومی جایگزین می‌کند. آمار موتورهای جست‌وجو در بخش هوشمندی رشد و با اتصال واقعی ارائه می‌شود.</p></section>
          <span className="admin-user-note">حساب مدیر: {user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
