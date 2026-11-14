"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./MavisArticleCatalog.module.css";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .toLocaleLowerCase("fa-IR")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export default function MavisArticleCatalog({ articles }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState({});
  const categories = useMemo(
    () => [...new Set(articles.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa")),
    [articles]
  );

  const visible = useMemo(() => {
    const needle = normalize(query);
    return articles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (!needle) return true;
      return normalize([
        article.title,
        article.slug,
        article.category,
        article.excerpt,
        article.intro,
        ...(article.sections || []).map((section) => section.heading),
      ].join(" ")).includes(needle);
    });
  }, [articles, category, query]);

  const sourceCount = articles.reduce((sum, article) => sum + (article.sources?.length || 0), 0);
  const sectionCount = articles.reduce((sum, article) => sum + (article.sections?.length || 0), 0);

  return (
    <section className={styles.workspace} aria-labelledby="mavis-article-catalog-title">
      <div className={styles.metrics}>
        <article><span>مقالات موجود</span><strong>{articles.length.toLocaleString("fa-IR")}</strong><small>منبع فعلی: فایل محتوای سایت</small></article>
        <article><span>بخش‌های محتوایی</span><strong>{sectionCount.toLocaleString("fa-IR")}</strong><small>ساختار مقاله‌ها</small></article>
        <article><span>پیوندهای منبع</span><strong>{sourceCount.toLocaleString("fa-IR")}</strong><small>نیازمند اعتبارسنجی حقوقی</small></article>
      </div>

      <section className={styles.panel}>
        <header className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>EDITORIAL INVENTORY · READ ONLY</span>
            <h2 id="mavis-article-catalog-title">کتابخانه مقالات</h2>
            <p>جست‌وجو و بازبینی محتوای موجود؛ این نسخه هیچ تغییری در مقالات منتشرشده ایجاد نمی‌کند.</p>
          </div>
          <strong className={styles.count}>{visible.length.toLocaleString("fa-IR")} از {articles.length.toLocaleString("fa-IR")}</strong>
        </header>

        <div className={styles.filters}>
          <label>
            جست‌وجو در عنوان، متن و نشانی
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثلاً قرارداد، کیفری یا نامک مقاله" />
          </label>
          <label>
            دسته‌بندی
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">همه دسته‌ها</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>عنوان مقاله</th><th>دسته‌بندی</th><th>ساختار</th><th>منابع</th><th>وضعیت</th><th>عملیات</th></tr></thead>
            <tbody>
              {visible.map((article) => {
                const open = Boolean(expanded[article.slug]);
                return (
                  <Fragment key={article.slug}>
                    <tr>
                      <td>
                        <strong>{article.title}</strong>
                        <small dir="ltr">/{article.slug}</small>
                      </td>
                      <td>{article.category || "بدون دسته"}</td>
                      <td>{(article.sections || []).length.toLocaleString("fa-IR")} بخش</td>
                      <td>{(article.sources || []).length.toLocaleString("fa-IR")} منبع</td>
                      <td><span className={styles.readonly}>فهرست فعلی</span></td>
                      <td className={styles.actions}>
                        <button type="button" aria-expanded={open} onClick={() => setExpanded((current) => ({ ...current, [article.slug]: !current[article.slug] }))}>{open ? "بستن" : "جزئیات"}</button>
                        <Link href={`/articles/${encodeURIComponent(article.slug)}`} target="_blank" rel="noopener noreferrer">صفحه عمومی</Link>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td className={styles.detail} colSpan={6}>
                          <p>{article.excerpt}</p>
                          <strong>سرفصل‌ها</strong>
                          <ul>{(article.sections || []).map((section, index) => <li key={section.heading || index}>{section.heading}</li>)}</ul>
                          <strong>منابع ثبت‌شده</strong>
                          <ul>{(article.sources || []).map((source, index) => (
                            <li key={source.url || index}>
                              {source.url?.startsWith("https://")
                                ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label || "مشاهده منبع"}</a>
                                : <span>پیوند منبع نامعتبر است</span>}
                            </li>
                          ))}</ul>
                          <p className={styles.notice}>{article.warning}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {visible.length === 0 && <tr><td colSpan={6} className={styles.empty}>مقاله‌ای با این جست‌وجو پیدا نشد.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className={styles.footnote}>وضعیت «فهرست فعلی» به معنی تأیید حقوقی یا مجوز بازنشر نیست. گردش تأیید، نسخه‌بندی و انتشار از این صفحه فعال نشده است.</p>
      </section>
    </section>
  );
}
