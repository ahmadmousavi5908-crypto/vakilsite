"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishMavisArticle, unpublishMavisArticle } from "../../app/admin/mavis/articles/actions";
import styles from "./MavisPublicationQueue.module.css";

function formatDate(value) {
  if (!value) return "ثبت نشده";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ثبت نشده" : date.toLocaleString("fa-IR");
}

export default function MavisPublicationQueue({ approvedRows = [], publishedRows = [], error = null }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState("");
  const [confirmingKey, setConfirmingKey] = useState("");
  const [feedback, setFeedback] = useState(null);

  async function runAction(article, action) {
    const key = `${action}:${article.id}:${article.current_version}`;
    if (pendingKey) return;
    if (confirmingKey !== key) {
      setConfirmingKey(key);
      setFeedback(null);
      return;
    }

    setPendingKey(key);
    setFeedback(null);
    try {
      const result = action === "publish"
        ? await publishMavisArticle(article.id, article.current_version)
        : await unpublishMavisArticle(article.id, article.current_version);
      if (!result?.ok) {
        setFeedback({ type: "error", message: result?.error || "تغییر وضعیت انتشار انجام نشد." });
        setConfirmingKey("");
        return;
      }
      setFeedback({
        type: "success",
        message: action === "publish" ? "مقاله منتشر شد." : "انتشار مقاله لغو شد و مقاله به وضعیت تأییدشده بازگشت.",
      });
      setConfirmingKey("");
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "ارتباط با سرور برقرار نشد. وضعیت مقاله را دوباره بررسی کنید." });
      setConfirmingKey("");
    } finally {
      setPendingKey("");
    }
  }

  function renderTable(rows, action) {
    if (!rows.length) return <p className={styles.empty}>{action === "publish" ? "مقاله تأییدشده‌ای در انتظار انتشار نیست." : "مقاله منتشرشده‌ای برای لغو انتشار وجود ندارد."}</p>;
    return (
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>عنوان مقاله</th><th>دسته‌بندی</th><th>نسخه تأییدشده</th><th>{action === "publish" ? "آخرین تغییر" : "زمان انتشار"}</th><th>عملیات</th></tr></thead>
          <tbody>
            {rows.map((article) => {
              const key = `${action}:${article.id}:${article.current_version}`;
              const confirming = confirmingKey === key;
              const pending = pendingKey === key;
              return (
                <tr key={article.id}>
                  <td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td>
                  <td>{article.category}</td>
                  <td>{Number(article.current_version).toLocaleString("fa-IR")}</td>
                  <td><time dateTime={action === "publish" ? article.updated_at : article.published_at}>{formatDate(action === "publish" ? article.updated_at : article.published_at)}</time></td>
                  <td>
                    <button
                      type="button"
                      className={action === "publish" ? styles.publishButton : styles.unpublishButton}
                      disabled={Boolean(pendingKey)}
                      onClick={() => runAction(article, action)}
                    >
                      {pending ? "در حال ثبت..." : confirming ? "تأیید نهایی" : action === "publish" ? "انتشار مقاله" : "لغو انتشار"}
                    </button>
                    {confirming ? <small className={styles.confirmHint}>برای اجرای عملیات، دوباره تأیید کنید.</small> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="mavis-publication-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>CONTROLLED PUBLICATION</span><h2 id="mavis-publication-title">انتشار و مدیریت وضعیت عمومی</h2><p>انتشار فقط با اقدام جداگانه مدیر و برای همان نسخه تأییدشده انجام می‌شود.</p></div>
        <strong>{approvedRows.length.toLocaleString("fa-IR")} آماده انتشار</strong>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      {feedback ? <p className={styles[feedback.type]} role="status" aria-live="polite">{feedback.message}</p> : null}
      <section className={styles.group} aria-labelledby="mavis-approved-publication-title">
        <h3 id="mavis-approved-publication-title">نسخه‌های تأییدشده</h3>
        {renderTable(approvedRows, "publish")}
      </section>
      <section className={styles.group} aria-labelledby="mavis-live-publication-title">
        <h3 id="mavis-live-publication-title">مقالات منتشرشده</h3>
        {renderTable(publishedRows, "unpublish")}
      </section>
    </section>
  );
}
