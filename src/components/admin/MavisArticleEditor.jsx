"use client";

import { useState } from "react";
import Link from "next/link";
import { saveMavisArticleDraft } from "../../app/admin/mavis/articles/actions";
import styles from "./MavisArticleEditor.module.css";

const emptySection = () => ({ heading: "", body: "" });

export default function MavisArticleEditor() {
  const [sections, setSections] = useState([emptySection()]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

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
      setFeedback(result?.ok
        ? { type: "success", message: "پیش‌نویس با موفقیت ذخیره شد.", articleId: result.articleId }
        : { type: "error", message: result?.error || "ذخیره پیش‌نویس انجام نشد." });
    } catch {
      setFeedback({ type: "error", message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.workspace} aria-labelledby="mavis-editor-title">
      <header className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>EDITORIAL WORKSPACE · DRAFT ONLY</span>
          <h2 id="mavis-editor-title">ساخت پیش‌نویس مقاله</h2>
          <p>ذخیره فقط یک پیش‌نویس نسخه‌بندی‌شده می‌سازد و هیچ محتوایی را منتشر نمی‌کند.</p>
        </div>
        <Link href="/admin/mavis/articles" className={styles.backLink}>بازگشت به کتابخانه</Link>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <label className={styles.field}><span>عنوان مقاله <b>*</b></span><input name="title" required minLength={3} maxLength={300} /></label>
          <label className={styles.field}><span>نامک انگلیسی <b>*</b></span><input name="slug" required minLength={3} maxLength={180} dir="ltr" pattern="[a-z0-9]+([a-z0-9-]*[a-z0-9])?" placeholder="contract-legal-guide" /><small>حروف کوچک انگلیسی، عدد و خط تیره</small></label>
          <label className={styles.field}><span>نام نویسنده</span><input name="author_name" maxLength={180} /></label>
          <label className={styles.field}><span>دسته‌بندی <b>*</b></span><input name="category" required minLength={2} maxLength={100} placeholder="حقوق کیفری، مدنی، خانواده..." /></label>
          <label className={styles.fieldWide}><span>خلاصه مقاله <b>*</b></span><textarea name="excerpt" required minLength={10} maxLength={1200} rows={3} /></label>
          <label className={styles.fieldWide}><span>برچسب‌ها</span><input name="tags" placeholder="قرارداد، حقوق مدنی، دعاوی" /><small>برچسب‌ها را با ویرگول فارسی یا انگلیسی جدا کنید.</small></label>
          <label className={styles.fieldWide}><span>مقدمه مقاله <b>*</b></span><textarea name="intro" required minLength={10} maxLength={8000} rows={5} /></label>
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
            <label className={styles.field}><span>عنوان سئو</span><input name="seo_title" maxLength={300} /></label>
            <label className={styles.field}><span>توضیحات سئو</span><textarea name="seo_description" maxLength={500} rows={3} /></label>
          </div>
        </section>

        <div className={styles.footer}>
          <p>وضعیت: <strong>پیش‌نویس</strong>. تأیید حقوقی، بررسی مجوز منابع و انتشار در این مرحله فعال نیست.</p>
          <button type="submit" className={styles.saveButton} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره پیش‌نویس"}</button>
        </div>
        {feedback ? <div className={styles.feedback} data-state={feedback.type} role="status" aria-live="polite"><strong>{feedback.message}</strong>{feedback.articleId ? <small dir="ltr">شناسه مقاله: {feedback.articleId}</small> : null}</div> : null}
      </form>
    </section>
  );
}
