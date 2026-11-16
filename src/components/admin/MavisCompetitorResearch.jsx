"use client";

import { useState } from "react";
import styles from "./MavisCompetitorResearch.module.css";

export default function MavisCompetitorResearch() {
  const [query, setQuery] = useState("وکیل اهواز");
  const [location, setLocation] = useState("اهواز، خوزستان");
  const [domains, setDomains] = useState("");
  const [results, setResults] = useState([]);
  const [limitations, setLimitations] = useState([]);
  const [retrievedAt, setRetrievedAt] = useState("");
  const [usageCredits, setUsageCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");

  async function runSearch(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setResults([]);
    setLimitations([]);
    setSearchedQuery("");

    try {
      const response = await fetch("/api/admin/mavis/growth/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          query,
          location,
          domains: domains.split(/[,\u060C\n]/).map((item) => item.trim()).filter(Boolean),
          limit: 8
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "پژوهش بازار انجام نشد.");
      }
      setResults(Array.isArray(payload.results) ? payload.results : []);
      setLimitations(Array.isArray(payload.limitations) ? payload.limitations : []);
      setRetrievedAt(payload.retrievedAt || "");
      setUsageCredits(Number.isFinite(payload.usageCredits) ? payload.usageCredits : null);
      setSearchedQuery([payload.query, payload.location].filter(Boolean).join(" · "));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ارتباط با موتور جست‌وجو برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  const briefTopic = [query.trim(), location.trim()].filter(Boolean).join(" ");

  return (
    <section className={styles.panel} aria-labelledby="mavis-competitor-research-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>PUBLIC SERP OBSERVATION</span>
          <h2 id="mavis-competitor-research-title">پژوهش رقبا و فرصت‌های محتوایی</h2>
          <p>نمونه‌برداری از صفحات عمومی وب برای شناخت موضوعات، قالب محتوا و حضور رقبا؛ بدون ادعای رتبه یا حجم جست‌وجو.</p>
        </div>
        <span className={styles.readOnly}>جست‌وجوی فقط‌خواندنی</span>
      </header>

      <form className={styles.form} onSubmit={runSearch}>
        <label>
          <span>عبارت یا خدمت هدف</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} minLength={3} maxLength={250} required />
        </label>
        <label>
          <span>محدوده جغرافیایی</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={100} />
        </label>
        <label className={styles.domains}>
          <span>دامنه‌های رقیب (اختیاری، جداشده با ویرگول)</span>
          <input value={domains} onChange={(event) => setDomains(event.target.value)} dir="ltr" placeholder="example.ir, lawfirm.com" maxLength={1200} />
        </label>
        <button type="submit" disabled={loading || query.trim().length < 3}>
          {loading ? "در حال جست‌وجوی وب..." : "جست‌وجوی صفحات بازار"}
        </button>
      </form>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      {searchedQuery ? (
        <div className={styles.resultsHeader}>
          <strong>نتایج برای: {searchedQuery}</strong>
          <span>{results.length.toLocaleString("fa-IR")} نتیجه{usageCredits !== null ? " · " + usageCredits.toLocaleString("fa-IR") + " اعتبار مصرف‌شده" : ""}</span>
        </div>
      ) : null}

      {results.length ? (
        <div className={styles.results}>
          {results.map((item, index) => (
            <article className={styles.result} key={item.url}>
              <div className={styles.resultTop}>
                <span>{(index + 1).toLocaleString("fa-IR")}</span>
                <strong>{item.domain}</strong>
                {item.relevanceScore !== null ? <small>ارتباط: {Math.round(item.relevanceScore * 100).toLocaleString("fa-IR")}٪</small> : null}
              </div>
              <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></h3>
              {item.snippet ? <p>{item.snippet}</p> : null}
              <div className={styles.resultFooter}>
                {item.publishedDate ? <time dateTime={item.publishedDate}>{item.publishedDate}</time> : <span>تاریخ انتشار اعلام نشده</span>}
                <a href={item.url} target="_blank" rel="noopener noreferrer">مشاهده صفحه ↗</a>
              </div>
            </article>
          ))}
        </div>
      ) : searchedQuery ? <p className={styles.empty}>برای این عبارت نتیجه قابل‌نمایشی دریافت نشد. دامنه‌ها یا عبارت جست‌وجو را تغییر دهید.</p> : null}

      {limitations.length ? (
        <details className={styles.limitations}>
          <summary>محدودیت‌های تفسیر نتایج</summary>
          <ul>{limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
          {retrievedAt ? <small>زمان دریافت: {new Date(retrievedAt).toLocaleString("fa-IR")}</small> : null}
        </details>
      ) : null}

      <div className={styles.briefLink}>
        <div>
          <strong>تبدیل فرصت به پیش‌نویس</strong>
          <p>عبارت پژوهش را به تحریریه منتقل کنید؛ ماویس پیش‌نویس را با منابع حقوقی متصل‌شده آماده می‌کند.</p>
        </div>
        <a href={"/admin/mavis/articles/new?topic=" + encodeURIComponent(briefTopic)}>ایجاد پیش‌نویس از این موضوع ↗</a>
      </div>
    </section>
  );
}
