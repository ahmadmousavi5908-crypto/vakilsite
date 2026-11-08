"use client";

import { useState } from "react";
import { safeExternalHttpUrl } from "../../lib/mavis/request-guards.mjs";
import styles from "./MavisResearchDossier.module.css";

const reviewLabels = {
  verified_primary_source: "تطبیق‌شده با منبع اولیه",
  secondary_source_only: "صرفاً منبع ثانویه",
  needs_legal_review: "نیازمند بازبینی حقوقی",
  draft: "پیش‌نویس",
};
const sourceLabels = {
  verified_primary_source: "تطبیق اولیه تأیید شده",
  secondary_source_only: "منبع ثانویه",
  official_url_identified_not_retrieved: "پیوند رسمی؛ سند دریافت نشده",
  unverified_source_link: "پیوند کشف؛ اعتبار تأیید نشده",
  unverified: "تأییدنشده",
};

export default function MavisResearchDossier() {
  const [query, setQuery] = useState("");
  const [dossier, setDossier] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const clean = query.trim();
    if (loading || clean.length < 2 || clean.length > 120) return;
    setLoading(true);
    setDossier(null);
    setError("");
    try {
      const response = await fetch("/api/mavis/research-dossier", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: clean, limit: 10 }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "بسته پژوهش ساخته نشد.");
      setDossier(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "خطای ناشناخته در پژوهش.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.workspace} aria-labelledby="mavis-dossier-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>LAWYER COPILOT · EVIDENCE ASSEMBLY</span><h2 id="mavis-dossier-title">ساخت بسته شواهد پژوهش حقوقی</h2><p>مدخل‌های مرتبط، ارجاع‌های ثبت‌شده و خلأهای اعتبارسنجی را برای بررسی وکیل کنار هم می‌چیند؛ بدون تولید نظر حقوقی.</p></div>
        <span className={styles.mark} aria-hidden="true">پ</span>
      </header>
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor="mavis-dossier-query">موضوع یا عبارت حقوقی</label>
        <div className={styles.searchRow}><input id="mavis-dossier-query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={120} required placeholder="مثلاً مطالبه وجه چک، الزام به تنظیم سند یا خیانت در امانت" /><button type="submit" disabled={loading || query.trim().length < 2}>{loading ? "در حال ساخت..." : "ساخت بسته پژوهش"}</button></div>
        <small>حداکثر ۱۰ مدخل از کتابخانه موجود؛ جست‌وجو و مرتب‌سازی کاملاً قطعی و داخلی است.</small>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading && <p className={styles.status} role="status">در حال گردآوری شواهد و خلأهای ثبت‌شده...</p>}
      {dossier && (
        <div className={styles.output}>
          <div className={styles.metrics}>
            <article><span>مدخل بازیابی‌شده</span><strong>{dossier.resultCount.toLocaleString("fa-IR")}</strong></article>
            <article><span>منبع اولیه تأییدشده</span><strong>{dossier.primarySourceVerifiedCount.toLocaleString("fa-IR")}</strong></article>
            <article><span>اعتبار روز تأییدشده</span><strong>{dossier.currentValidityVerifiedCount.toLocaleString("fa-IR")}</strong></article>
            <article><span>خلأهای پژوهش</span><strong>{dossier.gapCount.toLocaleString("fa-IR")}</strong></article>
          </div>
          <div className={styles.dossierHeading}><div><strong>بسته شواهد: {dossier.query}</strong><small>شناسه نسخه {dossier.version} · زمان ساخت {new Date(dossier.createdAt).toLocaleString("fa-IR")}</small></div><span className={styles.internal}>داخلی · مدیر</span></div>
          {dossier.items.map((item) => (
            <article className={styles.record} key={item.id}>
              <div className={styles.recordTop}><span>{item.recordType === "law" ? "قانون" : item.recordType === "article" ? "خلاصه ماده" : "اصطلاح حقوقی"}</span><span>{reviewLabels[item.reviewStatus] || "وضعیت بررسی نامشخص"}</span></div>
              <h3>{item.title}</h3>
              {item.articleNumber && <p className={styles.meta}>شماره ماده: {item.articleNumber}</p>}
              {item.excerpt && <p className={styles.excerpt}>{item.excerpt}</p>}
              <div className={styles.meta}>اعتبار روز: {item.currentValidityVerified ? "تأییدشده" : "تأییدنشده"} · منبع اولیه: {item.primarySourceVerified ? "تأییدشده" : "تأییدنشده"}</div>
              {item.sources.length > 0 && <div className={styles.sources}><strong>ارجاع‌ها</strong>{item.sources.map((source) => { const url = safeExternalHttpUrl(source.url); return url ? <a key={source.citationId} href={url} target="_blank" rel="noopener noreferrer">{source.title} <small>{sourceLabels[source.verificationStatus] || "وضعیت نامشخص"}</small></a> : null; })}</div>}
              <div className={styles.gaps}><strong>موارد نیازمند بررسی وکیل</strong><ul>{item.gaps.map((gap) => <li key={gap.code}>{gap.label}</li>)}</ul></div>
              {(item.relatedLawIds.length || item.relatedArticleIds.length || item.relatedTermIds.length) > 0 && <div className={styles.related}>ارتباطات ثبت‌شده: {[...item.relatedLawIds, ...item.relatedArticleIds, ...item.relatedTermIds].join("، ")}</div>}
            </article>
          ))}
          <section className={styles.checks}><h3>چک‌لیست بررسی انسانی</h3><ol>{dossier.requiredHumanChecks.map((check) => <li key={check}>{check}</li>)}</ol></section>
          <p className={styles.disclaimer}>این بسته، گزارش بازیابی و خلأهای داده است؛ نه تحلیل پرونده، تفسیر قانون، محاسبه مهلت یا توصیه حقوقی. صفر بودن منابع تأییدشده به معنی نبود منبع در خارج از کتابخانه نیست.</p>
        </div>
      )}
    </section>
  );
}
