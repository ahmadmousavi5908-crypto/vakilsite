"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./MavisDraftList.module.css";
import { createEditorialSpreadsheetTsv } from "../../lib/mavis/editorial-spreadsheet-export.mjs";

const STATUS_LABELS = {
  draft: "پیش‌نویس",
  changes_requested: "نیازمند اصلاح",
  needs_update: "نیازمند به‌روزرسانی",
  in_review: "در انتظار بازبینی",
  approved: "تأییدشده",
  published: "منتشرشده",
  archived: "آرشیوشده",
};

export default function MavisDraftList({ rows = [], nextCursor = null, nextHref = null, rowStart = 0, initialQuery = "", initialStatus = "all", error = null }) {
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return [...rows]
      .filter((article) => statusFilter === "all" || article.status === statusFilter)
      .filter((article) => !normalized || [article.title, article.slug, article.category].some((value) => String(value || "").toLocaleLowerCase().includes(normalized)))
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
      ["عنوان مقاله", "نامک", "دسته‌بندی", "وضعیت", "نسخه", "آخرین به‌روزرسانی"],
      ...visibleRows.map((article) => [
        article.title,
        article.slug,
        article.category,
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
          <h2 id="mavis-draft-list-title">کاربرگ مقالات و پیش‌نویس‌ها</h2>
          <p>جدول قابل جست‌وجو و مرتب‌سازی؛ داده‌ها از دیتابیس و با صفحه‌بندی امن دریافت می‌شوند.</p>
        </div>
        <strong className={styles.count}>{rows.length.toLocaleString("fa-IR")} ردیف · شماره‌گذاری پیوسته</strong>
      </header>

      {error ? (
        <div className={styles.notice} role="status">
          <strong>فهرست دیتابیسی در دسترس نیست.</strong>
          <p>{error}</p>
          <small>تا زمان اعمال migrationهای CMS، پیش‌نمایش محتوای فعلی سایت همچنان جداگانه قابل مشاهده است.</small>
        </div>
      ) : (
        <>
          <form className={styles.toolbar} method="get" action="/admin/mavis/articles">
            <label className={styles.searchField}>
              <span>جست‌وجو در عنوان، نامک، نویسنده و دسته‌بندی</span>
              <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="عنوان، نامک، نویسنده یا دسته‌بندی..." />
            </label>
            <label className={styles.filterField}>
              <span>وضعیت</span>
              <select name="status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">همه وضعیت‌ها</option>
                <option value="draft">پیش‌نویس</option>
                <option value="changes_requested">نیازمند اصلاح</option>
                <option value="needs_update">نیازمند به‌روزرسانی</option>
                <option value="in_review">در انتظار بازبینی</option>
                <option value="approved">تأییدشده</option>
                <option value="published">منتشرشده</option>
                <option value="archived">آرشیوشده</option>
              </select>
            </label>
            <span className={styles.filteredCount}>{visibleRows.length.toLocaleString("fa-IR")} ردیف در این صفحه</span>
            <button type="submit" className={styles.filterButton}>اعمال فیلتر</button>
            <button type="button" className={styles.exportButton} onClick={downloadSpreadsheet} disabled={!visibleRows.length}>خروجی Excel · همین نتایج</button>
          </form>
          {visibleRows.length ? (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>ردیف</th><th>{sortLabel("title", "عنوان مقاله")}</th><th>{sortLabel("category", "دسته‌بندی")}</th><th>وضعیت</th><th>{sortLabel("current_version", "نسخه")}</th><th>{sortLabel("updated_at", "آخرین تغییر")}</th><th>عملیات</th></tr></thead>
                  <tbody>
                    {visibleRows.map((article, index) => (
                      <tr key={article.id}>
                        <td className={styles.rowNumber}>{(rowStart + index + 1).toLocaleString("fa-IR")}</td>
                        <td><strong>{article.title}</strong><small dir="ltr">/{article.slug}</small></td>
                        <td>{article.category}</td>
                        <td><span className={styles.status}>{STATUS_LABELS[article.status] || article.status}</span></td>
                        <td>{Number(article.current_version).toLocaleString("fa-IR")}</td>
                        <td><time dateTime={article.updated_at}>{new Date(article.updated_at).toLocaleString("fa-IR")}</time></td>
                        <td><Link href={`/admin/mavis/articles/${article.id}/edit`}>ویرایش</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {nextCursor && nextHref ? <nav className={styles.pagination} aria-label="صفحه‌بندی کتابخانه مقالات"><Link href={nextHref}>ردیف‌های بعدی ←</Link></nav> : null}
            </>
          ) : <div className={styles.empty}>با این عبارت یا فیلتر، ردیفی در صفحه فعلی پیدا نشد.</div>}
        </>
      )}
    </section>
  );
}
