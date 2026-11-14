import Link from "next/link";
import { createPublicContentClient } from "../../../lib/supabase/public-content";
import {
  decodePublishedArticleCursor,
  encodePublishedArticleCursor,
} from "../../../lib/mavis/published-article-cursor.mjs";
import styles from "./page.module.css";

export const metadata = {
  title: "فهرست مقالات حقوقی | سید احمد موسوی",
  description: "فهرست قابل جست‌وجو و دسته‌بندی مقالات حقوقی منتشرشده؛ با دسترسی مستقیم به متن هر مقاله و اطلاعات انتشار.",
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
  const cursorValue = typeof params?.cursor === "string" ? params.cursor : "";
  const cursor = decodePublishedArticleCursor(cursorValue);
  let rows = [];
  let nextCursor = null;
  let loadError = "";

  if (cursorValue && !cursor) {
    loadError = "نشانی صفحه‌بندی معتبر نیست. جست‌وجو را از صفحه اول آغاز کنید.";
  } else {
    try {
      const supabase = createPublicContentClient();
      if (!supabase) throw new Error("Public CMS is not configured");
      let query = supabase
        .from("mavis_articles")
        .select("id, slug, title, excerpt, category, author_name, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(26);

      if (search) query = query.ilike("title", "%" + search + "%");
      if (category) query = query.eq("category", category);
      if (cursor) {
        query = query.or(
          "published_at.lt." + cursor.publishedAt +
          ",and(published_at.eq." + cursor.publishedAt + ",id.lt." + cursor.id + ")",
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      const resultRows = Array.isArray(data) ? data : [];
      if (resultRows.length > 25) {
        nextCursor = encodePublishedArticleCursor(resultRows[24]);
        rows = resultRows.slice(0, 25);
      } else {
        rows = resultRows;
      }
    } catch {
      loadError = "فهرست مقالات در حال حاضر در دسترس نیست. راهنماهای ثابت دانشنامه همچنان از صفحه مقالات قابل مطالعه‌اند.";
    }
  }

  const nextParams = new URLSearchParams();
  if (search) nextParams.set("q", search);
  if (category) nextParams.set("category", category);
  if (nextCursor) nextParams.set("cursor", nextCursor);
  const nextHref = "/articles/library?" + nextParams.toString();

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
          <span className={styles.count}>{rows.length.toLocaleString("fa-IR")} مقاله در این صفحه</span>
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
                      <td className={styles.rowNumber}>{(index + 1).toLocaleString("fa-IR")}</td>
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
            {nextCursor ? <nav className={styles.pagination} aria-label="صفحه‌بندی مقالات"><Link href={nextHref}>مقالات قدیمی‌تر ←</Link></nav> : null}
          </>
        ) : (
          <div className={styles.empty}>در این جست‌وجو مقاله منتشرشده‌ای پیدا نشد.</div>
        )}
        <p className={styles.disclaimer}>این فهرست فقط شامل مقاله‌هایی است که پس از تکمیل و بازبینی مدیر به‌صورت عمومی منتشر شده‌اند. نتایج جست‌وجو و پیش‌نویس‌ها در این صفحه نمایش داده نمی‌شوند.</p>
        <Link href="/articles" className={styles.backLink}>← بازگشت به دانشنامه و راهنماهای حقوقی</Link>
      </section>
      <footer className={styles.footer}><div className={styles.container}><span>دانشنامه حقوقی · سید احمد موسوی</span><Link href="/">صفحه اصلی</Link></div></footer>
    </main>
  );
}
