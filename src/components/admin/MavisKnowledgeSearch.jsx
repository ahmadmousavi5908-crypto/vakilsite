"use client";

import { useState } from "react";
import styles from "./MavisKnowledgeSearch.module.css";
import {
  safeExternalHttpUrl,
  safeInternalPath,
} from "../../lib/mavis/request-guards.mjs";

const reviewLabels = {
  verified_primary_source: "تطبیق‌شده با منبع اولیه",
  secondary_source_only: "منبع ثانویه؛ نیازمند تطبیق",
  needs_legal_review: "نیازمند بازبینی حقوقی",
  draft: "پیش‌نویس",
};

const typeLabels = {
  term: "اصطلاح حقوقی",
  law: "قانون",
  article: "خلاصه ماده",
  published_article: "مقاله آموزشی سایت",
  research_note: "یادداشت پژوهشی ثانویه",
};

const matchedFieldLabels = {
  title: "عنوان",
  alias: "مترادف",
  search_phrase: "عبارت منتخب",
  body: "تعریف یا خلاصه",
};

const statusLabels = {
  needs_consolidation_review: "نیازمند بررسی تنقیح و اصلاحات",
};

const evidenceLabels = {
  verified_primary: "منبع اولیه با وضعیت بررسی‌شده",
  secondary_reference: "ارجاع ثانویه",
  outdated: "منسوخ یا خارج از اعتبار",
  needs_official_check: "نیازمند بررسی منبع رسمی",
  not_found: "منبع قابل استناد ثبت نشده",
};

const validityLabels = {
  in_force: "در حال اجرا (طبق داده ثبت‌شده)",
  partially_repealed: "دارای نسخ جزئی؛ نیازمند تطبیق",
  repealed: "منسوخ",
  unknown: "وضعیت اعتبار نامشخص",
};

const dossierStatusLabels = {
  not_found: "در کتابخانه فعلی مدرکی پیدا نشد",
  blocked_missing_verified_primary_sources: "پاسخ حقوقی مسدود است؛ منبع اولیه تأییدشده کافی نیست",
  human_legal_review_required: "مدارک موجود؛ بررسی و تأیید وکیل الزامی است",
};

const dossierSectionLabels = {
  statute: "قوانین",
  amendment: "اصلاحیه‌ها",
  repeal: "نسخ و ابطال",
  executive_regulation: "آیین‌نامه‌ها",
  unifying_opinion: "آرای وحدت رویه",
  published_judgment: "آرای منتشرشده",
  administrative_court_decision: "آرای دیوان عدالت اداری",
  advisory_opinion: "نظریات مشورتی",
  judicial_session: "نشست‌های قضایی",
  academic_commentary: "منابع علمی",
  official_guidance: "راهنمای رسمی",
  legal_term: "اصطلاحات",
  educational_summary: "خلاصه مواد",
  research_note: "یادداشت پژوهشی",
  unclassified: "دسته‌بندی‌نشده",
};


function recordSources(record) {
  const sources = Array.isArray(record.evidence?.citations) ? record.evidence.citations : [];
  return sources
    .map((source) => ({
      title: source.title || "مشاهده منبع",
      url: safeExternalHttpUrl(source.url),
      type: source.sourceType,
      accessedAt: source.accessedAt,
      publicationDate: source.publicationDate,
      sourceVersion: source.sourceVersion,
    }))
    .filter((source) => source.url);
}

