import Link from "next/link";
import { createPublicContentClient } from "../../../lib/supabase/public-content";
import styles from "./page.module.css";

export const metadata = {
  title: "فهرست مقالات حقوقی | سید احمد موسوی",
  description: "فهرست قابل جست‌وجو و دسته‌بندی مقالات حقوقی منتشرشده؛ با دسترسی مستقیم به متن هر مقاله و اطلاعات انتشار.",
  alternates: { canonical: "/articles/library" },
};

const PAGE_SIZE = 25;

function normalizeTerm(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[%_*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function parsePage(value) {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(value) {
  if (!value) return "نامشخص";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "نامشخص";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [...new Set([
    1,
    2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    totalPages - 1,
    totalPages,
  ])].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  return pages.reduce((items, page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push("ellipsis-" + page);
    items.push(page);
    return items;
  }, []);
}

function buildPageHref(page, search, category) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? "/articles/library?" + query : "/articles/library";
}

export default async function PublicArticleLibraryPage({ searchParams }) {
  const params = await searchParams;
  const search = normalizeTerm(params?.q, 100);
  const category = normalizeTerm(params?.category, 80);
  const requestedPage = parsePage(params?.page);
  let rows = [];
  let totalCount = 0;
  let page = requestedPage;
  let totalPages = 0;
  let loadError = "";

  try {
    const supabase = createPublicContentClient();
    if (!supabase) throw new Error("Public CMS is not configured");

    const buildQuery = (targetPage) => {
      let query = supabase
        .from("mavis_articles")
        .select("id, slug, title, excerpt, category, author_name, published_at", { count: "exact" })
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("id", { ascending: false });

      if (search) query = query.ilike("title", "%" + search + "%");
      if (category) query = query.eq("category", category);

      const from = (targetPage - 1) * PAGE_SIZE;
      return query.range(from, from + PAGE_SIZE - 1);
    };

    let result = await buildQuery(page);
    if (result.error) throw result.error;

    totalCount = Number.isInteger(result.count) ? result.count : 0;
    totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (totalPages > 0 && page > totalPages) {
      page = totalPages;
      result = await buildQuery(page);
      if (result.error) throw result.error;
    }

    rows = Array.isArray(result.data) ? result.data : [];
  } catch {
    loadError = "فهرست مقالات در حال حاضر در دسترس نیست. راهنماهای ثابت دانشنامه همچنان از صفحه مقالات قابل مطالعه‌اند.";
  }

  const pageItems = buildPageItems(page, totalPages);

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
          <h1>فهرست مقالات حقوقی</h1>
          <p>مقالات تکمیل‌شده و بازبینی‌شده را جست‌وجو کنید؛ هر ردیف به صفحه مطالعه همان مقاله می‌رسد.</p>
        </div>
      </section>

      <section className={styles.container + " " + styles.content}>
        <form className={styles.filters} method="get" action="/articles/library">
          <label>
            <span>جست‌وجوی عنوان</span>
            <input name="q" type="search" maxLength={100} defaultValue={search} placeholder="عنوان مقاله را بنویسید..." />
          </label>
          <label>
            <span>دسته‌بندی دقیق</span>
            <input name="category" maxLength={80} defaultValue={category} placeholder="مثلاً حقوق مدنی" />
          </label>
          <button type="submit">جست‌وجو در مقالات</button>
          <Link href="/articles/library" className={styles.reset}>پاک‌کردن فیلترها</Link>
        </form>

        <div className={styles.tableHeading}>
          <div><span className={styles.kicker}>PUBLISHED RECORDS</span><h2>کاربرگ مقالات منتشرشده</h2></div>
          <span className={styles.count}>{totalCount.toLocaleString("fa-IR")} مقاله · {rows.length.toLocaleString("fa-IR")} ردیف در این صفحه</span>
        </div>

        {loadError ? (
          <div className={styles.notice} role="status">{loadError}</div>
        ) : rows.length ? (
          <>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th scope="col">ردیف</th><th scope="col">عنوان مقاله</th><th scope="col">دسته‌بندی</th><th scope="col">نویسنده</th><th scope="col">تاریخ انتشار</th><th scope="col">مطالعه</th></tr></thead>
                <tbody>
                  {rows.map((article, index) => (
                    <tr key={article.id}>
                      <td className={styles.rowNumber}>{((page - 1) * PAGE_SIZE + index + 1).toLocaleString("fa-IR")}</td>
                      <td><strong>{article.title}</strong><small>{article.excerpt || "برای مشاهده متن کامل مقاله وارد صفحه مطالعه شوید."}</small></td>
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
              <nav className={styles.pagination} aria-label="صفحه‌بندی مقالات">
                <div className={styles.paginationMeta}>
                  <span>صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
                  <span>نمایش {Math.min((page - 1) * PAGE_SIZE + 1, totalCount).toLocaleString("fa-IR")} تا {Math.min(page * PAGE_SIZE, totalCount).toLocaleString("fa-IR")} از {totalCount.toLocaleString("fa-IR")} مقاله</span>
                </div>
                <div className={styles.paginationControls}>
                  {page > 1 ? <Link className={styles.pageDirection} href={buildPageHref(page - 1, search, category)}>صفحه قبل ←</Link> : <span className={styles.pageDisabled}>صفحه قبل ←</span>}
                  <div className={styles.pageNumbers}>
                    {pageItems.map((item) => typeof item === "number" ? (
                      <Link
                        key={item}
                        className={item === page ? styles.activePage : styles.pageNumber}
                        href={buildPageHref(item, search, category)}
                        aria-current={item === page ? "page" : undefined}
                        aria-label={"صفحه " + item}
                      >{item.toLocaleString("fa-IR")}</Link>
                    ) : <span className={styles.pageEllipsis} key={item}>…</span>)}
                  </div>
                  {page < totalPages ? <Link className={styles.pageDirection} href={buildPageHref(page + 1, search, category)}>صفحه بعد →</Link> : <span className={styles.pageDisabled}>صفحه بعد →</span>}
                </div>
              </nav>
            ) : null}
          </>
        ) : (
          <div className={styles.empty}>در این جست‌وجو مقاله منتشرشده‌ای پیدا نشد.</div>
        )}
        <p className={styles.disclaimer}>این فهرست فقط شامل مقاله‌هایی است که پس از تکمیل و بازبینی مدیر به‌صورت عمومی منتشر شده‌اند. پیش‌نویس‌ها و مقاله‌های تأییدنشده در این صفحه نمایش داده نمی‌شوند.</p>
        <Link href="/articles" className={styles.backLink}>← بازگشت به دانشنامه و راهنماهای حقوقی</Link>
      </section>
      <footer className={styles.footer}><div className={styles.container}><span>دانشنامه حقوقی · سید احمد موسوی</span><Link href="/">صفحه اصلی</Link></div></footer>
    </main>
  );
}
