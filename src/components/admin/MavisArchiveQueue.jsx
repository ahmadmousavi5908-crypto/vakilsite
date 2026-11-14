import Link from "next/link";
import styles from "./MavisArchiveQueue.module.css";

export default function MavisArchiveQueue({ rows = [], error = null }) {
  return (
    <section className={styles.panel} aria-labelledby="mavis-archive-queue-title">
      <header><div><span className={styles.eyebrow}>ARCHIVE & RESTORE</span><h2 id="mavis-archive-queue-title">آرشیو مقالات</h2><p>بازیابی مقاله آرشیوشده، آن را منتشر نمی‌کند؛ انتشار دوباره نیازمند تأیید و اقدام جداگانه است.</p></div><strong>{rows.length.toLocaleString("fa-IR")} مورد نخست</strong></header>
      {error ? <p className={styles.error}>{error}</p> : rows.length ? (
        <div className={styles.tableWrap}><table><thead><tr><th>عنوان مقاله</th><th>نسخه فعلی</th><th>آخرین تغییر</th><th>عملیات</th></tr></thead><tbody>
          {rows.map(article=><tr key={article.id}><td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td><td>{article.current_version.toLocaleString("fa-IR")}</td><td><time dateTime={article.updated_at}>{new Date(article.updated_at).toLocaleString("fa-IR")}</time></td><td><Link href={"/admin/mavis/articles/" + article.id + "/manage"}>بازیابی و مدیریت نسخه‌ها ←</Link></td></tr>)}
        </tbody></table></div>
      ) : <p className={styles.empty}>مقاله‌ای در آرشیو وجود ندارد.</p>}
    </section>
  );
}
