import Link from "next/link";
import { articles } from "../../data/articles";

export const metadata = {
  title: "مقالات و راهنماهای حقوقی",
  description: "راهنماهای کاربردی حقوقی بر پایه قوانین ایران؛ آیین دادرسی مدنی، کیفری، قراردادها و حقوق خانواده.",
};

export default function ArticlesPage() {
  return (
    <main className="article-page" dir="rtl">
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">خدمات حقوقی <span>دفتر اهواز · خدمات سراسر ایران</span></Link>
          <Link href="/#contact" className="article-header-cta">درخواست بررسی اولیه ←</Link>
        </div>
      </header>
      <section className="article-hero">
        <div className="container">
          <span className="section-kicker">LEGAL KNOWLEDGE · IRANIAN LAW</span>
          <h1>آگاهی حقوقی،<br/><em>پیش از تصمیم مهم.</em></h1>
          <p>راهنماهایی روشن و کاربردی درباره مسائل رایج حقوقی، با تکیه بر قوانین جمهوری اسلامی ایران. هدف این مطالب، کمک به شناخت بهتر مسئله و آماده شدن برای دریافت مشاوره تخصصی است.</p>
        </div>
      </section>
      <section className="section article-list-section">
        <div className="container">
          <div className="article-list-heading"><div><span className="section-kicker">PRACTICAL GUIDES</span><h2>راهنماهای حقوقی</h2></div><p>هر پرونده جزئیات خودش را دارد؛ این مطالب نقطه شروع‌اند، نه نسخه یکسان برای همه.</p></div>
          <div className="article-card-grid">
            {articles.map((article, index) => (
              <article className="article-card" key={article.slug}>
                <div className="article-card-art"><span>{["§","⚖","▤","⌂"][index]}</span><small>{article.category}</small></div>
                <div className="article-card-body">
                  <div className="article-meta"><span>{article.category}</span><span>{article.readTime} مطالعه</span></div>
                  <h2><Link href={"/articles/" + article.slug}>{article.title}</Link></h2>
                  <p>{article.excerpt}</p>
                  <Link className="article-read-link" href={"/articles/" + article.slug}>مطالعه راهنما <b>←</b></Link>
                </div>
              </article>
            ))}
          </div>
          <div className="article-disclaimer">مطالب این بخش برای اطلاع‌رسانی عمومی تهیه شده‌اند. قوانین ممکن است اصلاح شوند و انطباق آن‌ها با هر پرونده نیازمند بررسی شرایط و اسناد همان پرونده است.</div>
        </div>
      </section>
      <section className="article-contact-band"><div className="container"><div><span className="section-kicker">NEED A CASE REVIEW?</span><h2>اگر موضوع شما شرایط خاصی دارد،<br/><em>آن را جداگانه بررسی کنید.</em></h2></div><Link href="/#contact">ثبت درخواست بررسی اولیه <span>←</span></Link></div></section>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>اطلاع‌رسانی حقوقی بر پایه قوانین ایران</span></div></footer>
    </main>
  );
}
