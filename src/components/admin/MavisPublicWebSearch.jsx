"use client";

import { useState } from "react";
import styles from "./MavisPublicWebSearch.module.css";

const formatNumber = new Intl.NumberFormat("fa-IR");

export default function MavisPublicWebSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);

  async function handleSearch(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || cleanQuery.length > 180 || loading) return;

    setLoading(true);
    setError("");
    setMessage("");
    setResults([]);
    setUsage(null);

    try {
      const response = await fetch("/api/admin/mavis/web-search", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery, group: "all", limit: 8 }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const code = payload?.error?.code;
        if (code === "NOT_CONFIGURED") {
          throw new Error("کلید امن سرویس جست‌وجوی وب روی Worker تنظیم نشده است.");
        }
        if (code === "RATE_LIMITED") {
          throw new Error("سهمیه جست‌وجو موقتاً تکمیل شده است. کمی بعد دوباره تلاش کنید.");
        }
        throw new Error(payload?.error?.message || "جست‌وجوی وب انجام نشد.");
      }

      if (payload?.ok !== true || !Array.isArray(payload.results)) {
        throw new Error("پاسخ موتور جست‌وجو معتبر نیست.");
      }

      setResults(payload.results);
      setUsage(payload.usageCredits);
      setMessage(payload.results.length
        ? "نتایج از جست‌وجوی عمومی وب دریافت شدند. اعتبار و محتوای هر صفحه را در منبع اصلی بررسی کنید."
        : "جست‌وجوی وب انجام شد، اما نتیجه‌ای برای این عبارت برنگشت.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ارتباط با موتور جست‌وجوی وب برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.panel} dir="rtl" aria-labelledby="mavis-public-web-search-title">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>TEMPORARY · READ ONLY · PUBLIC WEB</span>
          <h2 id="mavis-public-web-search-title">آزمایش جست‌وجوی عمومی وب</h2>
          <p>جست‌وجو در وب عمومی، بدون محدودیت به فهرست سایت‌های حقوقی؛ فقط نمایش عنوان، خلاصه و پیوند منبع.</p>
        </div>
        <span className={styles.mark} aria-hidden="true">⌕</span>
      </header>

      <form className={styles.form} onSubmit={handleSearch}>
        <label htmlFor="mavis-public-web-query">عبارت جست‌وجو</label>
        <div className={styles.searchRow}>
          <input
            id="mavis-public-web-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلاً: آخرین اصلاحات قانون چک در ایران"
            minLength={2}
            maxLength={180}
            required
          />
          <button type="submit" disabled={loading || query.trim().length < 2}>
            {loading ? "در حال جست‌وجو..." : "جست‌وجو در وب"}
          </button>
        </div>
        <p className={styles.hint}>این بخش آزمایشی است. هیچ نتیجه‌ای به مقاله یا پیش‌نویس منتقل یا ذخیره نمی‌شود.</p>
      </form>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}

      {results.length ? (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <strong>نتایج وب</strong>
            <span>{formatNumber.format(results.length)} نتیجه{usage !== null ? " · " + formatNumber.format(usage) + " اعتبار مصرف‌شده" : ""}</span>
          </div>
          {results.map((item) => (
            <article className={styles.result} key={item.url}>
              <div className={styles.meta}>
                <span>{item.domain}</span>
                {item.publishedDate ? <time dateTime={item.publishedDate}>{item.publishedDate}</time> : null}
              </div>
              <h3>{item.title}</h3>
              <p>{item.snippet || "برای مشاهده جزئیات به صفحه اصلی منبع مراجعه کنید."}</p>
              <a href={item.url} target="_blank" rel="noopener noreferrer">بازکردن منبع اصلی ↗</a>
            </article>
          ))}
        </div>
      ) : null}

      <p className={styles.disclaimer}>نتایج از سرویس جست‌وجوی وب دریافت می‌شوند و لزوماً منابع رسمی یا معتبر حقوقی نیستند. برای استناد حقوقی، متن و وضعیت سند را در مرجع اصلی کنترل کنید.</p>
    </section>
  );
}
