"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveMavisArticle,
  publishMavisArticle,
  restoreMavisArticle,
  rollbackMavisArticleVersion,
} from "../../app/admin/mavis/articles/actions";
import styles from "./MavisPublicationManager.module.css";

const STATUS_LABELS = {
  draft: "پیش‌نویس",
  in_review: "در صف بازبینی",
  approved: "تأییدشده",
  published: "منتشرشده",
  changes_requested: "نیازمند اصلاح",
  rejected: "ردشده",
  needs_update: "نیازمند به‌روزرسانی",
  archived: "آرشیوشده",
};

const DECISION_LABELS = {
  approved: "تأیید",
  changes_requested: "درخواست اصلاح",
  rejected: "رد",
};

export default function MavisPublicationManager({ article, versions = [], approvals = [] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [targetVersion, setTargetVersion] = useState(() => {
    const previous = versions.find((version) => version.version < article.current_version);
    return previous ? String(previous.version) : "";
  });
  const [pending, setPending] = useState("");
  const [feedback, setFeedback] = useState(null);

  const currentApproved = approvals.some((item) =>
    item.article_version === article.current_version && item.decision === "approved"
  );
  const rollbackVersions = versions.filter((version) => version.version < article.current_version);
  const canArchive = ["draft", "approved", "published", "changes_requested", "rejected", "needs_update"].includes(article.status);
  const canRollback = ["draft", "approved", "published", "changes_requested", "needs_update"].includes(article.status) && rollbackVersions.length > 0;

  async function runAction(key, action, confirmation) {
    if (pending) return;
    if (confirmation && !window.confirm(confirmation)) return;
    setPending(key);
    setFeedback(null);
    try {
      const result = await action();
      if (!result?.ok) {
        setFeedback({ type: "error", message: result?.error || "عملیات انجام نشد." });
        return;
      }
      setFeedback({ type: "success", message: "عملیات با موفقیت ثبت شد." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "ارتباط با سرور برقرار نشد. وضعیت مقاله را دوباره بررسی کنید." });
    } finally {
      setPending("");
    }
  }

  return (
    <section className={styles.workspace} dir="rtl" aria-labelledby="publication-manager-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>PUBLISHING & VERSION CONTROL</span><h2 id="publication-manager-title">مدیریت انتشار و نسخه‌ها</h2><p>هر عملیات به نسخه فعلی متصل است؛ بازگردانی نسخه قبلی همیشه مقاله را به پیش‌نویس برمی‌گرداند.</p></div>
        <span className={styles.status}>{STATUS_LABELS[article.status] || article.status}</span>
      </header>

      <section className={styles.summary}>
        <div><small>عنوان مقاله</small><strong>{article.title}</strong></div>
        <div><small>نسخه فعلی</small><strong>{article.current_version.toLocaleString("fa-IR")}</strong></div>
        <div><small>آخرین تغییر</small><strong>{new Date(article.updated_at).toLocaleString("fa-IR")}</strong></div>
      </section>

      <section className={styles.actions}>
        <h3>عملیات وضعیت</h3>
        {article.status === "approved" ? (
          <div className={styles.actionCard}>
            <div><strong>انتشار نسخه تأییدشده</strong><p>فقط نسخه فعلی که تأیید معتبر دارد منتشر می‌شود.</p></div>
            <button type="button" disabled={Boolean(pending) || !currentApproved} onClick={() => runAction("publish", () => publishMavisArticle(article.id, article.current_version), "نسخه " + article.current_version + " را که تأیید شده است منتشر می‌کنید؟")}>{pending === "publish" ? "در حال انتشار..." : "انتشار مقاله"}</button>
            {!currentApproved ? <small>برای نسخه فعلی، رکورد تأیید معتبر پیدا نشد.</small> : null}
          </div>
        ) : null}

        {article.status === "archived" ? (
          <div className={styles.actionCard}>
            <div><strong>بازیابی از آرشیو</strong><p>مقاله‌ای که قبلاً منتشر شده باشد به وضعیت تأییدشده برمی‌گردد و برای انتشار دوباره نیازمند اقدام جداگانه است.</p></div>
            <button type="button" disabled={Boolean(pending)} onClick={() => runAction("restore", () => restoreMavisArticle(article.id, article.current_version), "مقاله از آرشیو بازیابی شود؟ اگر قبلاً منتشر شده باشد، دوباره منتشر نخواهد شد.")}>{pending === "restore" ? "در حال بازیابی..." : "بازیابی مقاله"}</button>
          </div>
        ) : null}

        {canArchive ? (
          <div className={styles.actionCard}>
            <div><strong>انتقال به آرشیو</strong><p>مقاله از دسترس عمومی خارج می‌شود و وضعیت قبلی برای بازیابی ثبت خواهد شد.</p></div>
            <button type="button" className={styles.archiveButton} disabled={Boolean(pending)} onClick={() => runAction("archive", () => archiveMavisArticle(article.id, article.current_version, note.trim()), "مقاله به آرشیو منتقل و از دسترس عمومی خارج شود؟")}>{pending === "archive" ? "در حال آرشیو..." : "آرشیو مقاله"}</button>
          </div>
        ) : null}
        {canArchive ? <label className={styles.note}><span>یادداشت عملیات (اختیاری)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} placeholder="دلیل آرشیو یا توضیح داخلی..." /></label> : null}
      </section>

      <section className={styles.rollback}>
        <h3>بازگردانی به نسخه قبلی</h3>
        {canRollback ? (
          <>
            <p>نسخه موردنظر به‌عنوان یک نسخه جدید کپی می‌شود. مقاله به پیش‌نویس برمی‌گردد و انتشار قبلی لغو می‌شود.</p>
            <label><span>نسخه مقصد</span><select value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)}><option value="">انتخاب نسخه</option>{rollbackVersions.map((version) => <option key={version.version} value={version.version}>نسخه {version.version.toLocaleString("fa-IR")} · {new Date(version.created_at).toLocaleString("fa-IR")}</option>)}</select></label>
            <button type="button" disabled={Boolean(pending) || !targetVersion} onClick={() => runAction("rollback", () => rollbackMavisArticleVersion(article.id, article.current_version, Number(targetVersion), note.trim()), "نسخه انتخاب‌شده به‌عنوان نسخه جدید کپی شود؟ مقاله از انتشار خارج و به پیش‌نویس برمی‌گردد.")}>{pending === "rollback" ? "در حال بازگردانی..." : "ساخت نسخه جدید از نسخه انتخاب‌شده"}</button>
          </>
        ) : <p>برای وضعیت فعلی، نسخه قبلی قابل بازگردانی نیست یا نسخه قدیمی‌تری وجود ندارد.</p>}
      </section>

      <section className={styles.history}>
        <h3>تاریخچه نسخه‌ها و تصمیم‌ها</h3>
        <div className={styles.tableWrap}><table><thead><tr><th>نسخه</th><th>عنوان ذخیره‌شده</th><th>تاریخ</th><th>یادداشت تغییر</th></tr></thead><tbody>
          {versions.map((version) => <tr key={version.version}><td>{version.version.toLocaleString("fa-IR")}</td><td>{version.snapshot?.title || "بدون عنوان"}</td><td><time dateTime={version.created_at}>{new Date(version.created_at).toLocaleString("fa-IR")}</time></td><td>{version.change_note || "بدون یادداشت"}</td></tr>)}
        </tbody></table></div>
        {approvals.length ? <div className={styles.approvals}><h4>سوابق بازبینی</h4>{approvals.map((item) => <div key={item.id}><strong>نسخه {item.article_version.toLocaleString("fa-IR")} · {DECISION_LABELS[item.decision] || item.decision}</strong><small>{new Date(item.created_at).toLocaleString("fa-IR")}</small>{item.decision_note ? <p>{item.decision_note}</p> : null}</div>)}</div> : null}
      </section>
      {feedback ? <p className={styles.feedback} data-state={feedback.type} role="status" aria-live="polite">{feedback.message}</p> : null}
    </section>
  );
}
