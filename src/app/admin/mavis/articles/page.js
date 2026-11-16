import Link from "next/link";
import { redirect } from "next/navigation";
import { articles } from "../../../../data/articles";
import MavisArticleCatalog from "../../../../components/admin/MavisArticleCatalog";
import MavisDraftList from "../../../../components/admin/MavisDraftList";
import MavisSourceDiscovery from "../../../../components/admin/MavisSourceDiscovery";
import MavisSourceCandidateQueue from "../../../../components/admin/MavisSourceCandidateQueue";
import MavisReviewQueue from "../../../../components/admin/MavisReviewQueue";
import MavisPublicationQueue from "../../../../components/admin/MavisPublicationQueue";
import MavisArchiveQueue from "../../../../components/admin/MavisArchiveQueue";
import MavisArticlesAccordion from "../../../../components/admin/MavisArticlesAccordion";
import { decodeMavisArticleCursor, encodeMavisArticleCursor } from "../../../../lib/mavis/editorial-cursor.mjs";
import { queryMavisEditorialArticles } from "../../../../lib/mavis/editorial-table.mjs";
import { requireAdmin } from "../../../../lib/supabase/admin";
import { signOut } from "../../../admin/actions";

export const metadata = {
  title: "کتابخانه مقالات | MAVIS",
  robots: { index: false, follow: false },
};

