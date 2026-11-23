"use client";

import { useMemo, useState } from "react";
import { saveEditorialDraft, publishEditorialArticle, uploadEditorialImage } from "../../app/admin/mavis/editorial/actions";
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
    imageUrl: article.image?.url || "",
    imageOgUrl: article.image?.ogUrl || "",
    imageVariants: article.image?.variants || {},
    imageAlt: article.image?.alt || "",
    imageTitle: article.image?.title || "",
    imageCaption: article.image?.caption || "",
    imageWidth: article.image?.width || 1600,
    imageHeight: article.image?.height || 900,
    showImageInArticle: article.image?.showInArticle !== false,
    useImageForSeo: article.image?.useForSeo !== false,
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const filtered = useMemo(() => {
    const rows = articles.filter((article) => {
      const sectionText = Array.isArray(article.sections)
        ? article.sections.flatMap((section) => [section.heading, section.body]).join(" ")
        : "";
      const sourceText = Array.isArray(article.sources)
        ? article.sources.map((source) => source.label || source.title || "").join(" ")
        : "";
      const keywordText = Array.isArray(article.keywords) ? article.keywords.join(" ") : "";
      const haystack = [
        article.title, article.slug, article.category, article.excerpt, article.intro,
        sectionText, sourceText, keywordText,
      ].join(" ").toLowerCase();
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

  async function handleImageUpload(event) {
    const sourceFile = event.target.files?.[0];
    if (!sourceFile) return;

    setImageUploading(true);
    setImageError("");
    try {
      if (!form.slug) throw new Error("ابتدا نشانی انگلیسی مقاله را وارد کنید، سپس تصویر را بارگذاری کنید.");
      if (sourceFile.size > 12 * 1024 * 1024) throw new Error("حجم فایل اصلی نباید بیشتر از ۱۲ مگابایت باشد.");
      const bitmap = await createImageBitmap(sourceFile);
      if (bitmap.width < 1200 || bitmap.height < 675 || bitmap.width * bitmap.height > 40000000) {
        bitmap.close?.();
        throw new Error("ابعاد تصویر باید حداقل ۱۲۰۰×۶۷۵ و حداکثر ۴۰ مگاپیکسل باشد.");
      }

      async function makeVariant(width, height, suffix) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("پردازش تصویر در این مرورگر پشتیبانی نمی‌شود.");

        const scale = Math.max(width / bitmap.width, height / bitmap.height);
        const cropWidth = width / scale;
        const cropHeight = height / scale;
        const sourceX = (bitmap.width - cropWidth) / 2;
        const sourceY = (bitmap.height - cropHeight) / 2;
        context.drawImage(bitmap, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
        if (!blob) throw new Error("تبدیل تصویر به WebP انجام نشد.");
        return new File([blob], `article-${suffix}.webp`, { type: "image/webp" });
      }

      const [wide, landscape, square, og] = await Promise.all([
        makeVariant(1600, 900, "16x9"),
        makeVariant(1200, 900, "4x3"),
        makeVariant(1200, 1200, "1x1"),
        makeVariant(1200, 630, "og"),
      ]);
      bitmap.close?.();

      const payload = new FormData();
      payload.set("slug", form.slug);
      payload.set("image_wide", wide);
      payload.set("image_landscape", landscape);
      payload.set("image_square", square);
      payload.set("image_og", og);

      const result = await uploadEditorialImage(payload);
      if (!result?.ok) throw new Error(result?.message || "بارگذاری تصویر انجام نشد.");

      setForm((current) => ({
        ...current,
        imageUrl: result.images.wide,
        imageOgUrl: result.images.og,
        imageVariants: {
          wide: result.images.wide,
          landscape: result.images.landscape,
          square: result.images.square,
        },
        imageAlt: current.imageAlt || current.title,
        imageTitle: current.imageTitle || current.title,
        imageWidth: 1600,
        imageHeight: 900,
        showImageInArticle: true,
        useImageForSeo: true,
      }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "پردازش یا بارگذاری تصویر ناموفق بود.");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  }

  function selectArticle(article) {
    setSelectedSlug(article.slug);
    setForm(toForm(article));
    setPreview(false);
    setImageError("");
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
          <input aria-label="جست‌وجوی مقاله" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو در عنوان، متن، منابع، کلیدواژه و نشانی..." />
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
                  <td><span className={styles.status} data-status={article.status}>{article.hasUnpublishedChanges ? "منتشرشده · پیش‌نویس جدید" : (statusLabels[article.status] || article.status)}</span></td>
                  <td dir="ltr">{article.slug}</td>
                  <td>{article.updatedAt ? new Date(article.updatedAt).toLocaleDateString("fa-IR") : "—"}</td>
                  <td className={styles.rowActions}><button type="button" className={styles.openButton} onClick={() => selectArticle(article)}>ویرایش</button>
                    {article.status === "published" || article.status === "site_published" || article.isLegacySiteArticle ? <>
                      <a className={styles.readButton} href={"/articles/" + article.slug} target="_blank" rel="noreferrer">خواندن</a>
                      <a className={styles.readButton} href={"/admin/mavis?articlePage=" + encodeURIComponent("/articles/" + article.slug) + "#growth-intelligence"}>آمار جست‌وجو</a>
                    </> : <span className={styles.draftRead}>هنوز منتشر نشده</span>}</td>
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
            {form.imageUrl && form.showImageInArticle ? <img src={form.imageUrl} alt={form.imageAlt || form.title} className={styles.previewImage} /> : null}
            <span>{form.category || "راهنمای حقوقی"}</span><h1>{form.title || "عنوان مقاله"}</h1><p className={styles.previewExcerpt}>{form.excerpt}</p><p>{form.intro}</p>
            {previewBlocks(form.bodyMarkdown)}
            {form.checklist ? <><h3>چک‌لیست</h3><ul>{form.checklist.split("\n").filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            {form.warning ? <aside>{form.warning}</aside> : null}
            {form.sources ? <><h3>منابع</h3><ul>{form.sources.split("\n").filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
          </article>
        ) : (
          <form className={styles.form} action={saveEditorialDraft}>
            <input type="hidden" name="selected_slug" value={selectedSlug} />
            <input type="hidden" name="image_url" value={form.imageUrl} />
            <input type="hidden" name="image_og_url" value={form.imageOgUrl} />
            <input type="hidden" name="image_variants" value={JSON.stringify(form.imageVariants)} />
            <input type="hidden" name="image_alt" value={form.imageAlt} />
            <input type="hidden" name="image_title" value={form.imageTitle} />
            <input type="hidden" name="image_caption" value={form.imageCaption} />
            <input type="hidden" name="show_image_in_article" value={form.showImageInArticle ? "on" : ""} />
            <input type="hidden" name="use_image_for_seo" value={form.useImageForSeo ? "on" : ""} />
            <div className={styles.fieldGrid}>
              <label className={styles.wide}>عنوان مقاله<input name="title" value={form.title} onChange={update("title")} required maxLength={300} /></label>
              <label>نشانی انگلیسی (slug)<input name="slug" value={form.slug} onChange={update("slug")} required maxLength={120} dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selected)} /></label>
              <label>دسته‌بندی<input name="category" value={form.category} onChange={update("category")} maxLength={120} /></label>
              <label>زمان مطالعه<input name="read_time" value={form.readTime} onChange={update("readTime")} maxLength={40} /></label>
              <label className={styles.wide}>خلاصه مقاله<textarea name="excerpt" value={form.excerpt} onChange={update("excerpt")} required rows="2" maxLength={1200} /></label>
              <label className={styles.wide}>مقدمه<textarea name="intro" value={form.intro} onChange={update("intro")} required rows="4" maxLength={4000} /></label>
              <label className={styles.wide}>متن مقاله (برای تیتر اصلی هر بخش از ## استفاده کن)<textarea name="body_markdown" value={form.bodyMarkdown} onChange={update("bodyMarkdown")} required rows="14" maxLength={50000} dir="rtl" placeholder={"## عنوان بخش اول\nمتن بخش اول...\n\n## عنوان بخش دوم\nمتن بخش دوم..."} /></label>
              <label className={styles.wide}>چک‌لیست (هر مورد در یک خط)<textarea name="checklist" value={form.checklist} onChange={update("checklist")} rows="4" maxLength={5000} /></label>
              <label className={styles.wide}>هشدار و توضیح حقوقی<textarea name="warning" value={form.warning} onChange={update("warning")} rows="3" maxLength={3000} /></label>
              <label className={styles.wide}>منابع (هر خط: عنوان | نشانی HTTPS)<textarea name="sources" value={form.sources} onChange={update("sources")} rows="4" maxLength={12000} placeholder={"روزنامه رسمی | https://...\nپایگاه قوانین | https://..."} /></label>
              <section className={styles.imagePanel} aria-labelledby="article-image-heading">
                <div>
                  <strong id="article-image-heading">تصویر شاخص مقاله (اختیاری)</strong>
                  <p>یک تصویر مرتبط انتخاب کنید؛ MAVIS چهار نسخه WebP استاندارد برای مقاله، گوگل و اشتراک‌گذاری می‌سازد.</p>
                </div>
                <label className={styles.imageUpload}>بارگذاری تصویر
                  <input key={selectedSlug || "new-article"} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={imageUploading} />
                </label>
                <small>حداقل ۱۲۰۰×۶۷۵ پیکسل؛ خروجی خودکار ۱۶:۹، ۴:۳، مربع و ۱۲۰۰×۶۳۰؛ حداکثر حجم هر نسخه ۳ مگابایت.</small>
                {imageUploading ? <p role="status">در حال بهینه‌سازی و بارگذاری نسخه‌های تصویر…</p> : null}
                {imageError ? <p className={styles.imageError} role="alert">{imageError}</p> : null}
                {form.imageUrl ? <img className={styles.imagePreview} src={form.imageUrl} alt={form.imageAlt || form.title || "پیش‌نمایش تصویر مقاله"} /> : null}
                {form.imageUrl ? <>
                  <div className={styles.imageFields}>
                    <label>متن جایگزین تصویر (Alt)<input value={form.imageAlt} onChange={update("imageAlt")} maxLength={300} placeholder="توصیف دقیق و طبیعی تصویر" /></label>
                    <label>عنوان تصویر<input value={form.imageTitle} onChange={update("imageTitle")} maxLength={300} /></label>
                    <label className={styles.wide}>زیرنویس تصویر (اختیاری)<input value={form.imageCaption} onChange={update("imageCaption")} maxLength={500} /></label>
                  </div>
                  <div className={styles.imageOptions}>
                    <label><input type="checkbox" checked={form.showImageInArticle} onChange={(event) => setForm((current) => ({ ...current, showImageInArticle: event.target.checked, useImageForSeo: event.target.checked ? current.useImageForSeo : false }))} /> نمایش تصویر در بالای مقاله</label>
                    <label><input type="checkbox" checked={form.useImageForSeo} disabled={!form.showImageInArticle} onChange={(event) => setForm((current) => ({ ...current, useImageForSeo: event.target.checked }))} /> استفاده در Google Images، Schema و تصویر اشتراک‌گذاری</label>
                  </div>
                </> : <p className={styles.imageHint}>پس از بارگذاری، فیلدهای سئو و محل استفاده از تصویر در همین بخش نمایش داده می‌شوند.</p>}
              </section>
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
              <button type="submit" disabled={imageUploading}>ذخیره پیش‌نویس</button>
              <button type="submit" formAction={publishEditorialArticle} className={styles.publishButton} disabled={imageUploading}>تأیید و انتشار توسط من</button>
            </div>
            <p className={styles.securityNote}>ذخیره پیش‌نویس نسخه زنده را تغییر نمی‌دهد. انتشار نیازمند نام نویسنده، نام بازبین، تأیید حقوقی و حداقل یک منبع HTTPS است.</p>
          </form>
        )}
      </section>
    </div>
  );
}
