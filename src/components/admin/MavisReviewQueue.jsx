import Link from "next/link";
import styles from "./MavisReviewQueue.module.css";

export default function MavisReviewQueue({ rows = [], error = null }) {
  return (
    <section className={styles.panel} aria-labelledby="mavis-review-queue-title">
      <header><div><span className={styles.eyebrow}>EDITORIAL REVIEW</span><h2 id="mavis-review-queue-title">صف بازبینی مدیر</h2><p>هر ردیف به نسخه ثابت و مشخصی از مقاله متصل است.</p></div><strong>{rows.length.toLocaleString("fa-IR")} مورد</strong></header>
      {error ? <p className={styles.error}>{error}</p> : rows.length ? (
        <div className={styles.tableWrap}><table><thead><tr><th>عنوان مقاله</th><th>دسته‌بندی</th><th>نسخه ارسالی</th><th>آخرین تغییر</th><th>عملیات</th></tr></thead><tbody>
          {rows.map(article=><tr key={article.id}><td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td><td>{article.category}</td><td>{article.current_version.toLocaleString("fa-IR")}</td><td><time dateTime={article.updated_at}>{new Date(article.updated_at).toLocaleString("fa-IR")}</time></td><td><Link href={`/admin/mavis/articles/${article.id}/review`}>بررسی نسخه ←</Link></td></tr>)}
        </tbody></table></div>
      ) : <p className={styles.empty}>در حال حاضر مقاله‌ای در صف بازبینی نیست.</p>}
    </section>
  );
}