export default async function MavisArticlesPage({ searchParams }) {
  let access;
  try {
    access = await requireAdmin();
  } catch {
    redirect("/admin/login?error=authorization");
  }

  if (!access.configured) redirect("/admin/login?error=config");
  if (access.authenticationAvailable === false || access.adminCheckAvailable === false) {
    redirect("/admin/login?error=authorization");
  }
  if (!access.user) redirect("/admin/login");
  if (!access.isAdmin) redirect("/admin/login?error=unauthorized");

  const params = await searchParams;
  const cursorValue = typeof params?.cursor === "string" ? params.cursor : "";
  const searchQuery = typeof params?.q === "string" ? params.q.trim().slice(0, 100) : "";
  const allowedStatuses = ["all", "draft", "changes_requested", "needs_update", "in_review", "approved", "published", "archived", "rejected"];
  const requestedStatus = typeof params?.status === "string" ? params.status : "all";
  const articleStatus = allowedStatuses.includes(requestedStatus) ? requestedStatus : "all";
  const cursor = decodeMavisArticleCursor(cursorValue);
  let draftRows = [];
  let articleTotal = 0;
  let nextCursor = null;
  let draftError = null;

  if (cursorValue && !cursor) {
    draftError = "نشانی صفحه‌بندی معتبر نیست. از صفحه اول کتابخانه شروع کنید.";
  } else {
    try {
      const { data, error, count } = await queryMavisEditorialArticles(access.supabase, (table) => {
        let query = table
          .select("id, slug, title, author_name, category, status, current_version, updated_at", { count: "exact" })
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(26);

        if (articleStatus !== "all") query = query.eq("status", articleStatus);
        const term = searchQuery.replace(/[%,_()]/g, " ").replace(/\s+/g, " ").trim();
        const pattern = term ? `%${term}%` : "";
        const searchFilter = pattern
          ? `or(title.ilike.${pattern},slug.ilike.${pattern},category.ilike.${pattern},author_name.ilike.${pattern})`
          : "";
        const cursorFilter = cursor
          ? `or(updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id}))`
          : "";

        if (searchFilter && cursorFilter) query = query.or(`and(${searchFilter},${cursorFilter})`);
        else if (searchFilter) query = query.or(searchFilter.slice(3, -1));
        else if (cursorFilter) query = query.or(cursorFilter.slice(3, -1));

        return query;
      });
      if (error) {
        draftError = error.code === "42P01" || error.code === "PGRST205"
          ? "جدول مقالات هنوز در این پایگاه داده ایجاد نشده است. migrationهای CMS باید در همین محیط اعمال شوند."
          : "خواندن پیش‌نویس‌ها انجام نشد. دسترسی مدیر و اتصال پایگاه داده را بررسی کنید.";
      } else {
        const rows = Array.isArray(data) ? data : [];
        articleTotal = Number.isInteger(count) ? count : rows.length;
        if (rows.length > 25) {
          const lastVisible = rows[24];
          nextCursor = encodeMavisArticleCursor(lastVisible, (cursor?.ordinal || 0) + 25);
          draftRows = rows.slice(0, 25);
        } else {
          draftRows = rows;
        }
      }
    } catch {
      draftError = "ارتباط امن با پایگاه داده برقرار نشد.";
    }
  }

  let reviewRows = [];
  let reviewError = null;
  try {
    const { data, error } = await queryMavisEditorialArticles(access.supabase, (table) =>
      table
        .select("id, slug, title, category, current_version, updated_at")
        .eq("status", "in_review")
        .order("updated_at", { ascending: false })
        .limit(50)
    );
    if (error) reviewError = "خواندن صف بازبینی انجام نشد. اتصال پایگاه داده را بررسی کنید.";
    else reviewRows = Array.isArray(data) ? data : [];
  } catch {
    reviewError = "ارتباط امن با پایگاه داده برقرار نشد.";
  }

  let approvedRows = [];
  let publishedRows = [];
  let publicationError = null;
  try {
    const [approvedResult, publishedResult] = await Promise.all([
      queryMavisEditorialArticles(access.supabase, (table) =>
        table
          .select("id, slug, title, category, current_version, updated_at")
          .eq("status", "approved")
          .order("updated_at", { ascending: false })
          .limit(50)
      ),
      queryMavisEditorialArticles(access.supabase, (table) =>
        table
          .select("id, slug, title, category, current_version, updated_at, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50)
      ),
    ]);
    if (approvedResult.error || publishedResult.error) {
      publicationError = "خواندن فهرست انتشار انجام نشد. migration انتشار باید در همین پایگاه داده اعمال شده باشد.";
    } else {
      approvedRows = Array.isArray(approvedResult.data) ? approvedResult.data : [];
      publishedRows = Array.isArray(publishedResult.data) ? publishedResult.data : [];
    }
  } catch {
    publicationError = "ارتباط امن برای خواندن وضعیت انتشار برقرار نشد.";
  }

  let archivedRows = [];
  let archiveError = null;
  try {
    const { data, error } = await queryMavisEditorialArticles(access.supabase, (table) =>
      table
        .select("id, slug, title, current_version, updated_at")
        .eq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(50)
    );
    if (error) archiveError = "خواندن فهرست آرشیو انجام نشد.";
    else archivedRows = Array.isArray(data) ? data : [];
  } catch {
    archiveError = "ارتباط امن با پایگاه داده برقرار نشد.";
  }


  const candidateCursorValue = typeof params?.candidateCursor === "string" ? params.candidateCursor : "";
  const candidateCursor = decodeMavisArticleCursor(candidateCursorValue);
  const requestedCandidateState = typeof params?.candidateState === "string" ? params.candidateState : "all";
  const candidateState = ["discovered", "imported", "ignored"].includes(requestedCandidateState) ? requestedCandidateState : "all";
  let candidateRows = [];
  let nextCandidateCursor = null;
  let candidateError = null;

  if (candidateCursorValue && !candidateCursor) {
    candidateError = "نشانی صفحه‌بندی صف منابع معتبر نیست. از صفحه اول شروع کنید.";
  } else {
    try {
      let candidateQuery = access.supabase
        .from("mavis_source_candidates")
        .select("id, provider, provider_record_id, doi, title, authors, publisher, venue, publication_date_text, state, canonical_url, imported_article_id, updated_at")
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(26);

      if (candidateState !== "all") candidateQuery = candidateQuery.eq("state", candidateState);
      if (candidateCursor) {
        candidateQuery = candidateQuery.or(`updated_at.lt.${candidateCursor.updatedAt},and(updated_at.eq.${candidateCursor.updatedAt},id.lt.${candidateCursor.id})`);
      }

      const { data, error } = await candidateQuery;
      if (error) {
        candidateError = error.code === "42P01" || error.code === "PGRST205"
          ? "صف پایدار منابع هنوز روی این پایگاه داده فعال نشده است؛ migration شماره ۰۱۵ باید اعمال شود."
          : "خواندن صف منابع انجام نشد. اتصال پایگاه داده و دسترسی مدیر را بررسی کنید.";
      } else {
        const rows = Array.isArray(data) ? data : [];
        if (rows.length > 25) {
          nextCandidateCursor = encodeMavisArticleCursor(rows[24]);
          candidateRows = rows.slice(0, 25);
        } else {
          candidateRows = rows;
        }
      }
    } catch {
      candidateError = "ارتباط امن با پایگاه داده برای خواندن صف منابع برقرار نشد.";
    }
  }

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">و</span>
          <span><strong>مدیریت سایت</strong><small>پنل خدمات حقوقی</small></span>
        </Link>
        <nav className="admin-nav" aria-label="منوی مدیریت">
          <Link href="/admin">داشبورد</Link>
          <Link href="/admin/mavis">مرکز دانش MAVIS</Link>
          <Link href="/admin/mavis/growth">هوشمندی رشد و محتوا</Link>
          <Link className="active" href="/admin/mavis/articles">کتابخانه مقالات</Link>
        </nav>
        <div className="admin-sidebar-foot">
          <span>دسترسی مدیر</span>
          <Link href="/">مشاهده وب‌سایت ←</Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div><span>فضای مدیریت / MAVIS</span><strong>کتابخانه مقالات</strong></div>
          <form action={signOut}><button type="submit">خروج امن</button></form>
        </header>
        <main className="admin-content">
          <section className="admin-welcome">
            <div>
              <span className="admin-eyebrow">MAVIS · CONTENT WORKSPACE</span>
              <h1>مدیریت و بازبینی مقالات</h1>
              <p>جست‌وجوی وب، ساخت پیش‌نویس، ویرایش نسخه‌ها، بازبینی و انتشار کنترل‌شده مقالات.</p>
              <Link href="/admin/mavis/articles/new">ایجاد مقاله جدید ←</Link>
            </div>
            <div className="admin-status"><i /> دسترسی مدیر تأیید شده</div>
          </section>
          <MavisArticlesAccordion>
            <details className="admin-help">
              <summary>جست‌وجوی تخصصی چندمنبعی (اختیاری)</summary>
              <p>مسیر اصلی تولید مقاله از جست‌وجوی عمومی وب و استخراج اطلاعات در فرم مقاله استفاده می‌کند. ابزارهای قدیمی منابع علمی در صورت نیاز اینجا در دسترس‌اند.</p>
              <MavisSourceDiscovery />
              <MavisSourceCandidateQueue rows={candidateRows} nextCursor={nextCandidateCursor} stateFilter={candidateState} error={candidateError} />
            </details>
            <MavisReviewQueue rows={reviewRows} error={reviewError} />
            <MavisPublicationQueue approvedRows={approvedRows} publishedRows={publishedRows} error={publicationError} />
            <MavisArchiveQueue rows={archivedRows} error={archiveError} />
            <MavisDraftList rows={draftRows} nextCursor={nextCursor} nextHref={nextCursor ? (() => {
              const next = new URLSearchParams();
              next.set("cursor", nextCursor);
              if (searchQuery) next.set("q", searchQuery);
              if (articleStatus !== "all") next.set("status", articleStatus);
              return "/admin/mavis/articles?" + next.toString();
            })() : null} rowStart={cursor?.ordinal || 0} initialQuery={searchQuery} initialStatus={articleStatus} totalCount={articleTotal} error={draftError} />
            <MavisArticleCatalog articles={articles} />
          </MavisArticlesAccordion>
          <section className="admin-help">
            <strong>وضعیت این مرحله</strong>
            <p>جست‌وجوی منابع و ساخت پیش‌نویس فراداده‌ای فعال است. پیش‌نویس پس از ذخیره نسخه مشخص می‌تواند وارد صف بازبینی شود. تصمیم بازبین به همان نسخه متصل است؛ انتشار و لغو انتشار نیز عملیات جداگانه مدیر و نسخه‌محور هستند. صفحه عمومی فعلی تا تکمیل مسیر دیتابیسی بدون تغییر باقی می‌ماند. آرشیو و بازگردانی نسخه‌ها از فهرست آرشیو مدیریت می‌شود.</p>
          </section>
          <span className="admin-user-note">حساب مدیر: {access.user.email || "حساب تأییدشده"}</span>
        </main>
      </div>
    </div>
  );
}
