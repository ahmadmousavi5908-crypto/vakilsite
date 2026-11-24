/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicArticleBySlug } from "../../../lib/mavis/published-editorial";
import JsonLd from "../../../components/JsonLd";
import { getSiteUrl } from "../../../lib/site-url.mjs";
import { getArticleSearchMetadata } from "../../../lib/mavis/article-search-metadata.mjs";
import { buildBreadcrumbSchema } from "../../../lib/seo/breadcrumb-schema.mjs";
import { buildArticleAuthorSchema } from "../../../lib/seo/article-author-schema.mjs";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) {
    return {
      title: "مطلب پیدا نشد",
      robots: { index: false, follow: false },
    };
  }
  const canonicalPath = "/articles/" + article.slug;
  const searchMetadata = getArticleSearchMetadata(article);
  const imageForSearch = article.coverImageUseForSeo === true && article.coverImageUrl
    ? article.coverImageOgUrl || article.coverImageUrl
    : "";
  const imageAlt = article.coverImageAlt || article.title;
  return {
    title: searchMetadata.title,
    description: searchMetadata.description,
    ...(article.isIndexable === false ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      title: searchMetadata.title,
      description: searchMetadata.description,
      ...(imageForSearch ? {
        images: [{
          url: imageForSearch,
          width: 1200,
          height: 630,
          alt: imageAlt,
        }],
      } : {}),
      locale: "fa_IR",
      url: canonicalPath,
    },
    twitter: imageForSearch
      ? { card: "summary_large_image", images: [imageForSearch] }
      : { card: "summary" },
  };
}

export default async function ArticleDetailPage({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) notFound();

  const siteUrl = getSiteUrl();
  const imageAlt = article.coverImageAlt || article.title;
  const articleUrl = siteUrl ? new URL("/articles/" + article.slug, siteUrl).href : null;
  const structuredBreadcrumb = articleUrl
    ? buildBreadcrumbSchema(siteUrl, [
        { name: "صفحه اصلی", path: "/" },
        { name: "مقالات حقوقی", path: "/articles" },
        { name: article.title },
      ])
    : null;
  const structuredAuthor = articleUrl ? buildArticleAuthorSchema(siteUrl, article.authorName) : null;
  const coverImageVariants = article.coverImageUseForSeo === true && article.coverImageUrl
    ? [
        article.coverImageVariants?.wide
          ? { "@type": "ImageObject", url: article.coverImageVariants.wide, width: 1600, height: 900 }
          : { "@type": "ImageObject", url: article.coverImageUrl, width: 1600, height: 900 },
        article.coverImageVariants?.landscape
          ? { "@type": "ImageObject", url: article.coverImageVariants.landscape, width: 1200, height: 900 }
          : null,
        article.coverImageVariants?.square
          ? { "@type": "ImageObject", url: article.coverImageVariants.square, width: 1200, height: 1200 }
          : null,
      ].filter(Boolean)
    : [];
  const primaryImage = coverImageVariants[0] || null;
  const coverImageSrcSet = article.coverImageUrl && article.coverImageVariants
    ? [
        article.coverImageVariants.small ? article.coverImageVariants.small + " 640w" : null,
        article.coverImageVariants.medium ? article.coverImageVariants.medium + " 960w" : null,
        article.coverImageVariants.wide ? article.coverImageVariants.wide + " 1600w" : null,
      ].filter(Boolean).join(", ")
    : "";
  const structuredKeywords = [...new Set([
    article.focusKeyword,
    ...(Array.isArray(article.relatedKeywords) ? article.relatedKeywords : []),
    ...(Array.isArray(article.tags) ? article.tags : []),
  ].map((keyword) => typeof keyword === "string" ? keyword.trim() : "")
    .filter(Boolean))];

  const structuredArticle = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        inLanguage: "fa-IR",
        articleSection: article.category,
        ...(structuredKeywords.length ? { keywords: structuredKeywords.join(", ") } : {}),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
          ...(primaryImage ? { primaryImageOfPage: primaryImage } : {}),
        },
        url: articleUrl,
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        ...(structuredAuthor ? { author: structuredAuthor } : {}),
        ...(coverImageVariants.length ? { image: coverImageVariants } : {}),
      }
    : null;

  return (
    <main className="article-page" dir="rtl">
      {structuredArticle && <JsonLd data={structuredArticle} />}
      {structuredBreadcrumb && <JsonLd data={structuredBreadcrumb} />}
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">خدمات حقوقی <span>دفتر اهواز · خدمات سراسر ایران</span></Link>
          <Link href="/#contact" className="article-header-cta">درخواست بررسی اولیه ←</Link>
        </div>
      </header>
      <section className="article-detail-hero">
        <div className="container">
          <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><Link href="/articles">مقالات حقوقی</Link></div>
          {article.coverImageUrl ? (
            <figure className="article-featured-image">
              <img
                src={article.coverImageUrl}
                srcSet={coverImageSrcSet || undefined}
                sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1200px) calc(100vw - 64px), 1056px"
                alt={imageAlt}
                title={article.coverImageTitle || undefined}
                width="1600"
                height="900"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              {article.coverImageCaption ? <figcaption>{article.coverImageCaption}</figcaption> : null}
            </figure>
          ) : null}
          <span className="section-kicker">راهنمای حقوقی · قوانین ایران</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="article-meta article-detail-meta"><span>{article.readTime} مطالعه</span>{article.authorName ? <span>نویسنده: {article.authorName}</span> : null}<span>ویژه قوانین ایران</span></div>
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
            <ul>{article.sources.map((source) => {
              const sourceTypeLabels = {
                official_law: "قانون یا مقرره رسمی",
                judiciary: "مرجع قضایی",
                government: "مرجع دولتی",
                academic: "منبع علمی و پژوهشی",
                journal: "نشریه",
                news: "منبع خبری",
                manual: "منبع ثبت‌شده دستی",
                other: "منبع تکمیلی",
              };
              const relationLabels = {
                primary_authority: "مستند اولیه",
                secondary_reference: "مرجع ثانویه",
                research_background: "پیشینه پژوهش",
              };
              const details = [
                sourceTypeLabels[source.source_type] || source.source_type,
                relationLabels[source.relation_type],
                source.author_name,
                source.publisher,
                source.published_on,
                source.external_id ? "شماره سند: " + source.external_id : "",
                source.metadata?.issuing_authority ? "مرجع صادرکننده: " + source.metadata.issuing_authority : "",
                source.metadata?.document_type ? "نوع سند: " + source.metadata.document_type : "",
                source.metadata?.document_number && source.metadata.document_number !== source.external_id
                  ? "شناسه سند: " + source.metadata.document_number
                  : "",
              ].filter(Boolean);
              return (
                <li key={source.id || source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label || source.title} ↗</a>
                  {details.length ? <small>{details.join(" · ")}</small> : null}
                </li>
              );
            })}</ul>
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
