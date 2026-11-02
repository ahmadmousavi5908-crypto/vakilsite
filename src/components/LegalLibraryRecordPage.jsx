import Link from "next/link";
import {
  getLegalRecordRelations,
  getLegalRecordPath,
  legalReviewLabels,
  getLegalCategoryName,
  isLegalRecordIndexable,
} from "../lib/legal-library";

function SafeSourceLink({ url, label }) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer">{label || "مشاهده منبع معرفی‌شده"} ↗</a>;
}

function RelatedSection({ title, records, type, renderTitle }) {
  if (!records.length) return null;
  return (
    <section className="container practice-list-section">
      <div className="legal-library-section-heading"><h2>{title}</h2></div>
      <div className="practice-card-grid">
        {records.map((item) => (
          <article className="practice-card" key={item.id}>
            <h3><Link href={getLegalRecordPath(type, item)}>{renderTitle(item)}</Link></h3>
            <p>{item.notes || item.definition || item.summary || "مدخل مرتبط در کتابخانه پژوهشی حقوق ایران."}</p>
            <Link className="practice-card-link" href={getLegalRecordPath(type, item)}>مشاهده مدخل ←</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function getPageSchema(type, record, pageTitle, pagePath) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const pageUrl = siteUrl ? `${siteUrl}${pagePath}` : undefined;
  const mainEntity = type === "terms"
    ? {
        "@type": "DefinedTerm",
        name: record.canonical,
        description: record.definition,
        inDefinedTermSet: { "@type": "DefinedTermSet", name: "فرهنگ اصطلاحات حقوقی ایران" },
      }
    : type === "laws"
      ? {
          "@type": "Legislation",
          name: record.title,
          legislationJurisdiction: { "@type": "Country", name: "ایران" },
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    inLanguage: "fa-IR",
    ...(pageUrl ? { url: pageUrl } : {}),
    ...(mainEntity ? { mainEntity } : {}),
    ...(siteUrl ? {
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "کتابخانه حقوقی", item: `${siteUrl}/legal-library` },
          { "@type": "ListItem", position: 3, name: pageTitle, item: pageUrl },
        ],
      },
    } : {}),
  };
}

export default function LegalLibraryRecordPage({ type, record, pageTitle }) {
  const relations = getLegalRecordRelations(type, record);
  const isVerified = isLegalRecordIndexable(record);
  const schema = getPageSchema(type, record, pageTitle, record.path);
  const title = type === "terms" ? record.canonical : pageTitle;

  return (
    <main className="practice-page" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
          <Link href="/#contact" className="article-header-cta">درخواست بررسی اولیه ←</Link>
        </div>
      </header>

      <section className="practice-hero">
        <div className="container">
          <div className="article-breadcrumb">
            <Link href="/">صفحه اصلی</Link><span>←</span>
            <Link href="/legal-library">کتابخانه حقوقی</Link><span>←</span>
            <Link href="/legal-library/catalog">فهرست مدخل‌ها</Link><span>←</span>
            <span>{title}</span>
          </div>
          <span className="section-kicker">IRANIAN LEGAL RESEARCH · REFERENCE ENTRY</span>
          <h1>{title}</h1>
          {type === "terms" && record.search_title && record.search_title !== record.canonical && <p>{record.search_title}</p>}
          <div className="legal-record-footer">
            <span className={`legal-review-status legal-review-${record.review_status || "unknown"}`}>
              {legalReviewLabels[record.review_status] || "وضعیت بررسی مشخص نیست"}
            </span>
          </div>
        </div>
      </section>

      <section className="container practice-list-section">
        <article className="glossary-entry">
          {type === "terms" && (
            <>
              <h2>تعریف</h2>
              <p>{record.definition}</p>
              {record.aliases?.length > 0 && <div className="legal-record-related"><b>عبارت‌های مرتبط:</b> {record.aliases.join("، ")}</div>}
              {record.category && <div className="legal-record-related"><b>حوزه:</b> {getLegalCategoryName(record.category)}</div>}
            </>
          )}
          {type === "laws" && (
            <>
              <h2>مشخصات قانون</h2>
              {record.enactment_date && <div className="legal-record-related"><b>تاریخ تصویب ثبت‌شده در داده پژوهشی:</b> {record.enactment_date}</div>}
              {record.law_type && <div className="legal-record-related"><b>نوع مدخل:</b> {record.law_type}</div>}
              <p>{record.notes || "برای تشخیص وضعیت اعتبار و اصلاحات، متن رسمی قانون باید بررسی شود."}</p>
              {record.source_url && <div className="legal-record-related"><b>پیوند پژوهشی:</b> <SafeSourceLink url={record.source_url} label="مشاهده منبع ثانویه معرفی‌شده" /></div>}
            </>
          )}
          {type === "articles" && (
            <>
              <h2>خلاصه آموزشی ماده</h2>
              <p>{record.summary}</p>
              {record.exact_text_included === false && (
                <div className="glossary-note">متن کامل ماده در این مجموعه درج نشده است. این متن خلاصه آموزشی است و نباید به‌عنوان نقل‌قول رسمی قانون استفاده شود.</div>
              )}
              {record.notes && <p>{record.notes}</p>}
            </>
          )}
          {record.notes && type === "terms" && <div className="glossary-note">{record.notes}</div>}
          <aside className="legal-library-data-warning">
            <strong>{isVerified ? "وضعیت تطبیق منبع" : "هشدار اعتبار و استناد"}</strong>
            <p>
              {isVerified
                ? "این مدخل در داده پژوهشی با منبع اولیه تطبیق داده شده است. برای اعمال آن در پرونده، اصلاحات بعدی و شرایط خاص موضوع نیز باید بررسی شود."
                : "این مدخل هنوز با منبع اولیه رسمی به‌طور کامل تطبیق و تأیید نشده است. تا زمان بازبینی حقوقی، آن را صرفاً راهنمای پژوهشی بدانید و برای استناد، متن رسمی و آخرین اصلاحات را بررسی کنید."}
            </p>
          </aside>
        </article>
      </section>

      <RelatedSection title="قوانین مرتبط" records={relations.laws} type="laws" renderTitle={(item) => item.title} />
      <RelatedSection title="مواد قانونی مرتبط" records={relations.articles} type="articles" renderTitle={(item) => `ماده ${item.article_number} · ${item.title}`} />
      <RelatedSection title="اصطلاحات مرتبط" records={relations.terms} type="terms" renderTitle={(item) => item.canonical} />

      <section className="container practice-library-note">
        <h2>یادآوری حقوقی</h2>
        <p>محتوای این صفحه برای پژوهش و آموزش عمومی است و جایگزین بررسی متن جاری قانون، رویه قضایی، مقررات اجرایی یا ارزیابی اسناد و شرایط پرونده نیست.</p>
        <Link className="practice-card-link" href="/legal-library/catalog">بازگشت به فهرست کتابخانه ←</Link>
      </section>
      <footer className="article-footer">
        <div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>کتابخانه پژوهشی حقوق ایران · گروه وکیل سید احمد موسوی</span></div>
      </footer>
    </main>
  );
}
