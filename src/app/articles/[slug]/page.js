/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicArticleBySlug } from "../../../lib/mavis/published-editorial";
import JsonLd from "../../../components/JsonLd";
import { getSiteUrl } from "../../../lib/site-url.mjs";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) return { title: "مطلب پیدا نشد" };
  const canonicalPath = "/articles/" + article.slug;
  return {
    title: article.seoTitle || article.metaTitle || article.title,
    description: article.seoDescription || article.excerpt,
    ...(article.isIndexable === false ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.seoDescription || article.excerpt,
      ...(article.coverImageUrl ? { images: [article.coverImageUrl] } : {}),
      locale: "fa_IR",
      url: canonicalPath,
    },
  };
}

export default async function ArticleDetailPage({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) notFound();

  const siteUrl = getSiteUrl();
  const articleUrl = siteUrl ? new URL("/articles/" + article.slug, siteUrl).href : null;
  const legalMetadata = article.legalMetadata || {};
  const recordType = article.recordType || "article";
  const recordTypeLabels = { article: "مقاله حقوقی", law: "قانون یا مقرره", unifying_opinion: "رأی وحدت رویه", judicial_decision: "رأی قضایی", advisory_opinion: "نظریه مشورتی", legal_interpretation: "تفسیر و شرح قانون", legal_analysis: "تحلیل مسئله حقوقی", official_circular: "بخشنامه و دستورالعمل", academic_research: "پژوهش و مقاله علمی" };
  const validityLabels = { unknown: "بررسی‌نشده", current: "معتبر در حال حاضر", amended: "اصلاح‌شده", repealed: "منسوخ", historical: "معتبر در بازه تاریخی", disputed: "مورد اختلاف / نیازمند بررسی" };
  const schemaType = recordType === "law" ? "Legislation" : recordType === "academic_research" ? "ScholarlyArticle" : ["unifying_opinion", "judicial_decision", "advisory_opinion", "official_circular"].includes(recordType) ? "CreativeWork" : "Article";
  const structuredArticle = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": schemaType,
        headline: article.title,
        description: article.excerpt,
        inLanguage: "fa-IR",
        articleSection: article.category,
        ...(recordType === "law" ? {
          legislationType: recordTypeLabels[recordType],
          ...(legalMetadata.document_number ? { legislationIdentifier: legalMetadata.document_number } : {}),
          ...(legalMetadata.document_date ? { legislationDate: legalMetadata.document_date } : {}),
          ...(legalMetadata.issuing_authority ? { legislationPassedBy: { "@type": "Organization", name: legalMetadata.issuing_authority } } : {}),
          legislationJurisdiction: { "@type": "AdministrativeArea", name: "ایران" },
        } : {}),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
        },
        url: articleUrl,
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        ...(article.authorName ? { author: { "@type": "Person", name: article.authorName } } : {}),
        ...(article.coverImageUrl ? { image: article.coverImageUrl } : {}),
      }
    : null;

  return (
    <main className="article-page" dir="rtl">
      {structuredArticle && <JsonLd data={structuredArticle} />}
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">خدمات حقوقی <span>دفتر اهواز · خدمات سراسر ایران</span></Link>
          <Link href="/#contact" className="article-header-cta">درخواست بررسی اولیه ←</Link>
        </div>
      </header>
      <section className="article-detail-hero">
        <div className="container">
          <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><Link href="/articles">مقالات حقوقی</Link></div>
          <span className="section-kicker">{recordTypeLabels[recordType] || "محتوای حقوقی"} · قوانین ایران</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="article-meta article-detail-meta"><span>{article.readTime} مطالعه</span>{article.authorName ? <span>نویسنده: {article.authorName}</span> : null}<span>ویژه قوانین ایران</span></div>
        </div>
      </section>
      <div className="container article-detail-layout">
        <article className="article-body">
          {article.coverImageUrl ? <figure className="article-cover-image"><img src={article.coverImageUrl} alt={article.coverImageAlt || article.title} loading="lazy" decoding="async" /><figcaption>{article.coverImageAlt || article.title}</figcaption></figure> : null}
          <p className="article-intro">{article.intro}</p>
          {article.sections.map((section, index) => (
            <section className="article-body-section" key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="article-checklist">
            <h2>چک‌لیست پیش از مراجعه</h2>
            <ul>{article.checklist.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
          </div>
          <div className="article-legal-note"><b>نکته مهم</b><p>{article.warning}</p></div>
          {Object.values(legalMetadata).some(Boolean) ? (
            <section className="article-sources">
              <h2>مشخصات حقوقی سند</h2>
              <ul>
                {legalMetadata.document_number ? <li>شماره / شناسه: {legalMetadata.document_number}</li> : null}
                {legalMetadata.issuing_authority ? <li>مرجع صادرکننده: {legalMetadata.issuing_authority}</li> : null}
                {legalMetadata.document_date ? <li>تاریخ صدور / تصویب: {legalMetadata.document_date}</li> : null}
                {legalMetadata.publication_date ? <li>تاریخ انتشار: {legalMetadata.publication_date}</li> : null}
                {legalMetadata.effective_from ? <li>لازم‌الاجرا از: {legalMetadata.effective_from}</li> : null}
                {legalMetadata.effective_until ? <li>پایان اعتبار: {legalMetadata.effective_until}</li> : null}
                {legalMetadata.validity_status ? <li>وضعیت اعتبار ثبت‌شده: {validityLabels[legalMetadata.validity_status] || validityLabels.unknown}</li> : null}
                {legalMetadata.related_law ? <li>سند مرتبط: {legalMetadata.related_law}</li> : null}
              </ul>
            </section>
          ) : null}
          {article.sourceMetadata && Object.values(article.sourceMetadata).some(Boolean) ? (
            <section className="article-sources">
              <h2>مشخصات انتشار و سند</h2>
              <ul>
                {article.sourceMetadata.publication ? <li>نشریه / پایگاه: {article.sourceMetadata.publication}</li> : null}
                {article.sourceMetadata.publicationDate ? <li>تاریخ انتشار: {article.sourceMetadata.publicationDate}</li> : null}
                {article.sourceMetadata.documentNumber ? <li>شماره سند / رأی: {article.sourceMetadata.documentNumber}</li> : null}
                {article.sourceMetadata.issuingAuthority ? <li>مرجع صادرکننده: {article.sourceMetadata.issuingAuthority}</li> : null}
                {article.sourceMetadata.documentType ? <li>نوع سند: {article.sourceMetadata.documentType}</li> : null}
              </ul>
            </section>
          ) : null}
          <section className="article-sources">
            <h2>مستندات و منابع قانونی</h2>
            <p>برای مطالعه متن قوانین و تطبیق آخرین اصلاحات، از منابع زیر استفاده کنید:</p>
            <ul>{article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul>
          </section>
          <div className="article-next-actions">
            <Link href="/articles">← بازگشت به همه مقالات</Link>
            <Link href="/#contact">درخواست بررسی موضوع من <span>←</span></Link>
          </div>
        </article>
        <aside className="article-sidebar">
          <div className="article-sidebar-card">
            <span className="section-kicker">CASE BY CASE</span>
            <h2>هر پرونده،<br/><em>جزئیات خودش را دارد.</em></h2>
            <p>اگر مسئله شما به این موضوع مربوط است، شرح کوتاهی از وضعیت و مرحله پرونده ثبت کنید تا امکان بررسی اولیه مشخص شود.</p>
            <Link href="/#contact">ثبت درخواست اولیه ←</Link>
          </div>
          <div className="article-sidebar-card article-sidebar-muted">
            <b>پیش از ارسال اطلاعات</b>
            <p>در فرم عمومی، کد ملی، شماره پرونده، نشانی دقیق، اطلاعات بانکی یا تصویر اسناد محرمانه را وارد نکنید. مدارک فقط پس از هماهنگی و از مسیر مناسب دریافت می‌شوند.</p>
          </div>
        </aside>
      </div>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>اطلاع‌رسانی حقوقی بر پایه قوانین ایران</span></div></footer>
    </main>
  );
}
