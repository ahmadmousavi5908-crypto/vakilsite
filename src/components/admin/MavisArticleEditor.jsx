"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addMavisManualArticleSource, generateMavisEditorialDraft, saveMavisArticleDraft, submitMavisArticleForReview } from "../../app/admin/mavis/articles/actions";
import MavisIranianSourceSearch from "./MavisIranianSourceSearch";
import MavisWebArticleResearch from "./MavisWebArticleResearch";
import styles from "./MavisArticleEditor.module.css";

const emptySection = () => ({ heading: "", body: "" });

export default function MavisArticleEditor({ initialArticle = null, initialSources = [], sourceLoadError = "", aiEnabled = false, initialTopic = "" }) {
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
  const formRef = useRef(null);
  const [sources, setSources] = useState(initialSources);
  const [sourceFeedback, setSourceFeedback] = useState("");
  const [sourceBusy, setSourceBusy] = useState(false);
  const [manualSource, setManualSource] = useState({
    title: "",
    sourceUrl: "",
    sourceType: "manual",
    relationType: "research_background",
    author: "",
    publication: "",
    publicationDate: "",
    documentNumber: "",
    issuingAuthority: "",
    documentType: "",
    abstract: ""
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiReport, setAiReport] = useState(null);
  const [pendingWebSource, setPendingWebSource] = useState(null);

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
        const savedVersion = articleId ? expectedVersion + 1 : 1;
        setArticleId(result.articleId);
        setExpectedVersion(savedVersion);

        let successMessage = "پیش‌نویس با موفقیت ذخیره شد.";
        if (pendingWebSource) {
          const sourceResult = await addMavisManualArticleSource(result.articleId, savedVersion, pendingWebSource);
          if (sourceResult?.ok) {
            setExpectedVersion(sourceResult.currentVersion);
            setSources((current) => [...current.filter((item) => item.id !== sourceResult.source.id), {
              ...sourceResult.source,
              relation_type: pendingWebSource.relationType,
            }]);
            setPendingWebSource(null);
            setSourceFeedback("منبع استخراج‌شده به نسخه پیش‌نویس متصل شد؛ اعتبار و حقوق استفاده همچنان نیازمند بررسی مدیر است.");
            successMessage = "پیش‌نویس و اطلاعات منبع با موفقیت ذخیره شدند.";
          } else {
            setSourceFeedback(sourceResult?.error || "پیش‌نویس ذخیره شد، اما اتصال منبع انجام نشد. اطلاعات منبع در فرم باقی مانده است.");
            setManualSource(pendingWebSource);
            setPendingWebSource(null);
            successMessage = "پیش‌نویس ذخیره شد؛ اطلاعات منبع در فرم ثبت دستی باقی مانده است.";
          }
        }
        setFeedback({ type: "success", message: successMessage, articleId: result.articleId });
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

  async function handleImportIranianSource(metadata) {
    if (!articleId || expectedVersion < 1) {
      return { ok: false, error: "ابتدا پیش‌نویس را ذخیره کنید." };
    }

    const authority = metadata.sourceAuthority || "";
    const sourceType = authority === "official_primary" ? "official_law"
      : ["official_judicial", "official_portal"].includes(authority) ? "judiciary"
      : authority === "official_research" ? "government"
      : ["academic", "academic_index"].includes(authority) || metadata.sourceGroup === "academic" ? "academic"
      : authority === "secondary_reference" ? "other"
      : "manual";
    const relationType = ["official_primary", "official_judicial", "official_portal", "official_research"].includes(authority)
      ? "primary_authority"
      : authority === "secondary_reference" ? "secondary_reference" : "research_background";

    const result = await addMavisManualArticleSource(articleId, expectedVersion, {
      ...metadata,
      sourceType,
      relationType
    });

    if (!result?.ok) {
      setSourceFeedback(result?.error || "ثبت منبع انجام نشد.");
      return result;
    }

    setExpectedVersion(result.currentVersion);
    setSources((current) => {
      const next = current.filter((item) => item.id !== result.source.id);
      return [...next, result.source];
    });
    setSourceFeedback(result.alreadyAttached
      ? "این منبع از قبل به مقاله متصل بوده است."
      : "منبع به نسخه جدید پیش‌نویس متصل شد.");
    return result;
  }

  async function handleManualSourceSubmit(event) {
    event.preventDefault();
    if (!articleId || sourceBusy) return;
    setSourceBusy(true);
    setSourceFeedback("");

    try {
      const result = await addMavisManualArticleSource(articleId, expectedVersion, manualSource);
      if (!result?.ok) {
        setSourceFeedback(result?.error || "ثبت منبع انجام نشد.");
        return;
      }

      setExpectedVersion(result.currentVersion);
      setSources((current) => {
        const next = current.filter((item) => item.id !== result.source.id);
        return [...next, result.source];
      });
      setManualSource({
        title: "",
        sourceUrl: "",
        sourceType: "manual",
        relationType: "research_background",
        author: "",
        publication: "",
        publicationDate: "",
        documentNumber: "",
        issuingAuthority: "",
        documentType: "",
        abstract: ""
      });
      setSourceFeedback(result.alreadyAttached ? "این منبع قبلاً متصل شده است." : "منبع دستی ثبت و به نسخه جدید پیش‌نویس متصل شد.");
    } catch {
      setSourceFeedback("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSourceBusy(false);
    }
  }

  function applyWebResearch(metadata) {
    const fields = formRef.current?.elements;
    if (!fields) return;
    const setField = (name, value) => {
      const field = fields.namedItem(name);
      if (field && typeof value === "string") field.value = value;
    };
    const summary = metadata.abstract || "چکیده منبع در نتیجه جست‌وجو موجود نبود؛ پس از مطالعه منبع تکمیل شود.";
    setField("title", metadata.title || "");
    setField("author_name", metadata.author || "");
    setField("excerpt", summary);
    setField("intro", "این پیش‌نویس با استفاده از فراداده منبع وب تهیه شده است. متن تحلیلی باید پس از مطالعه منبع و با نگارش مستقل تکمیل و مستند شود.");
    setField("seo_title", metadata.title || "");
    setField("seo_description", summary);
    if (!String(fields.namedItem("category")?.value || "").trim()) {
      setField("category", "پژوهش حقوقی");
    }
    setSections([{
      heading: "معرفی و محورهای پژوهش",
      body: "این بخش پس از مطالعه متن کامل منبع و با نگارش مستقل تکمیل می‌شود. اطلاعات کتاب‌شناختی و پیوند منبع در بخش منابع ثبت خواهد شد.",
    }]);

    const source = {
      title: metadata.title || "منبع پژوهشی استخراج‌شده از وب",
      sourceUrl: metadata.sourceUrl,
      sourceType: "academic",
      relationType: "research_background",
      author: metadata.author || "",
      publication: metadata.publication || "",
      publicationDate: metadata.publicationDate || "",
      documentNumber: metadata.documentNumber || "",
      abstract: summary,
    };
    setManualSource(source);
    setPendingWebSource(source);
    setSourceFeedback("اطلاعات مقاله به فرم منتقل شد. برای ثبت پیش‌نویس و اتصال منبع، دکمه ذخیره را بزنید.");
    setFeedback({ type: "success", message: "فراداده منبع در فیلدهای مقاله قرار گرفت؛ پیش از ذخیره، همه موارد را بازبینی کنید." });
  }

  function updateManualSource(key, value) {
    setManualSource((current) => ({ ...current, [key]: value }));
  }

  async function handleGenerateAiDraft() {
    if (!aiEnabled || aiGenerating || saving || !formRef.current) return;
    setAiGenerating(true);
    setAiFeedback("");
    setAiReport(null);

    try {
      const result = await generateMavisEditorialDraft(new FormData(formRef.current));
      if (!result?.ok) {
        setAiFeedback(result?.error || "تهیه پیش‌نویس هوشمند انجام نشد.");
        return;
      }

      const suggestions = result.suggestions;
      const fields = formRef.current.elements;
      const setField = (name, value) => {
        const field = fields.namedItem(name);
        if (field && typeof value === "string") field.value = value;
      };

      setField("title", suggestions.title);
      setField("slug", suggestions.slug);
      setField("category", suggestions.category);
      setField("excerpt", suggestions.excerpt);
      setField("intro", suggestions.intro);
      setField("warning", suggestions.warning);
      setField("checklist", suggestions.checklist.join("\n"));
      setField("seo_title", suggestions.seoTitle);
      setField("seo_description", suggestions.seoDescription);
      setField("tags", [...new Set([suggestions.focusKeyword, ...suggestions.relatedKeywords].filter(Boolean))].join("، "));
      setSections(suggestions.sections);
      setAiReport({
        focusKeyword: suggestions.focusKeyword,
        relatedKeywords: suggestions.relatedKeywords,
        evidenceGaps: suggestions.evidenceGaps,
        sourceCitations: suggestions.sourceCitations,
        remainingRequests: result.remainingRequests
      });
      setAiFeedback("پیشنهاد آماده شد؛ هیچ تغییری خودکار ذخیره یا منتشر نشده است. متن و مستندات را بازبینی کنید.");
    } catch {
      setAiFeedback("ارتباط با دستیار هوشمند برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setAiGenerating(false);
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

      <MavisWebArticleResearch onApply={applyWebResearch} />
      {sourceLoadError ? <p className={styles.sourceError} role="status">{sourceLoadError}</p> : null}
      <section className={styles.sourcePanel} aria-labelledby="mavis-source-metadata-title">
        <header>
          <div>
            <span className={styles.eyebrow}>SOURCE PROVENANCE · VERSIONED</span>
            <h3 id="mavis-source-metadata-title">منابع و مستندات مقاله</h3>
            <p>منابع به نسخه جاری پیش‌نویس متصل می‌شوند و در تاریخچه نسخه‌ها ثبت خواهند شد. ثبت منبع به‌معنای تأیید اعتبار یا مجوز بازنشر نیست.</p>
          </div>
          <span className={styles.sourceCount}>{sources.length.toLocaleString("fa-IR")} منبع</span>
        </header>

        {sources.length ? (
          <div className={styles.sourceList}>
            {sources.map((source) => (
              <article className={styles.sourceCard} key={source.id}>
                <div className={styles.sourceTitle}>
                  <strong>{source.title}</strong>
                  <span>{source.relation_type === "primary_authority" ? "مستند اولیه" : source.relation_type === "secondary_reference" ? "مرجع ثانویه" : "پیشینه پژوهش"}</span>
                </div>
                <dl>
                  <div><dt>نویسنده</dt><dd>{source.author_name || "ثبت نشده"}</dd></div>
                  <div><dt>مرجع / ناشر</dt><dd>{source.publisher || "ثبت نشده"}</dd></div>
                  <div><dt>تاریخ انتشار</dt><dd>{source.published_on || "نامشخص"}</dd></div>
                  <div><dt>شماره سند</dt><dd dir="ltr">{source.external_id || source.metadata?.document_number || "ثبت نشده"}</dd></div>
                  <div><dt>حقوق استفاده</dt><dd data-rights={source.rights_status}>{source.rights_status === "licensed" ? "دارای مجوز ثبت‌شده" : source.rights_status === "public_domain" ? "مالکیت عمومی تأییدشده" : source.rights_status === "permission_denied" ? "عدم اجازه بازنشر" : source.rights_status === "metadata_only" ? "فقط فراداده" : source.rights_status === "link_only" ? "فقط پیوند و ارجاع" : "نامشخص · نیازمند بررسی"}</dd></div>
                  {source.license_name ? <div><dt>مجوز</dt><dd>{source.license_name}</dd></div> : null}
                </dl>
                {source.citation_label ? <small className={styles.sourceEvidence}>مشخصات ارجاع: {source.citation_label}</small> : null}
                {source.metadata?.abstract ? <small className={styles.sourceEvidence}>چکیده ثبت‌شده: {source.metadata.abstract}</small> : null}
                <a href={source.canonical_url} target="_blank" rel="noopener noreferrer">مشاهده رکورد اصلی ↗</a>
                {source.rights_review_note ? <small className={styles.sourceEvidence}>یادداشت حقوق استفاده: {source.rights_review_note}</small> : null}
              </article>
            ))}
          </div>
        ) : <p className={styles.sourceEmpty}>هنوز منبعی به این پیش‌نویس متصل نشده است.</p>}

        {isEditing ? (
          <>
            <details className={styles.sourceTools}>
              <summary>جست‌وجوی قوانین، آرای قضایی و منابع علمی ایران</summary>
              <MavisIranianSourceSearch onImport={handleImportIranianSource} />
            </details>
            <details className={styles.sourceTools}>
              <summary>ثبت منبع با نشانی مستقیم</summary>
              <form className={styles.manualSourceForm} onSubmit={handleManualSourceSubmit}>
                <label className={styles.field}><span>عنوان منبع <b>*</b></span><input value={manualSource.title} onChange={(event) => updateManualSource("title", event.target.value)} required minLength={2} maxLength={500} /></label>
                <label className={styles.fieldWide}><span>نشانی HTTPS منبع <b>*</b></span><input value={manualSource.sourceUrl} onChange={(event) => updateManualSource("sourceUrl", event.target.value)} type="url" required maxLength={2000} dir="ltr" placeholder="https://..." /></label>
                <div className={styles.grid}>
                  <label className={styles.field}><span>نوع منبع</span><select value={manualSource.sourceType} onChange={(event) => updateManualSource("sourceType", event.target.value)}><option value="manual">منبع دستی</option><option value="official_law">قانون / مقرره رسمی</option><option value="judiciary">مرجع قضایی</option><option value="government">مرجع دولتی</option><option value="academic">علمی / پژوهشی</option><option value="journal">نشریه</option><option value="other">سایر</option></select></label>
                  <label className={styles.field}><span>ارتباط با مقاله</span><select value={manualSource.relationType} onChange={(event) => updateManualSource("relationType", event.target.value)}><option value="primary_authority">مستند اولیه</option><option value="secondary_reference">مرجع ثانویه</option><option value="research_background">پیشینه پژوهش</option></select></label>
                  <label className={styles.field}><span>نویسنده</span><input value={manualSource.author} onChange={(event) => updateManualSource("author", event.target.value)} maxLength={300} /></label>
                  <label className={styles.field}><span>مرجع / ناشر</span><input value={manualSource.issuingAuthority} onChange={(event) => updateManualSource("issuingAuthority", event.target.value)} maxLength={300} /></label>
                  <label className={styles.field}><span>شماره سند / رأی</span><input value={manualSource.documentNumber} onChange={(event) => updateManualSource("documentNumber", event.target.value)} maxLength={300} /></label>
                  <label className={styles.field}><span>نوع سند</span><input value={manualSource.documentType} onChange={(event) => updateManualSource("documentType", event.target.value)} maxLength={200} /></label>
                  <label className={styles.field}><span>تاریخ انتشار (میلادی YYYY-MM-DD)</span><input value={manualSource.publicationDate} onChange={(event) => updateManualSource("publicationDate", event.target.value)} maxLength={40} dir="ltr" /></label>
                  <label className={styles.field}><span>نام نشریه / پایگاه</span><input value={manualSource.publication} onChange={(event) => updateManualSource("publication", event.target.value)} maxLength={300} /></label>
                  <label className={styles.fieldWide}><span>چکیده یا توضیح کوتاه</span><textarea value={manualSource.abstract} onChange={(event) => updateManualSource("abstract", event.target.value)} maxLength={1200} rows={3} /></label>
                </div>
                <button type="submit" className={styles.sourceSubmit} disabled={sourceBusy || !manualSource.title.trim() || !manualSource.sourceUrl.trim()}>{sourceBusy ? "در حال ثبت..." : "ثبت و اتصال منبع به نسخه جاری"}</button>
              </form>
            </details>
          </>
        ) : (
          <p className={styles.sourceEmpty}>برای افزودن منبع، ابتدا پیش‌نویس را ذخیره کنید تا شناسه و نسخه مشخص داشته باشد.</p>
        )}
        {sourceFeedback ? <p className={styles.sourceFeedback} role="status" aria-live="polite">{sourceFeedback}</p> : null}
      </section>

      <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
        <input type="hidden" name="article_id" value={articleId} />
        <input type="hidden" name="expected_version" value={articleId ? expectedVersion : ""} />
        <div className={styles.grid}>
          <label className={styles.field}><span>عنوان مقاله <b>*</b></span><input name="title" defaultValue={initialArticle?.title || initialTopic || ""} required minLength={3} maxLength={300} /></label>
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

        <section className={styles.aiAssist} aria-labelledby="mavis-ai-assist-title">
          <header><span className={styles.eyebrow}>MAVIS EDITORIAL ASSISTANT</span><h3 id="mavis-ai-assist-title">دستیار تولید و بهینه‌سازی پیش‌نویس</h3><p>پیشنهادها فقط در فرم قرار می‌گیرند؛ ذخیره، تأیید حقوقی و انتشار همچنان اقدام مستقل مدیر است.</p></header>
          <button type="button" className={styles.aiButton} onClick={handleGenerateAiDraft} disabled={!aiEnabled || aiGenerating || saving}>{aiGenerating ? "در حال تهیه پیش‌نویس..." : "تهیه پیش‌نویس و پیشنهادهای سئو با ماویس"}</button>
          {!aiEnabled ? <p className={styles.aiNotice}>اتصال مدل فعال نیست. کلید MAVIS_OPENAI_API_KEY باید به‌صورت Secret در Worker آزمایشی تنظیم شود.</p> : null}
          {aiFeedback ? <p className={styles.aiFeedback} role="status" aria-live="polite">{aiFeedback}</p> : null}
          {aiReport ? (
            <div className={styles.aiReport}>
              {aiReport.focusKeyword ? <p><strong>عبارت کلیدی اصلی:</strong> {aiReport.focusKeyword}</p> : null}
              {aiReport.relatedKeywords.length ? <p><strong>عبارت‌های مرتبط:</strong> {aiReport.relatedKeywords.join("، ")}</p> : null}
              {aiReport.sourceCitations.length ? <div><strong>منابع پیشنهادی مدل:</strong><ul>{aiReport.sourceCitations.map((item) => <li key={item.sourceId}>{item.citationLabel || sources.find((source) => source.id === item.sourceId)?.title || "منبع متصل"}: {item.usedFor}</li>)}</ul></div> : null}
              {aiReport.evidenceGaps.length ? <div className={styles.aiEvidenceGaps}><strong>موارد نیازمند مستندسازی و بررسی وکیل:</strong><ul>{aiReport.evidenceGaps.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}
              <small>درخواست باقی‌مانده در بازه فعلی: {Number.isInteger(aiReport.remainingRequests) ? aiReport.remainingRequests : "نامشخص"}</small>
            </div>
          ) : null}
          <p className={styles.aiNotice}>اطلاعات پرونده، نام موکل یا داده محرمانه وارد نکنید. هیچ قانون یا رأیی بدون تطبیق با منبع معتبر، مستند نهایی محسوب نمی‌شود.</p>
        </section>

        <div className={styles.footer}>
          <p>وضعیت: <strong>{isEditing ? "پیش‌نویس نسخه‌بندی‌شده" : "پیش‌نویس"}</strong>. بازبینی حقوقی و انتشار فقط در مراحل مستقل بعدی انجام می‌شود.</p>
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
