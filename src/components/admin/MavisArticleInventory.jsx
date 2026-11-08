"use client";

import { useMemo, useState } from "react";
import { safeExternalHttpUrl } from "../../lib/mavis/request-guards.mjs";
import styles from "./MavisArticleInventory.module.css";

export default function MavisArticleInventory({ articles, audit }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [issue, setIssue] = useState("all");
  const [sort, setSort] = useState("priority");
  const [expanded, setExpanded] = useState({});
  const reportBySlug = useMemo(() => new Map(audit.reports.map((report) => [report.slug, report])), [audit.reports]);
  const categories = useMemo(() => [...new Set(articles.map((article) => article.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa")), [articles]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fa-IR");
    const rows = articles.filter((article) => {
      const report = reportBySlug.get(article.slug);
      const searchable = [article.title, article.slug, article.category, article.excerpt, article.intro, ...(article.sections || []).map((section) => section.heading)].join(" ").toLocaleLowerCase("fa-IR");
      if (needle && !searchable.includes(needle)) return false;
      if (category !== "all" && article.category !== category) return false;
      if (issue === "critical" && !(report?.criticalCount > 0)) return false;
      if (issue === "warning" && !(report?.warningCount > 0)) return false;
      if (issue === "clean" && (report?.findingCount || 0) > 0) return false;
      return true;
    });
    rows.sort((a, b) => {
      const ar = reportBySlug.get(a.slug);
      const br = reportBySlug.get(b.slug);
      if (sort === "title") return a.title.localeCompare(b.title, "fa");
      if (sort === "category") return String(a.category).localeCompare(String(b.category), "fa") || a.title.localeCompare(b.title, "fa");
      return (br?.criticalCount || 0) - (ar?.criticalCount || 0) || (br?.warningCount || 0) - (ar?.warningCount || 0) || a.title.localeCompare(b.title, "fa");
    });
    return rows;
  }, [articles, category, issue, query, reportBySlug, sort]);

  function toggle(slug) {
    setExpanded((current) => ({ ...current, [slug]: !current[slug] }));
  }

  return (
    <section className={styles.workspace} aria-labelledby="mavis-article-inventory-title">
      <header className={styles.header}><div><span className={styles.eyebrow}>EDITORIAL INVENTORY · READ ONLY</span><h2 id="mavis-article-inventory-title">فهرست متمرکز مقالات</h2><p>جست‌وجو، دسته‌بندی، اولویت‌بندی و بازبینی محتوای موجود؛ بدون تغییر متن منتشرشده یا وضعیت انتشار.</p></div><strong className={styles.count}>{visible.length.toLocaleString("fa-IR")} / {articles.length.toLocaleString("fa-IR")}</strong></header>
      <div className={styles.filters}>
        <label>جست‌وجو<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="عنوان، نشانی، متن یا تیتر بخش..." /></label>
        <label>دسته‌بندی<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">همه دسته‌ها</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>وضعیت ممیزی<select value={issue} onChange={(event) => setIssue(event.target.value)}><option value="all">همه موارد</option><option value="critical">دارای ایراد بحرانی</option><option value="warning">نیازمند بهبود</option><option value="clean">بدون هشدار ساختاری</option></select></label>
        <label>مرتب‌سازی<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="priority">اولویت اصلاح</option><option value="title">عنوان</option><option value="category">دسته‌بندی</option></select></label>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>مقاله</th><th>دسته</th><th>ساختار</th><th>منابع</th><th>ممیزی</th><th>جزئیات</th></tr></thead>
          <tbody>
            {visible.map((article) => {
              const report = reportBySlug.get(article.slug);
              const open = Boolean(expanded[article.slug]);
              const auditLabel = report?.criticalCount ? String(report.criticalCount) + " بحرانی" : report?.warningCount ? String(report.warningCount) + " هشدار" : "بدون هشدار";
              return (
                <tr key={article.slug}>
                  <td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td>
                  <td>{article.category || "بدون دسته"}</td>
                  <td>{(article.sections || []).length.toLocaleString("fa-IR")} بخش <small>{(article.checklist || []).length.toLocaleString("fa-IR")} مورد چک‌لیست</small></td>
                  <td>{(article.sources || []).length.toLocaleString("fa-IR")}</td>
                  <td><span className={report?.criticalCount ? styles.critical : report?.warningCount ? styles.warning : styles.clean}>{auditLabel}</span></td>
                  <td><button className={styles.expand} type="button" aria-expanded={open} onClick={() => toggle(article.slug)}>{open ? "بستن" : "بازبینی"}</button></td>
                  {open && <td className={styles.detailCell} colSpan={6}>
                    <div className={styles.detail}>
                      <p>{article.excerpt}</p>
                      <strong>تیترهای مقاله</strong><ul>{(article.sections || []).map((section) => <li key={section.heading}>{section.heading}</li>)}</ul>
                      <strong>یافته‌های ممیزی</strong>{report?.findings.length ? <ul>{report.findings.map((finding) => <li key={finding.code}>{finding.message}</li>)}</ul> : <p>هشدار ساختاری ثبت نشده است.</p>}
                      <strong>منابع ثبت‌شده</strong><div className={styles.sources}>{(article.sources || []).map((source, index) => { const url = safeExternalHttpUrl(source.url); return url ? <a key={source.url + index} href={url} target="_blank" rel="noopener noreferrer">{source.label || "منبع مقاله"}</a> : <span key={index}>پیوند نامعتبر یا ناامن</span>; })}</div>
                      <p className={styles.warningText}>{article.warning}</p>
                    </div>
                  </td>}
                </tr>
              );
            })}
            {!visible.length && <tr><td colSpan={6} className={styles.empty}>مقاله‌ای با این فیلترها پیدا نشد.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>این نسخه فهرست و ممیزی را به‌صورت فقط‌خواندنی ارائه می‌کند. ویرایش، انتشار و زمان‌بندی محتوا تا زمان انتقال کنترل‌شده منبع مقالات به مخزن پایدار و آزمون گردش تأیید، عمداً فعال نیست.</p>
    </section>
  );
}
