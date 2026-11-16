import Link from "next/link";
import { notFound } from "next/navigation";
import { articles as siteArticles } from "../../../data/articles";
import { getPublicArticleBySlug } from "../../../lib/mavis/published-editorial";
import JsonLd from "../../../components/JsonLd";
import { getSiteUrl } from "../../../lib/site-url.mjs";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return siteArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) return { title: "مطلب پیدا نشد" };
  const canonicalPath = "/articles/" + article.slug;
  return {
    title: article.metaTitle || article.title,
    description: article.excerpt,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
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
  const structuredArticle = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        inLanguage: "fa-IR",
        articleSection: article.category,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
        },
        url: articleUrl,
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
          <span className="section-kicker">راهنمای حقوقی · قوانین ایران</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="article-meta article-detail-meta"><span>{article.readTime} مطالعه</span><span>ویژه قوانین ایران</span></div>
        </div>
      </section>
      <div className="container article-detail-layout">
        <article className="article-body">
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
