"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import styles from "./MavisDraftList.module.css";
import { createEditorialSpreadsheetTsv } from "../../lib/mavis/editorial-spreadsheet-export.mjs";

const RECORD_TYPE_LABELS = { article: "مقاله حقوقی", law: "قانون یا مقرره", unifying_opinion: "رأی وحدت رویه", judicial_decision: "رأی قضایی", advisory_opinion: "نظریه مشورتی", legal_interpretation: "تفسیر قانون", legal_analysis: "تحلیل حقوقی", official_circular: "بخشنامه", academic_research: "پژوهش علمی" };
const VALIDITY_LABELS = { unknown: "بررسی‌نشده", current: "معتبر", amended: "اصلاح‌شده", repealed: "منسوخ", historical: "تاریخی", disputed: "نیازمند بررسی" };

const STATUS_LABELS = {
  draft: "پیش‌نویس",
  changes_requested: "نیازمند اصلاح",
  needs_update: "نیازمند به‌روزرسانی",
};

export default function MavisDraftList({ rows = [], nextCursor = null, error = null }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedArticleId, setExpandedArticleId] = useState(null);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return [...rows]
      .filter((article) => statusFilter === "all" || article.status === statusFilter)
      .filter((article) => !normalized || [article.title, article.slug, article.category, article.author_name, article.excerpt, RECORD_TYPE_LABELS[article.record_type] || RECORD_TYPE_LABELS.article, ...Object.values(article.legal_metadata || {}), ...(Array.isArray(article.tags) ? article.tags : [])].some((value) => String(value || "").toLocaleLowerCase().includes(normalized)))
      .sort((a, b) => {
        const left = a[sortBy] ?? "";
        const right = b[sortBy] ?? "";
        const comparison = typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "fa");
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [rows, query, statusFilter, sortBy, sortDirection]);

  function downloadSpreadsheet() {
    const exportRows = [
      ["عنوان مدرک", "نوع مدرک", "شماره سند", "مرجع صادرکننده", "وضعیت اعتبار", "نویسنده", "دسته‌بندی", "برچسب‌ها", "چکیده", "نامک", "وضعیت انتشار", "نسخه", "آخرین به‌روزرسانی"],
      ...visibleRows.map((article) => [
        article.title,
        RECORD_TYPE_LABELS[article.record_type] || RECORD_TYPE_LABELS.article,
        article.legal_metadata?.document_number || "",
        article.legal_metadata?.issuing_authority || "",
        VALIDITY_LABELS[article.legal_metadata?.validity_status] || VALIDITY_LABELS.unknown,
        article.author_name || "",
        article.category,
        Array.isArray(article.tags) ? article.tags.join("، ") : "",
        article.excerpt || "",
        article.slug,
        STATUS_LABELS[article.status] || article.status,
        article.current_version,
        article.updated_at,
      ]),
    ];
    const blob = new Blob(["\uFEFF", createEditorialSpreadsheetTsv(exportRows)], {
      type: "text/tab-separated-values;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mavis-articles-" + new Date().toISOString().slice(0, 10) + ".tsv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function changeSort(key) {
    if (sortBy === key) setSortDirection((value) => value === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDirection(key === "updated_at" ? "desc" : "asc");
    }
  }

  const sortLabel = (key, label) => (
    <button type="button" className={styles.sortButton} onClick={() => changeSort(key)} aria-label={`مرتب‌سازی بر اساس ${label}`}>
      {label}{sortBy === key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );

  return (
    <section className={styles.panel} aria-labelledby="mavis-draft-list-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DATABASE EDITORIAL RECORDS</span>
          <h2 id="mavis-draft-list-title">کاربرگ اسناد حقوقی و پیش‌نویس‌ها</h2>
          <p>جدول قابل جست‌وجو و مرتب‌سازی؛ داده‌ها از دیتابیس و با صفحه‌بندی امن دریافت می‌شوند.</p>
        </div>
        <div className={styles.headerActions}>
          <strong className={styles.count}>{rows.length.toLocaleString("fa-IR")} مورد در این صفحه</strong>
          <Link href="/admin/mavis/articles/new" className={styles.createButton}>ثبت مدرک جدید <span aria-hidden="true">＋</span></Link>
        </div>
      </header>

      {error ? (
        <div className={styles.notice} role="status">
          <strong>فهرست دیتابیسی در دسترس نیست.</strong>
          <p>{error}</p>
          <small>تا زمان اعمال migrationهای CMS، پیش‌نمایش محتوای فعلی سایت همچنان جداگانه قابل مشاهده است.</small>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <span>جست‌وجوی سریع</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="عنوان، نوع مدرک، شماره سند، نویسنده یا دسته‌بندی..." />
            </label>
            <label className={styles.filterField}>
              <span>وضعیت</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">همه وضعیت‌ها</option>
                <option value="draft">پیش‌نویس</option>
                <option value="changes_requested">نیازمند اصلاح</option>
                <option value="needs_update">نیازمند به‌روزرسانی</option>
              </select>
            </label>
            <span className={styles.filteredCount}>{visibleRows.length.toLocaleString("fa-IR")} ردیف نمایش داده می‌شود</span>
            <button type="button" className={styles.exportButton} onClick={downloadSpreadsheet} disabled={!visibleRows.length}>خروجی Excel · همین نتایج</button>
          </div>
          {visibleRows.length ? (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>{sortLabel("title", "عنوان مدرک")}</th><th>نوع مدرک</th><th>{sortLabel("category", "دسته‌بندی")}</th><th>وضعیت</th><th>{sortLabel("current_version", "نسخه")}</th><th>{sortLabel("updated_at", "آخرین تغییر")}</th><th>جزئیات</th><th>عملیات</th></tr></thead>
                  <tbody>
                    {visibleRows.map((article) => {
                      const isExpanded = expandedArticleId === article.id;
                      const detailsId = `mavis-article-details-${article.id}`;
                      return (
                        <Fragment key={article.id}>
                          <tr className={isExpanded ? styles.expandedRow : undefined}>
                            <td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td>
                            <td><span className={styles.recordType}>{RECORD_TYPE_LABELS[article.record_type] || RECORD_TYPE_LABELS.article}</span></td>
                            <td>{article.category}</td>
                            <td><span className={styles.status}>{STATUS_LABELS[article.status] || article.status}</span></td>
                            <td>{Number(article.current_version).toLocaleString("fa-IR")}</td>
                            <td><time dateTime={article.updated_at}>{new Date(article.updated_at).toLocaleString("fa-IR")}</time></td>
                            <td><button type="button" className={styles.detailsButton} aria-expanded={isExpanded} aria-controls={isExpanded ? detailsId : undefined} onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}>{isExpanded ? "بستن جزئیات −" : "نمایش جزئیات ＋"}</button></td>
                            <td><Link href={`/admin/mavis/articles/${article.id}/edit`}>ویرایش کامل</Link></td>
                          </tr>
                          {isExpanded ? (
                            <tr className={styles.detailRow} id={detailsId}>
                              <td colSpan={8}>
                                <div className={styles.detailPanel}>
                                  <div><span>نوع مدرک</span><strong>{RECORD_TYPE_LABELS[article.record_type] || RECORD_TYPE_LABELS.article}</strong></div>
                                  <div><span>شماره / شناسه سند</span><strong>{article.legal_metadata?.document_number || "ثبت نشده"}</strong></div>
                                  <div><span>مرجع صادرکننده</span><strong>{article.legal_metadata?.issuing_authority || "ثبت نشده"}</strong></div>
                                  <div><span>تاریخ سند</span><strong>{article.legal_metadata?.document_date || "ثبت نشده"}</strong></div>
                                  <div><span>وضعیت اعتبار</span><strong>{VALIDITY_LABELS[article.legal_metadata?.validity_status] || VALIDITY_LABELS.unknown}</strong></div>
                                  <div><span>نویسنده</span><strong>{article.author_name || "ثبت نشده"}</strong></div>
                                  <div className={styles.detailExcerpt}><span>چکیده</span><p>{article.excerpt || "چکیده‌ای ثبت نشده است."}</p></div>
                                  <div className={styles.detailTags}><span>برچسب‌ها</span><div>{Array.isArray(article.tags) && article.tags.length ? article.tags.map((tag) => <span key={tag}>{tag}</span>) : <small>بدون برچسب</small>}</div></div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {nextCursor && !query && statusFilter === "all" ? <nav className={styles.pagination} aria-label="صفحه‌بندی پیش‌نویس‌ها"><Link href={`/admin/mavis/articles?cursor=${encodeURIComponent(nextCursor)}`}>ردیف‌های قدیمی‌تر ←</Link></nav> : null}
            </>
          ) : <div className={styles.empty}>با این عبارت یا فیلتر، ردیفی در صفحه فعلی پیدا نشد.</div>}
        </>
      )}
    </section>
  );
}
