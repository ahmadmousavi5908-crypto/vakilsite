import Link from "next/link";
import JsonLd from "../../components/JsonLd";
import { practiceAreas } from "../../data/practice-areas";
import { getSiteUrl } from "../../lib/site-url.mjs";
import { buildBreadcrumbSchema } from "../../lib/seo/breadcrumb-schema.mjs";

export const metadata = {
  title: "وکیل حقوقی در اهواز و خوزستان | حوزه‌های خدمات سید احمد موسوی",
  description: "معرفی حوزه‌های بررسی دعاوی حقوقی و مدنی، کیفری، ملکی، خانواده، قراردادها و مطالبات نزد سید احمد موسوی؛ دفتر اهواز و امکان ثبت درخواست اولیه از سراسر ایران.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const siteUrl = getSiteUrl();
  const structuredBreadcrumb = siteUrl
    ? buildBreadcrumbSchema(siteUrl, [
        { name: "صفحه اصلی", path: "/" },
        { name: "حوزه‌های خدمات حقوقی" },
      ])
    : null;

  return (
    <main className="practice-page" dir="rtl">
      {structuredBreadcrumb && <JsonLd data={structuredBreadcrumb} />}
      <header className="article-header"><div className="container article-header-inner">
        <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
        <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
      </div></header>
      <section className="practice-hero"><div className="container">
        <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>حوزه‌های خدمات حقوقی</span></div>
        <span className="section-kicker">LEGAL PRACTICE AREAS · IRAN</span>
        <h1>خدمات وکیل حقوقی<br/><em>در اهواز و خوزستان</em></h1>
        <p>اگر با عبارت‌هایی مانند «وکیل حقوقی اهواز»، «وکیل مدنی» یا «وکیل دعاوی حقوقی» جست‌وجو کرده‌اید، حوزه نزدیک به مسئله خود را از فهرست زیر انتخاب کنید. دعاوی مدنی، کیفری، ملکی، خانواده و قراردادها مسیر و مدارک متفاوتی دارند. دفتر سید احمد موسوی در اهواز است و درخواست اولیه از خوزستان و سراسر ایران قابل ثبت است.</p>
      </div></section>
      <section className="container practice-list-section">
        <div className="practice-card-grid">
          {practiceAreas.map((area, index) => <article className="practice-card" key={area.slug}>
            <span className="practice-card-number">{String(index + 1).padStart(2, "0")}</span>
            <h2><Link href={"/services/" + area.slug}>{area.title}</Link></h2>
            <p>{area.description}</p>
            <Link className="practice-card-link" href={"/services/" + area.slug}>مشاهده توضیحات و مدارک لازم ←</Link>
          </article>)}
        </div>
      </section>
      <section className="article-contact-band"><div className="container">
        <div><span className="section-kicker">INITIAL CASE REVIEW</span><h2>عنوان دقیق مسئله را نمی‌دانید؟<br/><em>شرح کوتاهی ثبت کنید.</em></h2></div>
        <Link href="/#contact">ثبت درخواست بررسی اولیه ←</Link>
      </div></section>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>خدمات حقوقی بر پایه قوانین ایران</span></div></footer>
    </main>
  );
}
