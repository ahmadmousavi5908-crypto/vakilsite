"use client";

import { useMemo, useState } from "react";
import { saveEditorialDraft, publishEditorialArticle } from "../../app/admin/mavis/editorial/actions";
import { formatEditorialBody, formatEditorialSources, serializeEditorialCsv } from "../../lib/mavis/editorial-content-core.mjs";
import styles from "./MavisEditorialStudio.module.css";

const statusLabels = {
  site_published: "منتشرشده در سایت",
  draft: "پیش‌نویس",
  published: "منتشرشده",
  archived: "بایگانی",
};

function toForm(article) {
  return {
    title: article.title || "",
    slug: article.slug || "",
    category: article.category || "",
    readTime: article.readTime || "",
    excerpt: article.excerpt || "",
    intro: article.intro || "",
    bodyMarkdown: formatEditorialBody(article.sections),
    checklist: Array.isArray(article.checklist) ? article.checklist.join("\n") : "",
    warning: article.warning || "",
    sources: formatEditorialSources(article.sources),
    seoTitle: article.seoTitle || "",
    seoDescription: article.seoDescription || article.excerpt || "",
    keywords: Array.isArray(article.keywords) ? article.keywords.join(", ") : "",
    authorName: article.authorName || "سید احمد موسوی",
    reviewerName: article.reviewerName || "",
    legalApproved: article.legalReviewStatus === "approved",
    isIndexable: article.isIndexable !== false,
  };
}

function previewBlocks(markdown) {
  return String(markdown || "").split("\n").map((line, index) => {
    if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
    if (line.trim()) return <p key={index}>{line}</p>;
    return null;
  });
}

