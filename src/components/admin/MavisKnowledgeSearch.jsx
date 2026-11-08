"use client";

import { useState } from "react";
import styles from "./MavisKnowledgeSearch.module.css";
import { safeInternalPath } from "../../lib/mavis/request-guards.mjs";

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

function safeExternalUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function recordSources(record) {
  const sources = Array.isArray(record.sources) ? record.sources : [];
  const items = sources
    .map((source) => ({
      title: source?.title || "مشاهده منبع",
      url: safeExternalUrl(source?.url),
      type: source?.source_type,
    }))
    .filter((source) => source.url);

  const fallbackUrl = safeExternalUrl(record.source_url);
  if (fallbackUrl && !items.some((source) => source.url === fallbackUrl)) {
    items.push({ title: "صفحه منبع ثبت‌شده", url: fallbackUrl, type: "secondary" });
  }
  return items;
}

export default function MavisKnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || cleanQuery.length > 120 || loading) return;

    setLoading(true);
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
      setNotice(payload?.notice || "");
      setSearched(true);
    } catch (requestError) {
      setResults([]);
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
          <p>جست‌وجوی قطعی در اصطلاحات، قوانین و خلاصه مواد موجود؛ بدون وابستگی به توکن یا سرویس هوش مصنوعی خارجی.</p>
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

      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((record) => {
            const sources = recordSources(record);
            const excerpt = record.summary || record.definition || record.notes;
            return (
              <article className={styles.result} key={record.id}>
                <div className={styles.resultTop}>
                  <span className={styles.type}>{typeLabels[record.record_type] || "مدخل حقوقی"}</span>
                  <span className={styles.review}>{reviewLabels[record.review_status] || "وضعیت بررسی نامشخص"}</span>
                </div>
                <h3>{record.title || record.canonical || "مدخل بدون عنوان"}</h3>
                {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
                <div className={styles.meta}>
                  {record.article_number && <span>شماره ماده: {record.article_number}</span>}
                  {record.status && <span>وضعیت: {statusLabels[record.status] || "ثبت‌شده، نیازمند بررسی"}</span>}
                  {record.matched_field && <span>تطبیق بر اساس: {matchedFieldLabels[record.matched_field] || "معیار داخلی"}</span>}
                </div>
                {sources.length > 0 && (
                  <div className={styles.sources}>
                    <strong>منابع ثبت‌شده</strong>
                    <ul>
                      {sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.title}
                          </a>
                          {source.type && <small>{source.type === "primary" ? "منبع اولیه" : "منبع ثانویه"}</small>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
