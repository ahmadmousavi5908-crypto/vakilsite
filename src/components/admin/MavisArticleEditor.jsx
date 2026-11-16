"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveMavisArticleDraft, submitMavisArticleForReview } from "../../app/admin/mavis/articles/actions";
import styles from "./MavisArticleEditor.module.css";

const emptySection = () => ({ heading: "", body: "" });

export default function MavisArticleEditor({ initialArticle = null, initialSources = [], sourceLoadError = "" }) {
  const [sections, setSections] = useState(() =>
    Array.isArray(initialArticle?.content?.sections) && initialArticle.content.sections.length
      ? initialArticle.content.sections.map((section) => ({ heading: section.heading || "", body: section.body || "" }))
      : [emptySection()]
  );
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [articleId, setArticleId] = useState(initialArticle?.id || "");
  const [expectedVersion, setExpectedVersion] = useState(initialArticle?.current_version || 0);

  function updateSection(index, key, value) {
    setSections((current) => current.map((section, itemIndex) =>
      itemIndex === index ? { ...section, [key]: value } : section
    ));
  }

  function addSection() {
    setSections((current) => current.length >= 80 ? current : [...current, emptySection()]);
  }

  function removeSection(index) {
    setSections((current) => current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await saveMavisArticleDraft(new FormData(event.currentTarget));
      if (result?.ok) {
        setArticleId(result.articleId);
        setExpectedVersion((current) => current + 1);
        setFeedback({ type: "success", message: "پیش‌نویس با موفقیت ذخیره شد.", articleId: result.articleId });
      } else {
        setFeedback({ type: "error", message: result?.error || "ذخیره پیش‌نویس انجام نشد." });
      }
    } catch {
      setFeedback({ type: "error", message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!articleId || !Number.isInteger(expectedVersion) || expectedVersion < 1 || saving || submittingReview) {
      setFeedback({ type: "error", message: "ابتدا پیش‌نویس را ذخیره کنید تا نسخه مشخصی برای بازبینی وجود داشته باشد." });
      return;
    }
    setSubmittingReview(true);
    setFeedback(null);
    try {
      const result = await submitMavisArticleForReview(articleId, expectedVersion);
      if (!result?.ok) {
        setFeedback({ type: "error", message: result?.error || "ارسال برای بازبینی انجام نشد." });
        return;
      }
      router.push("/admin/mavis/articles?review=submitted");
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "ارتباط با سرور برقرار نشد. وضعیت مقاله را دوباره بررسی کنید." });
    } finally {
      setSubmittingReview(false);
    }
  }

  const content = initialArticle?.content || {};
  const isEditing = Boolean(articleId);

  return (
    <section className={styles.workspace} aria-labelledby="mavis-editor-title">
      <header className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>EDITORIAL WORKSPACE · DRAFT ONLY</span>
          <h2 id="mavis-editor-title">{isEditing ? "ویرایش پیش‌نویس مقاله" : "ساخت پیش‌نویس مقاله"}</h2>
          <p>ذخیره، نسخه جدیدی از پیش‌نویس می‌سازد. انتشار و تغییر وضعیت از این فرم امکان‌پذیر نیست.</p>
        </div>
        <Link href="/admin/mavis/articles" className={styles.backLink}>بازگشت به کتابخانه</Link>
      </header>

      {sourceLoadError ? <p className={styles.sourceError} role="status">{sourceLoadError}</p> : null}
      {initialSources.length ? (
        <section className={styles.sourcePanel} aria-labelledby="mavis-source-metadata-title">
          <header><div><span className={styles.eyebrow}>SOURCE PROVENANCE · READ ONLY</span><h3 id="mavis-source-metadata-title">فراداده و منابع واردشده</h3><p>این اطلاعات از رکورد منبع آمده‌اند؛ تغییر متن مقاله، مجوز بازنشر را تغییر نمی‌دهد.</p></div><span className={styles.sourceCount}>{initialSources.length.toLocaleString("fa-IR")} منبع</span></header>
          <div className={styles.sourceList}>
            {initialSources.map((source) => (
              <article className={styles.sourceCard} key={source.id}>
                <div className={styles.sourceTitle}><strong>{source.title}</strong><span>{source.relation_type === "research_background" ? "پیشینه پژوهش" : source.relation_type === "primary_authority" ? "مستند اولیه" : "ارجاع علمی"}</span></div>
                <dl>
                  <div><dt>نویسنده</dt><dd>{source.author_name || "ثبت نشده"}</dd></div>
                  <div><dt>ناشر</dt><dd>{source.publisher || "ثبت نشده"}</dd></div>
                  <div><dt>تاریخ انتشار</dt><dd>{source.published_on ? source.publication_date_precision === "year" ? source.published_on.slice(0, 4) : source.publication_date_precision === "month" ? source.published_on.slice(0, 7) : source.published_on : "نامشخص"}</dd></div>
                  <div><dt>شناسه منبع</dt><dd dir="ltr">{source.external_id || "ثبت نشده"}</dd></div>
                  <div><dt>حقوق استفاده</dt><dd data-rights={source.rights_status}>{source.rights_status === "licensed" ? "دارای مجوز ثبت‌شده" : source.rights_status === "public_domain" ? "مالکیت عمومی تأییدشده" : source.rights_status === "permission_denied" ? "عدم اجازه بازنشر" : source.rights_status === "metadata_only" ? "فقط فراداده" : source.rights_status === "link_only" ? "فقط پیوند و ارجاع" : "نامشخص · نیازمند بررسی"}</dd></div>
                  {source.license_name ? <div><dt>مجوز</dt><dd>{source.license_name}</dd></div> : null}
                </dl>
                <a href={source.canonical_url} target="_blank" rel="noopener noreferrer">مشاهده رکورد اصلی ↗</a>
                {source.permission_evidence_ref ? <small className={styles.sourceEvidence}>مدرک مجوز: {source.permission_evidence_ref}</small> : null}
                {source.rights_review_note ? <small className={styles.sourceEvidence}>یادداشت بررسی: {source.rights_review_note}</small> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input type="hidden" name="article_id" value={articleId} />
        <input type="hidden" name="expected_version" value={articleId ? expectedVersion : ""} />
        <div className={styles.grid}>
          <label className={styles.field}><span>عنوان مقاله <b>*</b></span><input name="title" defaultValue={initialArticle?.title || ""} required minLength={3} maxLength={300} /></label>
          <label className={styles.field}><span>نامک انگلیسی <b>*</b></span><input name="slug" defaultValue={initialArticle?.slug || ""} required minLength={3} maxLength={180} dir="ltr" pattern="[a-z0-9]+([a-z0-9-]*[a-z0-9])?" placeholder="contract-legal-guide" /><small>حروف کوچک انگلیسی، عدد و خط تیره</small></label>
          <label className={styles.field}><span>نام نویسنده</span><input name="author_name" defaultValue={initialArticle?.author_name || ""} maxLength={180} /></label>
          <label className={styles.field}><span>دسته‌بندی <b>*</b></span><input name="category" defaultValue={initialArticle?.category || ""} required minLength={2} maxLength={100} placeholder="حقوق کیفری، مدنی، خانواده..." /></label>
          <label className={styles.fieldWide}><span>خلاصه مقاله <b>*</b></span><textarea name="excerpt" defaultValue={initialArticle?.excerpt || ""} required minLength={10} maxLength={1200} rows={3} /></label>
          <label className={styles.fieldWide}><span>برچسب‌ها</span><input name="tags" defaultValue={Array.isArray(initialArticle?.tags) ? initialArticle.tags.join("، ") : ""} placeholder="قرارداد، حقوق مدنی، دعاوی" /><small>برچسب‌ها را با ویرگول فارسی یا انگلیسی جدا کنید.</small></label>
          <label className={styles.fieldWide}><span>مقدمه مقاله <b>*</b></span><textarea name="intro" defaultValue={content.intro || ""} required minLength={10} maxLength={8000} rows={5} /></label>
          <label className={styles.fieldWide}><span>هشدار یا توضیح حقوقی</span><textarea name="warning" defaultValue={content.warning || ""} maxLength={2000} rows={2} /></label>
          <label className={styles.fieldWide}><span>چک‌لیست نکات (هر مورد در یک خط)</span><textarea name="checklist" defaultValue={Array.isArray(content.checklist) ? content.checklist.join("\n") : ""} rows={3} /><small>تا ۶۰ مورد، هر مورد حداکثر ۵۰۰ نویسه</small></label>
        </div>

        <section className={styles.sections} aria-labelledby="mavis-editor-sections">
          <div className={styles.sectionHeading}>
            <div><h3 id="mavis-editor-sections">بخش‌های مقاله</h3><p>هر بخش یک عنوان و متن مستقل دارد. حداقل یک بخش لازم است.</p></div>
            <button type="button" className={styles.secondaryButton} onClick={addSection} disabled={sections.length >= 80}>افزودن بخش +</button>
          </div>
          {sections.map((section, index) => (
            <fieldset className={styles.sectionCard} key={index}>
              <legend>بخش {index + 1}</legend>
              <label className={styles.field}><span>عنوان بخش <b>*</b></span><input name="section_heading" value={section.heading} onChange={(event) => updateSection(index, "heading", event.target.value)} required minLength={2} maxLength={240} /></label>
              <label className={styles.field}><span>متن بخش <b>*</b></span><textarea name="section_body" value={section.body} onChange={(event) => updateSection(index, "body", event.target.value)} required minLength={10} maxLength={12000} rows={6} /></label>
              <button type="button" className={styles.removeButton} onClick={() => removeSection(index)} disabled={sections.length <= 1}>حذف این بخش</button>
            </fieldset>
          ))}
        </section>

        <section className={styles.seo} aria-labelledby="mavis-editor-seo">
          <h3 id="mavis-editor-seo">اطلاعات سئو</h3>
          <div className={styles.grid}>
            <label className={styles.field}><span>عنوان سئو</span><input name="seo_title" defaultValue={initialArticle?.seo_title || ""} maxLength={300} /></label>
            <label className={styles.field}><span>توضیحات سئو</span><textarea name="seo_description" defaultValue={initialArticle?.seo_description || ""} maxLength={500} rows={3} /></label>
          </div>
        </section>

        <div className={styles.footer}>
          <p>وضعیت: <strong>{isEditing ? "پیش‌نویس نسخه‌بندی‌شده" : "پیش‌نویس"}</strong>. تأیید حقوقی، بررسی مجوز منابع و انتشار در این مرحله فعال نیست.</p>
          <div className={styles.footerActions}>
            <button type="submit" className={styles.saveButton} disabled={saving || submittingReview}>{saving ? "در حال ذخیره..." : isEditing ? "ذخیره نسخه جدید" : "ذخیره پیش‌نویس"}</button>
            <button type="button" className={styles.reviewButton} onClick={handleSubmitForReview} disabled={!isEditing || saving || submittingReview}>{submittingReview ? "در حال ارسال..." : "ارسال نسخه ذخیره‌شده برای بازبینی"}</button>
          </div>
        </div>
        {feedback ? <div className={styles.feedback} data-state={feedback.type} role="status" aria-live="polite"><strong>{feedback.message}</strong>{feedback.articleId ? <small dir="ltr">شناسه مقاله: {feedback.articleId}</small> : null}</div> : null}
      </form>
    </section>
  );
}