export default function MavisEditorialStudio({ articles }) {
  const [selectedSlug, setSelectedSlug] = useState(articles[0]?.slug || "");
  const [form, setForm] = useState(() => toForm(articles[0] || {}));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("updated");
  const [preview, setPreview] = useState(false);

  const filtered = useMemo(() => {
    const rows = articles.filter((article) => {
      const haystack = [article.title, article.slug, article.category].join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase()) &&
        (statusFilter === "all" || article.status === statusFilter);
    });
    rows.sort((a, b) => sortOrder === "title"
      ? String(a.title || "").localeCompare(String(b.title || ""), "fa")
      : new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return rows;
  }, [articles, search, statusFilter, sortOrder]);

  const selected = articles.find((article) => article.slug === selectedSlug) || null;
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  function selectArticle(article) {
    setSelectedSlug(article.slug);
    setForm(toForm(article));
    setPreview(false);
  }

  function exportCsv() {
    const rows = [
      ["title", "category", "slug", "status", "updated_at"],
      ...filtered.map((article) => [
        article.title || "",
        article.category || "",
        article.slug || "",
        statusLabels[article.status] || article.status || "",
        article.updatedAt || "",
      ]),
    ];
    const csv = serializeEditorialCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mavis-editorial-inventory.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function createArticle() {
    const fresh = {
      title: "", slug: "", category: "", readTime: "۶ دقیقه", excerpt: "", intro: "",
      sections: [], checklist: [], warning: "", sources: [], status: "draft", source: "new",
    };
    setSelectedSlug("");
    setForm(toForm(fresh));
    setPreview(false);
  }

  return (
    <div className={styles.workspace} dir="rtl">
      <section className={styles.library} id="editorial-table">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>CONTENT INVENTORY</span><h2>بانک مقالات و محتوا</h2><p>نمای جدولی، قابل جست‌وجو و مرتب‌سازی؛ هر ردیف یک مقاله مستقل است.</p></div>
          <div className={styles.headingActions}><a href="/admin/mavis#growth-intelligence">هوشمندی رشد و Search Console</a><button type="button" onClick={createArticle}>＋ مقاله جدید</button></div>
        </div>
        <div className={styles.toolbar}>
          <input aria-label="جست‌وجوی مقاله" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو در عنوان، نشانی یا دسته‌بندی..." />
          <select aria-label="فیلتر وضعیت" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">همه وضعیت‌ها</option><option value="site_published">محتوای فعلی سایت</option><option value="draft">پیش‌نویس</option><option value="published">منتشرشده در CMS</option><option value="archived">بایگانی</option>
          </select>
          <select aria-label="مرتب‌سازی مقالات" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="updated">آخرین ویرایش</option><option value="title">عنوان مقاله</option>
          </select>
          <button type="button" className={styles.exportButton} onClick={exportCsv}>خروجی CSV</button>
          <span>{filtered.length.toLocaleString("fa-IR")} مقاله</span>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>عنوان مقاله</th><th>دسته‌بندی</th><th>وضعیت</th><th>نشانی</th><th>آخرین ویرایش</th><th>عملیات</th></tr></thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.slug} data-selected={article.slug === selectedSlug}>
                  <td><strong>{article.title || "مقاله بدون عنوان"}</strong><small>{article.source === "site" ? "نسخه فعلی سایت" : article.hasPublishedSnapshot ? "دارای نسخه منتشرشده" : "رکورد تحریریه"}</small></td>
                  <td>{article.category || "—"}</td>
                  <td><span className={styles.status} data-status={article.status}>{article.hasUnpublishedChanges ? "منتشرشده · نسخه جدید ذخیره نشده" : (statusLabels[article.status] || article.status)}</span></td>
                  <td dir="ltr">{article.slug}</td>
                  <td>{article.updatedAt ? new Date(article.updatedAt).toLocaleDateString("fa-IR") : "—"}</td>
                  <td className={styles.rowActions}><button type="button" className={styles.openButton} onClick={() => selectArticle(article)}>ویرایش</button>
                    {article.status === "published" || article.status === "site_published" ? <a className={styles.readButton} href={"/articles/" + article.slug} target="_blank" rel="noreferrer">خواندن</a> : <span className={styles.draftRead}>هنوز منتشر نشده</span>}</td>
                </tr>
              ))}
              {!filtered.length ? <tr><td colSpan="6" className={styles.empty}>مقاله‌ای با این مشخصات پیدا نشد.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.editor} id="article-editor">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>EDITOR & REVIEW</span><h2>{selected ? "ویرایش مقاله" : "ساخت مقاله جدید"}</h2><p>متن را تغییر بده، پیش‌نمایش را بخوان و پیش از انتشار، بازبینی را ثبت کن.</p></div>
          <button type="button" className={styles.previewToggle} onClick={() => setPreview((value) => !value)}>{preview ? "بازگشت به ویرایش" : "پیش‌نمایش خوانا"}</button>
        </div>

        {preview ? (
          <article className={styles.preview}>
            <span>{form.category || "راهنمای حقوقی"}</span><h1>{form.title || "عنوان مقاله"}</h1><p className={styles.previewExcerpt}>{form.excerpt}</p><p>{form.intro}</p>
            {previewBlocks(form.bodyMarkdown)}
            {form.checklist ? <><h3>چک‌لیست</h3><ul>{form.checklist.split("\n").filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            {form.warning ? <aside>{form.warning}</aside> : null}
            {form.sources ? <><h3>منابع</h3><ul>{form.sources.split("\n").filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
          </article>
        ) : (
          <form className={styles.form} action={saveEditorialDraft}>
            <input type="hidden" name="selected_slug" value={selectedSlug} />
            <div className={styles.fieldGrid}>
              <label className={styles.wide}>عنوان مقاله<input name="title" value={form.title} onChange={update("title")} required maxLength={300} /></label>
              <label>نشانی انگلیسی (slug)<input name="slug" value={form.slug} onChange={update("slug")} required maxLength={120} dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selected?.hasPublishedSnapshot)} /></label>
              <label>دسته‌بندی<input name="category" value={form.category} onChange={update("category")} maxLength={120} /></label>
              <label>زمان مطالعه<input name="read_time" value={form.readTime} onChange={update("readTime")} maxLength={40} /></label>
              <label className={styles.wide}>خلاصه مقاله<textarea name="excerpt" value={form.excerpt} onChange={update("excerpt")} required rows="2" maxLength={1200} /></label>
              <label className={styles.wide}>مقدمه<textarea name="intro" value={form.intro} onChange={update("intro")} required rows="4" maxLength={4000} /></label>
              <label className={styles.wide}>متن مقاله (برای تیتر اصلی هر بخش از ## استفاده کن)<textarea name="body_markdown" value={form.bodyMarkdown} onChange={update("bodyMarkdown")} required rows="14" maxLength={50000} dir="rtl" placeholder={"## عنوان بخش اول\nمتن بخش اول...\n\n## عنوان بخش دوم\nمتن بخش دوم..."} /></label>
              <label className={styles.wide}>چک‌لیست (هر مورد در یک خط)<textarea name="checklist" value={form.checklist} onChange={update("checklist")} rows="4" maxLength={5000} /></label>
              <label className={styles.wide}>هشدار و توضیح حقوقی<textarea name="warning" value={form.warning} onChange={update("warning")} rows="3" maxLength={3000} /></label>
              <label className={styles.wide}>منابع (هر خط: عنوان | نشانی HTTPS)<textarea name="sources" value={form.sources} onChange={update("sources")} rows="4" maxLength={12000} placeholder={"روزنامه رسمی | https://...\nپایگاه قوانین | https://..."} /></label>
              <label className={styles.wide}>عنوان سئو<input name="seo_title" value={form.seoTitle} onChange={update("seoTitle")} maxLength={300} /></label>
              <label className={styles.wide}>توضیحات متا<textarea name="seo_description" value={form.seoDescription} onChange={update("seoDescription")} rows="2" maxLength={500} /></label>
              <label className={styles.wide}>کلیدواژه‌ها (با ویرگول جدا کن)<input name="keywords" value={form.keywords} onChange={update("keywords")} maxLength={1000} /></label>
              <label>نام نویسنده<input name="author_name" value={form.authorName} onChange={update("authorName")} maxLength={160} /></label>
              <label>نام بازبین حقوقی<input name="reviewer_name" value={form.reviewerName} onChange={update("reviewerName")} maxLength={160} /></label>
            </div>
            <div className={styles.reviewControls}>
              <label><input type="checkbox" name="legal_review_approved" checked={form.legalApproved} onChange={(event) => setForm((current) => ({ ...current, legalApproved: event.target.checked }))} /> بازبینی حقوقی این نسخه را تأیید می‌کنم</label>
              <label><input type="checkbox" name="is_indexable" checked={form.isIndexable} onChange={(event) => setForm((current) => ({ ...current, isIndexable: event.target.checked }))} /> پس از انتشار، صفحه قابل ایندکس باشد</label>
            </div>
            <div className={styles.actions}>
              <button type="submit">ذخیره پیش‌نویس</button>
              <button type="submit" formAction={publishEditorialArticle} className={styles.publishButton}>تأیید و انتشار توسط من</button>
            </div>
            <p className={styles.securityNote}>ذخیره پیش‌نویس نسخه زنده را تغییر نمی‌دهد. انتشار نیازمند نام نویسنده، نام بازبین، تأیید حقوقی و حداقل یک منبع HTTPS است.</p>
          </form>
        )}
      </section>
    </div>
  );
}
