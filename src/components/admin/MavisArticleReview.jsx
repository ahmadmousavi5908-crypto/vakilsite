"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideMavisArticleReview } from "../../app/admin/mavis/articles/actions";
import styles from "./MavisArticleReview.module.css";

const DECISIONS = [
  { value: "approved", label: "تأیید این نسخه", tone: "approve" },
  { value: "changes_requested", label: "درخواست اصلاح", tone: "changes" },
  { value: "rejected", label: "رد مقاله", tone: "reject" },
];

export default function MavisArticleReview({ article, version, sources = [] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState("");
  const [feedback, setFeedback] = useState(null);

  async function decide(decision) {
    if (pending) return;
    if (decision !== "approved" && !note.trim()) {
      setFeedback({ type: "error", message: "برای درخواست اصلاح یا رد مقاله، دلیل روشن و قابل اقدام بنویسید." });
      return;
    }
    setPending(decision);
    setFeedback(null);
    try {
      const result = await decideMavisArticleReview(article.id, version.version, decision, note.trim());
      if (!result?.ok) {
        setFeedback({ type: "error", message: result?.error || "ثبت تصمیم بازبینی انجام نشد." });
        return;
      }
      setFeedback({ type: "success", message: "تصمیم بازبینی برای نسخه مشخص‌شده ثبت شد." });
      router.push("/admin/mavis/articles?review=completed");
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "ارتباط با سرور برقرار نشد. وضعیت مقاله را دوباره بررسی کنید." });
    } finally {
      setPending("");
    }
  }

  const snapshot = version.snapshot || {};
  const content = snapshot.content || {};

  return (
    <section className={styles.workspace} dir="rtl" aria-labelledby="review-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>IMMUTABLE REVIEW SNAPSHOT</span>
          <h2 id="review-title">بازبینی نسخه {version.version.toLocaleString("fa-IR")}</h2>
          <p>این صفحه دقیقاً نسخه ذخیره‌شده‌ای را نمایش می‌دهد که برای بازبینی ارسال شده است؛ نه تغییرات احتمالی بعدی.</p>
        </div>
        <span className={styles.versionBadge}>نسخه {version.version.toLocaleString("fa-IR")}</span>
      </header>

      <article className={styles.article}>
        <div className={styles.meta}>
          <span>{snapshot.category || article.category}</span>
          <span>{snapshot.author_name || "نام نویسنده ثبت نشده"}</span>
          <span dir="ltr">/{snapshot.slug || article.slug}</span>
        </div>
        <h1>{snapshot.title || article.title}</h1>
        <p className={styles.excerpt}>{snapshot.excerpt}</p>
        <section className={styles.contentBlock}>
          <h3>مقدمه</h3>
          <p>{content.intro}</p>
        </section>
        {Array.isArray(content.sections) ? content.sections.map((section, index) => (
          <section className={styles.contentBlock} key={index}>
            <h3>{section.heading}</h3>
            <p>{section.body}</p>
          </section>
        )) : null}
        {Array.isArray(content.checklist) && content.checklist.length ? (
          <section className={styles.contentBlock}>
            <h3>چک‌لیست</h3>
            <ul>{content.checklist.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </section>
        ) : null}
        {content.warning ? <aside className={styles.warning}>{content.warning}</aside> : null}
        <section className={styles.seo}>
          <h3>اطلاعات سئو</h3>
          <p><strong>عنوان:</strong> {snapshot.seo_title || "ثبت نشده"}</p>
          <p><strong>توضیحات:</strong> {snapshot.seo_description || "ثبت نشده"}</p>
        </section>
      </article>

      <section className={styles.sources}>
        <h3>منابع و وضعیت حقوق استفاده</h3>
        {sources.length ? sources.map((source) => (
          <div className={styles.source} key={source.id}>
            <div><strong>{source.title}</strong><small>{source.source_type} · وضعیت حقوق: {source.rights_status}</small></div>
            <a href={source.canonical_url} target="_blank" rel="noopener noreferrer">مشاهده منبع</a>
          </div>
        )) : <p>برای این مقاله منبع ثبت‌شده‌ای وجود ندارد.</p>}
        <p className={styles.rightsNote}>تأیید مقاله به‌تنهایی مجوز بازنشر متن، چکیده یا تصویر منابع نیست. وضعیت حقوق استفاده باید جداگانه بررسی شود.</p>
      </section>

      <section className={styles.decision}>
        <h3>ثبت نتیجه بازبینی</h3>
        <label>
          <span>یادداشت بازبین (برای درخواست اصلاح یا رد الزامی است)</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} placeholder="ایرادها، اصلاحات لازم یا توضیح تصمیم را روشن بنویسید..." />
        </label>
        <div className={styles.actions}>
          {DECISIONS.map((decision) => (
            <button key={decision.value} type="button" className={styles[decision.tone]} disabled={Boolean(pending)} onClick={() => decide(decision.value)}>
              {pending === decision.value ? "در حال ثبت..." : decision.label}
            </button>
          ))}
        </div>
        {feedback ? <p className={styles.feedback} data-state={feedback.type} role="status" aria-live="polite">{feedback.message}</p> : null}
      </section>
    </section>
  );
}