export default function MavisKnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || cleanQuery.length > 120 || loading) return;

    setLoading(true);
    setResults([]);
    setDossier(null);
    setError("");
    setNotice("");
    setSearched(false);

    try {
      const response = await fetch("/api/mavis/knowledge-search", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery, limit: 10 }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "جست‌وجو انجام نشد. دوباره تلاش کنید.");
      }

      setResults(Array.isArray(payload?.results) ? payload.results : []);
      setDossier(payload?.researchDossier?.ok ? payload.researchDossier : null);
      setNotice(payload?.notice || "");
      setSearched(true);
    } catch (requestError) {
      setResults([]);
      setDossier(null);
      setError(requestError instanceof Error ? requestError.message : "خطای ناشناخته در جست‌وجو.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.workspace} aria-labelledby="mavis-search-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>FIRST-PARTY KNOWLEDGE RETRIEVAL</span>
          <h2 id="mavis-search-title">جست‌وجوی کتابخانه حقوقی</h2>
          <p>جست‌وجوی قطعی در اصطلاحات، قوانین، خلاصه مواد، مقالات منتشرشده و یادداشت‌های پژوهشی ثانویه؛ بدون وابستگی به توکن یا سرویس هوش مصنوعی خارجی.</p>
        </div>
        <span className={styles.mark} aria-hidden="true">م</span>
      </div>

      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <label htmlFor="mavis-knowledge-query">عبارت یا موضوع حقوقی</label>
        <div className={styles.searchRow}>
          <input
            id="mavis-knowledge-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={120}
            minLength={2}
            placeholder="مثلاً سند رسمی، چک برگشتی یا قانون مدنی"
            autoComplete="off"
            required
          />
          <button type="submit" disabled={loading || query.trim().length < 2}>
            {loading ? "در حال جست‌وجو..." : "جست‌وجو"}
          </button>
        </div>
        <small>حداکثر ۱۲۰ نویسه؛ نتایج بر اساس عنوان، مترادف، عبارت‌های منتخب و متن تعریف رتبه‌بندی می‌شوند.</small>
      </form>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading && <p className={styles.status} role="status">در حال بررسی کتابخانه موجود...</p>}
      {searched && !loading && (
        <div className={styles.resultsHeader} aria-live="polite">
          <strong>{results.length.toLocaleString("fa-IR")} نتیجه</strong>
          <span>برای «{query.trim()}»</span>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className={styles.empty}>نتیجه‌ای در داده‌های فعلی پیدا نشد. نبود نتیجه به معنی نبود قانون یا منبع حقوقی مرتبط نیست.</div>
      )}

      {dossier && (
        <section className={styles.dossier} aria-live="polite" aria-label="پوشش پژوهش حقوقی">
          <div className={styles.dossierHeader}>
            <strong>پرونده پژوهش و پوشش مستندات</strong>
            <span>{dossierStatusLabels[dossier.answerReadiness] || "نیازمند بررسی انسانی"}</span>
          </div>
          <div className={styles.dossierCounts}>
            {Object.entries(dossier.sections || {})
              .filter(([, items]) => Array.isArray(items) && items.length > 0)
              .map(([key, items]) => (
                <span key={key}>{dossierSectionLabels[key] || key}: {items.length.toLocaleString("fa-IR")}</span>
              ))}
          </div>
          {Array.isArray(dossier.gaps) && dossier.gaps.length > 0 && (
            <details className={styles.dossierGaps}>
              <summary>خلأهای پژوهش ({dossier.gaps.length.toLocaleString("fa-IR")})</summary>
              <ul>{dossier.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
            </details>
          )}
          <p>این خروجی فقط مدارک موجود و موارد بررسی‌نشده را فهرست می‌کند؛ پاسخ حقوقی یا محاسبه مهلت تولید نشده است.</p>
        </section>
      )}

      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((record) => {
            const sources = recordSources(record);
            const excerpt = record.summary || record.definition || record.notes;
            const evidence = record.evidence || {};
            const validity = evidence.validity || {};
            return (
              <article className={styles.result} key={record.id}>
                <div className={styles.resultTop}>
                  <span className={styles.type}>{typeLabels[record.record_type] || "مدخل حقوقی"}</span>
                  <span className={styles.review}>{reviewLabels[record.review_status] || "وضعیت بررسی نامشخص"}</span>
                </div>
                <h3>{record.title || record.canonical || "مدخل بدون عنوان"}</h3>
                {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
                {record.record_type === "research_note" && record.notes && (
                  <p className={styles.noteCaution}><strong>محدودیت منبع:</strong> {record.notes}</p>
                )}
                <div className={styles.evidencePanel}>
                  <div className={styles.evidenceHeader}>
                    <strong>وضعیت مستندات و اعتبار</strong>
                    <span className={styles.evidenceState}>{evidenceLabels[evidence.state] || evidenceLabels.needs_official_check}</span>
                  </div>
                  <p>{validityLabels[validity.status] || validityLabels.unknown}</p>
                  {evidence.requiresHumanReview !== false && <small>این مدخل پیش از هر پاسخ حقوقی باید توسط کارشناس بررسی شود.</small>}
                </div>
                <div className={styles.meta}>
                  {record.article_number && <span>شماره ماده: {record.article_number}</span>}
                  {record.status && <span>وضعیت: {statusLabels[record.status] || "ثبت‌شده، نیازمند بررسی"}</span>}
                  {record.matched_field && <span>تطبیق بر اساس: {matchedFieldLabels[record.matched_field] || "معیار داخلی"}</span>}
                </div>
                <div className={styles.sources}>
                    <strong>منابع قابل نمایش در قرارداد اعتبارسنجی</strong>
                    <ul>
                      {sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.title}
                          </a>
                          {source.type && <small>{source.type === "primary" ? "دامنه اولیه ثبت‌شده" : "منبع ثانویه یا تأییدنشده"}</small>}
                          {source.accessedAt && <small>تاریخ دسترسی ثبت‌شده: {source.accessedAt}</small>}
                          {source.publicationDate && <small>تاریخ انتشار: {source.publicationDate}</small>}
                          {source.sourceVersion && <small>نسخه: {source.sourceVersion}</small>}
                        </li>
                      ))}
                    </ul>
                    {sources.length === 0 && <p className={styles.noSource}>برای این مدخل، منبع رسمی قابل استناد و تأییدشده ثبت نشده است.</p>}
                  </div>
                {safeInternalPath(record.path) && <a className={styles.recordLink} href={safeInternalPath(record.path)}>مشاهده مدخل در کتابخانه ←</a>}
              </article>
            );
          })}
        </div>
      )}

      {notice && <p className={styles.disclaimer}>{notice}</p>}
      {!searched && !loading && !error && (
        <div className={styles.initialState}>
          <span aria-hidden="true">⌕</span>
          <p>برای شروع، یک اصطلاح یا موضوع را جست‌وجو کنید.</p>
        </div>
      )}
    </section>
  );
}
