"use client";

import { useState } from "react";
import styles from "./MavisWebArticleResearch.module.css";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstMatch(content, patterns, maxLength = 180) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return normalizeText(match[1]).replace(/[|•].*$/, "").slice(0, maxLength);
  }
  return "";
}

function limitWords(value, maxWords = 25) {
  return normalizeText(value).split(" ").filter(Boolean).slice(0, maxWords).join(" ");
}

function extractMetadata(content, result) {
  const author = firstMatch(content, [
    /(?:نویسنده|مولف|مؤلف|پدیدآور|author)\s*[:：-]\s*([^\n]{2,180})/i,
  ]);
  const publication = firstMatch(content, [
    /(?:نام نشریه|نشریه|مجله|فصلنامه|ژورنال|publication|journal|publisher|ناشر)\s*[:：-]\s*([^\n]{2,180})/i,
  ]);
  const doi = content.match(/\b10\.\d{4,9}\/[a-z0-9._;()/:+-]+\b/i)?.[0] || "";
  const date = firstMatch(content, [
    /(?:تاریخ انتشار|تاریخ چاپ|published(?: on)?|publication date)\s*[:：-]\s*([^\n]{4,80})/i,
  ], 40);
  const headings = content.split("\n").map((line) => line.match(/^#{1,3}\s+(.+)$/)?.[1]).filter(Boolean).map((heading) => normalizeText(heading).slice(0, 120)).slice(0, 8);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const hasAbstract = /(?:چکیده|abstract)/i.test(content);
  return {
    title: normalizeText(result.title).slice(0, 300),
    author,
    publication,
    publicationDate: result.publishedDate || date,
    documentNumber: doi,
    sourceUrl: result.url,
    abstract: limitWords(result.snippet, 25),
    headings,
    wordCount,
    hasAbstract,
    sourceType: "academic",
    relationType: "research_background",
  };
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export default function MavisWebArticleResearch({ onApply }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extractingUrl, setExtractingUrl] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [extractReport, setExtractReport] = useState(null);

  async function search(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (loading || cleanQuery.length < 2) return;
    setLoading(true);
    setError("");
    setFeedback("");
    setResults([]);
    setExtractReport(null);
    try {
      const response = await fetch("/api/admin/mavis/web-search", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery, limit: 8 }),
      });
      const payload = await readJson(response);
      if (!response.ok || payload?.ok !== true || !Array.isArray(payload.results)) {
        throw new Error(payload?.error?.message || "جست‌وجوی وب انجام نشد.");
      }
      setResults(payload.results);
      if (!payload.results.length) setFeedback("نتیجه‌ای برای این عبارت پیدا نشد.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ارتباط با موتور جست‌وجو برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function extract(result) {
    if (extractingUrl) return;
    setExtractingUrl(result.url);
    setExtractReport(null);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/admin/mavis/web-extract", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url }),
      });
      const payload = await readJson(response);
      if (!response.ok || payload?.ok !== true || typeof payload.content !== "string") {
        throw new Error(payload?.error?.message || "استخراج محتوای صفحه انجام نشد.");
      }
      const metadata = extractMetadata(payload.content, result);
      setExtractReport(metadata);
      onApply(metadata);
      setFeedback("اطلاعات کتاب‌شناختی به فرم مقاله منتقل شد. فیلدهای استخراج‌شده را بازبینی کنید؛ متن کامل منبع به مقاله کپی نشده است.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "استخراج اطلاعات مقاله ناموفق بود.");
    } finally {
      setExtractingUrl("");
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="mavis-web-research-title">
      <header>
        <div>
          <span className={styles.eyebrow}>PUBLIC WEB · ARTICLE METADATA</span>
          <h3 id="mavis-web-research-title">جست‌وجو و استخراج اطلاعات مقاله از وب</h3>
          <p>عنوان، نویسنده، نشریه، تاریخ و پیوند منبع را استخراج می‌کند و به فرم مقاله می‌فرستد. متن کامل منبع خودکار بازنشر نمی‌شود.</p>
        </div>
      </header>
      <form className={styles.form} onSubmit={search}>
        <label htmlFor="mavis-article-web-query">موضوع یا عنوان مقاله</label>
        <div className={styles.searchRow}>
          <input id="mavis-article-web-query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={180} placeholder="مثلاً آثار حقوقی معامله به قصد فرار از دین" required />
          <button type="submit" disabled={loading || query.trim().length < 2}>{loading ? "در حال جست‌وجو..." : "جست‌وجوی وب"}</button>
        </div>
      </form>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      {extractReport ? (
        <div className={styles.extractReport} role="status">
          <strong>گزارش استخراج صفحه</strong>
          <span>حدود {extractReport.wordCount.toLocaleString("fa-IR")} واژه از متن قابل‌استخراج · {extractReport.hasAbstract ? "نشانه چکیده پیدا شد" : "چکیده مشخصی شناسایی نشد"}</span>
          {extractReport.headings.length ? <ul>{extractReport.headings.map((heading, index) => <li key={index}>{heading}</li>)}</ul> : <small>عنوان‌بندی مشخصی از صفحه استخراج نشد.</small>}
        </div>
      ) : null}
      {results.length ? (
        <div className={styles.results}>
          <strong>{results.length.toLocaleString("fa-IR")} نتیجه وب</strong>
          {results.map((item) => (
            <article className={styles.result} key={item.url}>
              <div className={styles.meta}><span>{item.domain}</span>{item.publishedDate ? <time dateTime={item.publishedDate}>{item.publishedDate}</time> : null}</div>
              <h4>{item.title}</h4>
              <p>{limitWords(item.snippet, 25) || "چکیده در نتیجه جست‌وجو موجود نیست."}</p>
              <div className={styles.actions}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">مشاهده منبع اصلی ↗</a>
                <button type="button" onClick={() => extract(item)} disabled={Boolean(extractingUrl)}>
                  {extractingUrl === item.url ? "در حال استخراج..." : "استخراج و انتقال به فرم"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <p className={styles.note}>اطلاعات استخراج‌شده پیشنهاد اولیه است. اگر نویسنده یا نشریه در صفحه قابل تشخیص نباشد، فیلد خالی می‌ماند تا مدیر آن را تکمیل کند.</p>
    </section>
  );
}
