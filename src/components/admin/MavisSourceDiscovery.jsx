"use client";

import { useMemo, useState } from "react";
import { importMavisSourceCandidateById, searchMavisEditorialSources } from "../../app/admin/mavis/articles/actions";
import styles from "./MavisSourceDiscovery.module.css";

const PROVIDER_LABELS = {
  crossref: "Crossref",
  semantic_scholar: "Semantic Scholar",
  openalex: "OpenAlex",
};

const PROVIDER_ERRORS = {
  PROVIDER_DISABLED: "این منبع تا زمان تنظیم کلید و بودجه مصرف غیرفعال است.",
  RATE_LIMITED: "محدودیت درخواست منبع فعال شده است.",
  UPSTREAM_TIMEOUT: "پاسخ منبع بیش از زمان مجاز طول کشید.",
  UPSTREAM_UNAVAILABLE: "منبع موقتاً پاسخ‌گو نیست.",
  UPSTREAM_NETWORK_ERROR: "ارتباط با منبع برقرار نشد.",
  UPSTREAM_REJECTED: "منبع درخواست را نپذیرفت.",
  UPSTREAM_INVALID_JSON: "پاسخ منبع معتبر نبود.",
  UPSTREAM_RESPONSE_TOO_LARGE: "پاسخ منبع از حد مجاز بزرگ‌تر بود.",
};

function candidateKey(item) {
  return item.id || (item.doi ? `doi:${item.doi.toLowerCase()}` : `${item.provider}:${item.providerRecordId}`);
}

