import Link from "next/link";
import { createPublicContentClient } from "../../../lib/supabase/public-content";
import styles from "./page.module.css";

export const metadata = {
  title: "کتابخانه حقوقی | سید احمد موسوی",
  description: "کتابخانه قابل جست‌وجوی قوانین، آرای وحدت رویه، نظریات مشورتی، تفسیرها و تحلیل‌های حقوقی منتشرشده.",
  alternates: { canonical: "/articles/library" },
};

function normalizeTerm(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[%_*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatDate(value) {
  if (!value) return "نامشخص";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "نامشخص";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

export default async function PublicArticleLibraryPage({ searchParams }) {
  const params = await searchParams;
  const search = normalizeTerm(params?.q, 100);
  const category = normalizeTerm(params?.category, 80);
  const requestedType = normalizeTerm(params?.type, 40);
  const allowedRecordTypes = new Set(["law", "unifying_opinion", "judicial_decision", "advisory_opinion", "legal_interpretation", "legal_analysis", "official_circular", "academic_research"]);
  const selectedRecordType = allowedRecordTypes.has(requestedType) ? requestedType : "";
  const requestedPage = typeof params?.page === "string" && /^\d{1,5}$/.test(params.page)
    ? Math.max(1, Number(params.page))
    : 1;
  let currentPage = requestedPage;
  const recordTypeLabels = { article: "مقاله حقوقی", law: "قانون یا مقرره", unifying_opinion: "رأی وحدت رویه", judicial_decision: "رأی قضایی", advisory_opinion: "نظریه مشورتی", legal_interpretation: "تفسیر و شرح قانون", legal_analysis: "تحلیل مسئله حقوقی", official_circular: "بخشنامه و دستورالعمل", academic_research: "پژوهش علمی" };
  let rows = [];
  let totalCount = 0;
  let totalPages = 1;
  let loadError = "";

  try {
    const supabase = createPublicContentClient();
    if (!supabase) throw new Error("Public CMS is not configured");

    const buildPageQuery = (pageNumber) => {
      let query = supabase
        .from("mavis_articles")
        .select("id, slug, title, excerpt, category, author_name, published_at, record_type:content->>record_type", { count: "exact" })
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .range((pageNumber - 1) * 25, pageNumber * 25 - 1);

      if (search) query = query.ilike("title", "%" + search + "%");
      if (category) query = query.eq("category", category);
      if (selectedRecordType) query = query.eq("content->>record_type", selectedRecordType);
      return query;
    };

    let result = await buildPageQuery(currentPage);
    if (result.error) throw result.error;
    totalCount = Number(result.count) || 0;
    totalPages = Math.max(1, Math.ceil(totalCount / 25));

    if (currentPage > totalPages) {
      currentPage = totalPages;
      result = await buildPageQuery(currentPage);
      if (result.error) throw result.error;
    }

    rows = Array.isArray(result.data) ? result.data : [];
  } catch {
    loadError = "فهرست مقالات در حال حاضر در دسترس نیست. راهنماهای ثابت دانشنامه همچنان از صفحه مقالات قابل مطالعه‌اند.";
  }

  const buildPageHref = (pageNumber) => {
    const pageParams = new URLSearchParams();
    if (search) pageParams.set("q", search);
    if (category) pageParams.set("category", category);
    if (selectedRecordType) pageParams.set("type", selectedRecordType);
    if (pageNumber > 1) pageParams.set("page", String(pageNumber));
    const queryString = pageParams.toString();
    return "/articles/library" + (queryString ? "?" + queryString : "");
  };
  const previousHref = buildPageHref(currentPage - 1);
  const nextHref = buildPageHref(currentPage + 1);

  return (
    <main className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/articles" className={styles.brand}>دانشنامه حقوقی <span>سید احمد موسوی</span></Link>
          <Link href="/#contact" className={styles.headerCta}>درخواست بررسی اولیه ←</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
            <Link href="/">صفحه اصلی</Link><span>←</span><Link href="/articles">مقالات حقوقی</Link><span>←</span><span>فهرست مقالات</span>
          </nav>
          <span className={styles.kicker}>MAVIS · EDITORIAL LIBRARY</span>
          <h1>کتابخانه حقوقی</h1>
          <p>قوانین، آرا، نظریات و تحلیل‌های حقوقی بازبینی‌شده را جست‌وجو کنید؛ هر ردیف صفحه مستقل خود را دارد.</p>
        </div>
      </section>

      <section className={styles.container + " " + styles.content}>
        <form className={styles.filters} method="get" action="/articles/library">
          <label>
            <span>جست‌وجوی عنوان</span>
            <input name="q" type="search" maxLength={100} defaultValue={search} placeholder="عنوان مدرک را بنویسید..." />
          </label>
          <label>
            <span>نوع مدرک</span>
            <select name="type" defaultValue={selectedRecordType}>
              <option value="">همه انواع</option>
              {Object.entries(recordTypeLabels).filter(([key]) => key !== "article").map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>دسته‌بندی دقیق</span>
            <input name="category" maxLength={80} defaultValue={category} placeholder="مثلاً حقوق مدنی" />
          </label>
          <button type="submit">جست‌وجو در کتابخانه</button>
          <Link href="/articles/library" className={styles.reset}>پاک‌کردن فیلترها</Link>
        </form>

        <div className={styles.tableHeading}>
          <div><span className={styles.kicker}>PUBLISHED RECORDS</span><h2>فهرست اسناد منتشرشده</h2></div>
          <span className={styles.count}>{totalCount.toLocaleString("fa-IR")} مدرک منتشرشده · صفحه {currentPage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
        </div>

        {loadError ? (
          <div className={styles.notice} role="status">{loadError}</div>
        ) : rows.length ? (
          <>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th scope="col">ردیف</th><th scope="col">عنوان مدرک</th><th scope="col">نوع مدرک</th><th scope="col">دسته‌بندی</th><th scope="col">نویسنده</th><th scope="col">تاریخ انتشار</th><th scope="col">مطالعه</th></tr></thead>
                <tbody>
                  {rows.map((article, index) => (
                    <tr key={article.id}>
                      <td className={styles.rowNumber}>{((currentPage - 1) * 25 + index + 1).toLocaleString("fa-IR")}</td>
                      <td><strong>{article.title}</strong><small>{article.excerpt || "برای مشاهده متن کامل وارد صفحه مطالعه شوید."}</small></td>
                      <td><span className={styles.category}>{recordTypeLabels[article.record_type] || recordTypeLabels.article}</span></td>
                      <td><span className={styles.category}>{article.category || "عمومی"}</span></td>
                      <td>{article.author_name || "سید احمد موسوی"}</td>
                      <td><time dateTime={article.published_at}>{formatDate(article.published_at)}</time></td>
                      <td><Link href={"/articles/" + article.slug}>مشاهده مقاله ←</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="صفحه‌بندی کتابخانه">
                {currentPage > 1 ? <Link href={previousHref}>→ جدیدتر</Link> : <span aria-hidden="true" />}
                <span className={styles.pageStatus}>صفحه {currentPage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
                {currentPage < totalPages ? <Link href={nextHref}>قدیمی‌تر ←</Link> : <span aria-hidden="true" />}
              </nav>
            ) : null}
          </>
        ) : (
          <div className={styles.empty}>در این جست‌وجو مقاله منتشرشده‌ای پیدا نشد.</div>
        )}
        <p className={styles.disclaimer}>این فهرست فقط شامل مدارکی است که پس از تکمیل و بازبینی مدیر به‌صورت عمومی منتشر شده‌اند. نتایج جست‌وجو و پیش‌نویس‌ها در این صفحه نمایش داده نمی‌شوند.</p>
        <Link href="/articles" className={styles.backLink}>← بازگشت به دانشنامه و راهنماهای حقوقی</Link>
      </section>
      <footer className={styles.footer}><div className={styles.container}><span>دانشنامه حقوقی · سید احمد موسوی</span><Link href="/">صفحه اصلی</Link></div></footer>
    </main>
  );
}
