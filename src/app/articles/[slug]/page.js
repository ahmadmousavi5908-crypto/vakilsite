import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "../../../data/articles";
import JsonLd from "../../../components/JsonLd";
import { getPublishedEditorialArticle } from "../../../lib/mavis/editorial-content";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublishedEditorialArticle(slug) || articles.find((item) => item.slug === slug);
  if (!article) return { title: "مطلب پیدا نشد" };
  const canonicalPath = "/articles/" + article.slug;
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    robots: article.isIndexable === false ? { index: false, follow: false } : { index: true, follow: true },
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      locale: "fa_IR",
      url: canonicalPath,
      ...(article.image?.useForSeo && article.image?.ogUrl ? {
        images: [{ url: article.image.ogUrl, width: 1200, height: 630, alt: article.image.alt || article.title }],
      } : {}),
    },
    ...(article.image?.useForSeo && article.image?.ogUrl ? {
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: article.excerpt,
        images: [article.image.ogUrl],
      },
    } : {}),
  };
}

export default async function ArticleDetailPage({ params }) {
  const { slug } = await params;
  const article = await getPublishedEditorialArticle(slug) || articles.find((item) => item.slug === slug);
  if (!article) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const articleUrl = siteUrl ? siteUrl + "/articles/" + article.slug : null;
  const structuredArticle = articleUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        inLanguage: "fa-IR",
        articleSection: article.category,
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        author: {
          "@type": "Person",
          name: article.authorName || "سید احمد موسوی",
        },
        publisher: {
          "@type": "Organization",
          name: "وکیل‌سایت | سید احمد موسوی",
          url: siteUrl,
        },
        ...(article.reviewerName ? {
          reviewedBy: { "@type": "Person", name: article.reviewerName },
        } : {}),
        ...(article.image?.useForSeo && article.image?.url ? {
          image: [
            article.image.variants?.wide || article.image.url,
            article.image.variants?.landscape,
            article.image.variants?.square,
          ].filter(Boolean),
        } : {}),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
          ...(article.image?.useForSeo && article.image?.url ? {
            primaryImageOfPage: article.image.variants?.wide || article.image.url,
          } : {}),
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
          {article.image?.showInArticle && article.image?.url ? (
            <figure className="article-featured-image">
              <img
                className="article-featured-image__img"
                src={article.image.url}
                srcSet={[
                  article.image.variants?.small ? `${article.image.variants.small} 640w` : null,
                  article.image.variants?.medium ? `${article.image.variants.medium} 960w` : null,
                  article.image.variants?.wide ? `${article.image.variants.wide} 1600w` : null,
                ].filter(Boolean).join(", ") || undefined}
                sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1120px) calc(100vw - 64px), 1056px"
                alt={article.image.alt || article.title}
                title={article.image.title || article.title}
                width={1600}
                height={900}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              {article.image.caption ? <figcaption className="article-featured-image__caption">{article.image.caption}</figcaption> : null}
            </figure>
          ) : null}
          <span className="section-kicker">راهنمای حقوقی · قوانین ایران</span>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <div className="article-meta article-detail-meta">
            <span>{article.readTime} مطالعه</span>
            <span>نویسنده: {article.authorName || "سید احمد موسوی"}</span>
            {article.reviewerName ? <span>بازبینی حقوقی: {article.reviewerName}</span> : null}
            <span>ویژه قوانین ایران</span>
          </div>
        </div>
      </section>
      <div className="container article-detail-layout">
        <article className="article-body">
          <p className="article-intro">{article.intro}</p>
          {article.sections?.length >= 3 ? (
            <nav className="article-toc" aria-label="فهرست مطالب مقاله">
              <strong>در این مقاله می‌خوانید</strong>
              <ol>
                {article.sections.map((section, index) => (
                  <li key={section.heading + "-toc-" + index}>
                    <a href={`#article-section-${index + 1}`}>{section.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {(article.sections || []).map((section, index) => (
            <section className="article-body-section" id={`article-section-${index + 1}`} key={section.heading + "-" + index}>
              <h2>{section.heading}</h2>
              {String(section.body || "").split(String.fromCharCode(10, 10)).filter(Boolean).map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </section>
          ))}
          {article.checklist?.length ? <div className="article-checklist">
            <h2>چک‌لیست پیش از مراجعه</h2>
            <ul>{article.checklist.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
          </div> : null}
          {article.warning ? <div className="article-legal-note"><b>نکته مهم</b><p>{article.warning}</p></div> : null}
          {article.sources?.length ? <section className="article-sources">
            <h2>مستندات و منابع قانونی</h2>
            <p>برای مطالعه متن قوانین و تطبیق آخرین اصلاحات، از منابع زیر استفاده کنید:</p>
            <ul>{article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul>
          </section> : null}
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
