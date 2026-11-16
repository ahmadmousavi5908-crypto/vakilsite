"use client";

import { useState } from "react";
import styles from "./MavisIranianSourceSearch.module.css";

const GROUPS = [
  { value: "all", label: "همه منابع ایرانی" },
  { value: "official", label: "منابع رسمی و قضایی" },
  { value: "academic", label: "نشریات و پژوهشگاه‌ها" },
  { value: "secondary", label: "مراجع ثانویه برای کشف" },
];

const AUTHORITY_LABELS = {
  official_primary: "منبع رسمی اولیه",
  official_portal: "درگاه رسمی قضایی",
  official_research: "مرکز پژوهشی رسمی",
  official_judicial: "مرجع قضایی رسمی",
  academic: "پایگاه علمی / پژوهشی",
  academic_index: "نمایه یا پایگاه ثانویه علمی",
  secondary_reference: "مرجع ثانویه، نه مستند نهایی",
};

export default function MavisIranianSourceSearch({ onImport }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [results, setResults] = useState([]);
  const [searchLinks, setSearchLinks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);

  async function search(event) {
    event.preventDefault();
    const clean = query.trim();
    if (clean.length < 2 || clean.length > 180 || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    setSelected(null);
    setMetadata(null);
    setResults([]);
    setSearchLinks([]);
    try {
      const response = await fetch("/api/admin/mavis/source-search", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: clean, group, limit: 10 }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "جست‌وجو انجام نشد.");
      const nextResults = Array.isArray(payload?.results) ? payload.results : [];
      const nextSearchLinks = Array.isArray(payload?.searchLinks) ? payload.searchLinks : [];
      setResults(nextResults);
      setSearchLinks(nextSearchLinks);
      setNotice(nextResults.length
        ? "نتایج از دامنه‌های منتخب ایرانی دریافت شده‌اند؛ وضعیت و اعتبار هر سند را در منبع اصلی بررسی کنید."
        : nextSearchLinks.length
          ? "جست‌وجوی خودکار در دسترس نبود؛ پیوندهای مستقیم درگاه‌های رسمی و دامنه‌های منتخب آماده‌اند."
          : "در منابع انتخاب‌شده نتیجه‌ای پیدا نشد.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "خطای ناشناخته در جست‌وجو.");
    } finally {
      setLoading(false);
    }
  }

  function choose(item) {
    setSelected(item);
    setMetadata({
      title: item.title || "",
      author: "",
      publication: item.sourceName || "",
      publicationDate: item.publishedDate || "",
      documentNumber: "",
      issuingAuthority: item.sourceGroup === "official" ? item.sourceName : "",
      documentType: "",
      abstract: item.snippet || "",
      sourceUrl: item.url || "",
    });
  }

  function updateField(key, value) {
    setMetadata((current) => ({ ...current, [key]: value }));
  }

  async function copyMetadata() {
    if (!metadata) return;
    const text = [
      "عنوان: " + metadata.title,
      "نویسنده: " + metadata.author,
      "نشریه / پایگاه: " + metadata.publication,
      "تاریخ انتشار: " + metadata.publicationDate,
      "شماره سند: " + metadata.documentNumber,
      "مرجع صادرکننده: " + metadata.issuingAuthority,
      "نوع سند: " + metadata.documentType,
      "چکیده / توضیح: " + metadata.abstract,
      "پیوند منبع: " + metadata.sourceUrl,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("مشخصات منبع کپی شد و آماده انتقال به تحریریه است.");
    } catch {
      setError("دسترسی مرورگر به کلیپ‌بورد ممکن نیست؛ متن را دستی انتخاب و کپی کنید.");
    }
  }

  return (
    <section className={styles.workspace} aria-labelledby="iran-source-search-title" dir="rtl">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>IRANIAN LEGAL & ACADEMIC SOURCES</span>
          <h2 id="iran-source-search-title">موتور جست‌وجوی منابع معتبر ایران</h2>
          <p>یک عبارت جست‌وجو؛ کشف قوانین، آرای قضایی، نظریات و مقالات علمی از دامنه‌های ایرانی منتخب.</p>
        </div>
        <span className={styles.symbol} aria-hidden="true">⌕</span>
      </header>

      <form className={styles.searchForm} onSubmit={search}>
        <label className={styles.searchLabel} htmlFor="mavis-iran-source-query">موضوع، عنوان مقاله یا عبارت حقوقی</label>
        <div className={styles.searchRow}>
          <input
            id="mavis-iran-source-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلاً: مسئولیت مدنی ناشی از نقض تعهد قراردادی"
            minLength={2}
            maxLength={180}
            required
          />
          <button type="submit" disabled={loading || query.trim().length < 2}>
            {loading ? "در حال جست‌وجو..." : "جست‌وجو"}
          </button>
        </div>
        <div className={styles.searchOptions}>
          <label htmlFor="mavis-iran-source-group">محدوده منابع</label>
          <select id="mavis-iran-source-group" value={group} onChange={(event) => setGroup(event.target.value)}>
            {GROUPS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span>جست‌وجو فقط در دامنه‌های منتخب انجام می‌شود؛ اطلاعات محرمانه پرونده یا موکل را وارد نکنید.</span>
        </div>
      </form>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

      {results.length ? (
        <div className={styles.resultsLayout}>
          <div className={styles.resultsList} aria-label="نتایج جست‌وجو">
            <div className={styles.resultsHeading}><strong>نتایج بازیابی‌شده</strong><span>{results.length.toLocaleString("fa-IR")} نتیجه</span></div>
            {results.map((item) => (
              <article className={styles.result} key={item.url} data-selected={selected?.url === item.url}>
                <div className={styles.resultMeta}>
                  <span>{item.sourceName}</span>
                  <span data-authority={item.sourceAuthority}>{AUTHORITY_LABELS[item.sourceAuthority] || "منبع نیازمند بررسی"}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.snippet || "برای مشاهده جزئیات، به صفحه منبع اصلی مراجعه کنید."}</p>
                <div className={styles.resultActions}>
                  <button type="button" onClick={() => choose(item)}>انتخاب و تکمیل مشخصات</button>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">مشاهده منبع اصلی ↗</a>
                </div>
              </article>
            ))}
          </div>

          {selected && metadata ? (
            <aside className={styles.metadataPanel}>
              <div className={styles.metadataHeading}><span>EDITORIAL INTAKE</span><h3>مشخصات منبع انتخاب‌شده</h3><p>اطلاعات خودکار و دستی را پیش از انتقال بررسی و تکمیل کنید.</p></div>
              <div className={styles.fields}>
                <label>عنوان<input value={metadata.title} onChange={(event) => updateField("title", event.target.value)} /></label>
                <label>نویسنده<input value={metadata.author} onChange={(event) => updateField("author", event.target.value)} placeholder="نام نویسنده" /></label>
                <label>نشریه / پایگاه<input value={metadata.publication} onChange={(event) => updateField("publication", event.target.value)} /></label>
                <label>تاریخ انتشار<input value={metadata.publicationDate} onChange={(event) => updateField("publicationDate", event.target.value)} placeholder="در صورت احراز" dir="ltr" /></label>
                <label>شماره سند / رأی<input value={metadata.documentNumber} onChange={(event) => updateField("documentNumber", event.target.value)} /></label>
                <label>مرجع صادرکننده<input value={metadata.issuingAuthority} onChange={(event) => updateField("issuingAuthority", event.target.value)} /></label>
                <label>نوع سند<input value={metadata.documentType} onChange={(event) => updateField("documentType", event.target.value)} placeholder="قانون، رأی، مقاله..." /></label>
                <label className={styles.full}>چکیده / توضیح<textarea rows="4" value={metadata.abstract} onChange={(event) => updateField("abstract", event.target.value)} /></label>
                <label className={styles.full}>پیوند منبع<input value={metadata.sourceUrl} onChange={(event) => updateField("sourceUrl", event.target.value)} dir="ltr" /></label>
              </div>
              {typeof onImport === "function" ? <button className={styles.importButton} type="button" onClick={() => onImport(metadata)}>ساخت پیش‌نویس جدید از این منبع</button> : null}
              <button className={styles.copyButton} type="button" onClick={copyMetadata}>کپی مشخصات برای تحریریه</button>
              <p className={styles.disclaimer}>نوع سند، تاریخ و اعتبار حقوقی صرفاً با انتخاب یا تأیید مدیر ثبت می‌شود. نتیجه جست‌وجو به‌تنهایی اثبات‌کننده اعتبار قانون یا رأی نیست.</p>
            </aside>
          ) : null}
        </div>
      ) : null}
      {searchLinks.length ? (
        <div className={styles.resultsList} aria-label="درگاه‌های جست‌وجوی مستقیم">
          <div className={styles.resultsHeading}>
            <strong>درگاه‌های رسمی برای بررسی مستقیم</strong>
            <span>{searchLinks.length.toLocaleString("fa-IR")} پیوند</span>
          </div>
          {searchLinks.map((item) => (
            <article className={styles.result} key={item.id}>
              <div className={styles.resultMeta}><span>جست‌وجوی مستقیم</span><span data-authority="official_primary">درگاه / دامنه مرجع</span></div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className={styles.resultActions}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">بازکردن درگاه و جست‌وجو ↗</a>
              </div>
            </article>
          ))}
        </div>
      ) : null}

    </section>
  );
}
