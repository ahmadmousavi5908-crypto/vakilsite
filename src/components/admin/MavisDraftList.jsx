import Link from "next/link";
import styles from "./MavisDraftList.module.css";

const STATUS_LABELS = {
  draft: "پیش‌نویس",
  changes_requested: "نیازمند اصلاح",
  needs_update: "نیازمند به‌روزرسانی",
};

export default function MavisDraftList({ rows = [], nextCursor = null, error = null }) {
  return (
    <section className={styles.panel} aria-labelledby="mavis-draft-list-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DATABASE EDITORIAL RECORDS</span>
          <h2 id="mavis-draft-list-title">پیش‌نویس‌های ذخیره‌شده</h2>
          <p>این فهرست از دیتابیس و با دسترسی مدیر خوانده می‌شود؛ فقط وضعیت‌های قابل ویرایش نمایش داده می‌شوند.</p>
        </div>
        <strong className={styles.count}>{rows.length.toLocaleString("fa-IR")} مورد</strong>
      </header>

      {error ? (
        <div className={styles.notice} role="status">
          <strong>فهرست دیتابیسی در دسترس نیست.</strong>
          <p>{error}</p>
          <small>تا زمان اعمال migrationهای CMS، پیش‌نمایش محتوای فعلی سایت همچنان جداگانه قابل مشاهده است.</small>
        </div>
      ) : rows.length ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>عنوان</th><th>دسته‌بندی</th><th>وضعیت</th><th>نسخه</th><th>آخرین تغییر</th><th>عملیات</th></tr></thead>
              <tbody>
                {rows.map((article) => (
                  <tr key={article.id}>
                    <td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td>
                    <td>{article.category}</td>
                    <td><span className={styles.status}>{STATUS_LABELS[article.status] || article.status}</span></td>
                    <td>{Number(article.current_version).toLocaleString("fa-IR")}</td>
                    <td><time dateTime={article.updated_at}>{new Date(article.updated_at).toLocaleString("fa-IR")}</time></td>
                    <td><Link href={`/admin/mavis/articles/${article.id}/edit`}>ویرایش پیش‌نویس</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextCursor ? <nav className={styles.pagination} aria-label="صفحه‌بندی پیش‌نویس‌ها"><Link href={`/admin/mavis/articles?cursor=${encodeURIComponent(nextCursor)}`}>پیش‌نویس‌های قدیمی‌تر ←</Link></nav> : null}
        </>
      ) : (
        <div className={styles.empty}>هنوز پیش‌نویس قابل ویرایشی در دیتابیس ثبت نشده است.</div>
      )}
    </section>
  );
}
