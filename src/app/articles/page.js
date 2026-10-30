import Link from "next/link";
import { articles } from "../../data/articles";

export const metadata = {
  title: "راهنماها و مقالات حقوقی | سید احمد موسوی",
  description: "راهنماهای کاربردی و قابل فهم درباره حقوق ایران؛ از آماده‌سازی مدارک و شناخت مراحل دادرسی تا پرسش‌های مهم پیش از اقدام حقوقی.",
  alternates: { canonical: "/articles" },
};

export default function ArticlesPage() {
  const featured = articles[0];
  const remaining = articles.slice(1);
  return (
    <main className="article-page editorial-page" dir="rtl">
      <header className="article-header"><div className="container article-header-inner">
        <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
        <Link href="/#contact" className="article-header-cta">درخواست بررسی اولیه ←</Link>
      </div></header>

      <section className="editorial-hero">
        <div className="editorial-hero-text">
          <div className="container">
            <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>دانشنامه حقوقی</span></div>
            <span className="section-kicker">LEGAL INSIGHTS · IRAN</span>
            <h1>دانستنِ قدم بعدی،<br/><em>از خودِ اقدام مهم‌تر است.</em></h1>
            <p>راهنماهایی روشن برای فهم بهتر مسائل حقوقی، شناخت مدارک لازم و آماده کردن پرسش‌های دقیق؛ با تمرکز بر قوانین و رویه‌های حقوقی ایران.</p>
            <div className="editorial-hero-points"><span>مطالب قابل فهم</span><span>موضوع‌محور و کاربردی</span><span>مبتنی بر حقوق ایران</span></div>
          </div>
        </div>
        <div className="editorial-hero-aside"><span className="editorial-aside-mark">§</span><span className="section-kicker">KNOW YOUR RIGHTS</span><strong>پیش از مراجعه،<br/>آماده‌تر باشید.</strong><p>از شناخت موضوع تا مرتب‌کردن مدارک و پرسیدن سؤال‌های درست.</p></div>
      </section>

      <section className="section editorial-library-section">
        <div className="container">
          <div className="editorial-section-heading"><div><span className="section-kicker">EDITOR&apos;S PICK</span><h2>از این راهنما شروع کنید</h2></div><p>یک نقطه شروع برای اینکه مسئله را دقیق‌تر بشناسید و با آمادگی بیشتری تصمیم بگیرید.</p></div>
          {featured && <article className="editorial-featured">
            <div className="editorial-featured-art"><span>§</span><small>راهنمای منتخب</small><b>LEGAL<br/>GUIDE</b></div>
            <div className="editorial-featured-copy"><div className="editorial-meta"><span>راهنمای منتخب</span><span>{featured.readTime} دقیقه مطالعه</span></div><h3><Link href={"/articles/" + featured.slug}>{featured.title}</Link></h3><p>{featured.excerpt}</p><Link className="editorial-read-link" href={"/articles/" + featured.slug}>خواندن راهنمای کامل <b>←</b></Link></div>
          </article>}

          <div className="editorial-section-heading editorial-all-heading"><div><span className="section-kicker">PRACTICAL LIBRARY</span><h2>همه راهنماها</h2></div><p>برای مطالعه، موضوع نزدیک به مسئله خود را انتخاب کنید.</p></div>
          <div className="editorial-accordion-list">
            {remaining.map((article, index) => <details className="editorial-accordion" key={article.slug}>
              <summary>
                <span className="editorial-accordion-number">{String(index + 2).padStart(2, "0")}</span>
                <span className="editorial-accordion-title"><strong>{article.title}</strong><small>{article.readTime} دقیقه مطالعه</small></span>
                <b aria-hidden="true">+</b>
              </summary>
              <div className="editorial-accordion-panel">
                <p>{article.excerpt}</p>
                <Link className="editorial-read-link" href={"/articles/" + article.slug}>مطالعه راهنمای کامل <b>←</b></Link>
              </div>
            </details>)}
          </div>
          <aside className="editorial-disclaimer"><span>نکته مهم</span><p>این مطالب برای آگاهی عمومی‌اند و جایگزین بررسی اختصاصی پرونده نیستند. قوانین و رویه‌ها ممکن است تغییر کنند؛ تصمیم درباره هر پرونده باید با توجه به اسناد، تاریخ‌ها، مرجع صالح و شرایط همان موضوع گرفته شود.</p></aside>
        </div>
      </section>

      <section className="article-contact-band"><div className="container"><div><span className="section-kicker">YOUR CASE IS UNIQUE</span><h2>پاسخ هر پرونده،<br/><em>به جزئیات خودش وابسته است.</em></h2><p>اگر موضوع شما شرایط خاصی دارد، برای بررسی اولیه آن درخواست ثبت کنید.</p></div><Link href="/#contact">ثبت درخواست بررسی اولیه <span>←</span></Link></div></section>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>دانشنامه حقوقی · بر پایه قوانین ایران</span></div></footer>
    </main>
  );
}