export default function MavisSourceDiscovery() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [copiedKey, setCopiedKey] = useState("");
  const [importingKey, setImportingKey] = useState("");
  const [importedArticles, setImportedArticles] = useState({});

  const results = useMemo(() => {
    if (!response?.results) return [];
    const unique = new Map();
    for (const item of response.results) {
      const key = candidateKey(item);
      const current = unique.get(key);
      if (!current || (!current.doi && item.doi)) unique.set(key, item);
    }
    return [...unique.values()].filter((item) => providerFilter === "all" || item.provider === providerFilter);
  }, [response, providerFilter]);

  async function handleSearch(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const result = await searchMavisEditorialSources(query);
      if (!result?.ok) setError(result?.error || "جست‌وجو انجام نشد.");
      else setResponse(result);
    } catch {
      setError("ارتباط امن با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function importCandidate(item) {
    const key = candidateKey(item);
    if (importingKey || importedArticles[key]) return;
    setImportingKey(key);
    setError("");
    try {
      const result = await importMavisSourceCandidateById(item.id);
      if (!result?.ok) {
        setError(result?.error || "ساخت پیش‌نویس انجام نشد.");
        return;
      }
      setImportedArticles((current) => ({ ...current, [key]: result.articleId }));
    } catch {
      setError("ارتباط امن با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setImportingKey("");
    }
  }

  async function copyMetadata(item) {
    const text = [
      `عنوان: ${item.title}`,
      `نویسنده: ${(item.authors || []).join("، ") || "نامشخص"}`,
      `ناشر: ${item.publisher || "نامشخص"}`,
      `نشریه: ${item.venue || "نامشخص"}`,
      `تاریخ انتشار: ${item.publicationDate || "نامشخص"}`,
      `DOI: ${item.doi || "ندارد"}`,
      `منبع: ${PROVIDER_LABELS[item.provider] || item.provider}`,
      `پیوند: ${item.sourceUrl}`,
      "وضعیت حقوق نشر: نامشخص، نیازمند بررسی مدیر",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(candidateKey(item));
    } catch {
      setError("مرورگر اجازه کپی خودکار نداد؛ پیوند منبع را مستقیم باز کنید.");
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="mavis-source-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>MAVIS · SOURCE INTELLIGENCE</span>
          <h2 id="mavis-source-title">موتور کشف و جست‌وجوی منابع</h2>
          <p>جست‌وجوی هم‌زمان فراداده علمی در سه منبع معتبر؛ بدون دریافت متن کامل یا مجوز بازنشر.</p>
        </div>
        <span className={styles.readOnly}>جست‌وجوی امن · فقط فراداده</span>
      </header>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <label htmlFor="mavis-source-query">موضوع، عنوان مقاله یا کلیدواژه</label>
        <div className={styles.searchRow}>
          <input id="mavis-source-query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={160} placeholder="مثلاً مسئولیت مدنی ناشی از تقصیر..." required />
          <button type="submit" disabled={loading || query.trim().length < 2}>{loading ? "در حال جست‌وجو..." : "جست‌وجوی منابع"}</button>
        </div>
        <small>برای رعایت محدودیت سرویس‌ها، درخواست‌ها به‌صورت کنترل‌شده و پشت‌سرهم ارسال می‌شوند.</small>
      </form>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      {response ? (
        <div className={styles.resultsArea}>
          <div className={styles.resultsToolbar}>
            <div><strong>{results.length.toLocaleString("fa-IR")} نتیجه یکتا</strong><small>عبارت: «{response.query}»</small></div>
            <label>نمایش منبع
              <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
                <option value="all">همه منابع</option>
                <option value="crossref">Crossref</option>
                <option value="semantic_scholar">Semantic Scholar</option>
                <option value="openalex">OpenAlex</option>
              </select>
            </label>
          </div>

          {response.providerErrors?.length ? (
            <div className={styles.providerWarnings}>
              {response.providerErrors.map((item) => <span key={item.provider}>{PROVIDER_LABELS[item.provider] || item.provider}: {PROVIDER_ERRORS[item.error] || "منبع پاسخ‌گو نبود."}</span>)}
            </div>
          ) : null}

          {results.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>عنوان و شناسه</th><th>نویسندگان</th><th>ناشر / نشریه</th><th>تاریخ</th><th>منبع</th><th>عملیات</th></tr></thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={candidateKey(item)}>
                      <td><strong>{item.title}</strong><small dir="ltr">{item.doi || item.providerRecordId}</small></td>
                      <td>{item.authors?.slice(0, 3).join("، ") || "نامشخص"}</td>
                      <td>{item.publisher || item.venue || "نامشخص"}</td>
                      <td>{item.publicationDate || "نامشخص"}</td>
                      <td><span className={styles.sourceTag}>{PROVIDER_LABELS[item.provider] || item.provider}</span><small className={styles.rights}>حقوق نشر: بررسی‌نشده</small></td>
                      <td className={styles.actions}>
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">مشاهده منبع</a>
                        <button type="button" onClick={() => copyMetadata(item)}>{copiedKey === candidateKey(item) ? "کپی شد" : "کپی فراداده"}</button>
                        {item.state === "imported" && item.articleId ? (
                          <a href={`/admin/mavis/articles/${item.articleId}/edit`}>بازکردن پیش‌نویس</a>
                        ) : item.state === "ignored" ? (
                          <span className={styles.rights}>بایگانی‌شده</span>
                        ) : importedArticles[candidateKey(item)] ? (
                          <a href={`/admin/mavis/articles/${importedArticles[candidateKey(item)]}/edit`}>بازکردن پیش‌نویس</a>
                        ) : (
                          <button type="button" disabled={Boolean(importingKey)} onClick={() => importCandidate(item)}>
                            {importingKey === candidateKey(item) ? "در حال ساخت..." : "ساخت پیش‌نویس"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className={styles.empty}>نتیجه‌ای برای این فیلتر پیدا نشد.</div>}
          <p className={styles.disclaimer}>این نتایج صرفاً سرنخ پژوهشی هستند؛ ساخت پیش‌نویس فقط فراداده و پیوند منبع را ثبت می‌کند. متن مقاله باید توسط مدیر تکمیل شود و حقوق نشر همچنان نامشخص می‌ماند.</p>
        </div>
      ) : null}
    </section>
  );
}
