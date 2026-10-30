import Link from "next/link";
import LegalGlossarySearch from "../../components/LegalGlossarySearch";
import { legalGlossary } from "../../data/legal-glossary";

export const metadata = {
  title: "فرهنگ اصطلاحات حقوقی و قضایی ایران | واژه‌نامه حقوقی",
  description: "جست‌وجوی اصطلاحات حقوقی ایران؛ دادگاه، دادسرا، قوه قضاییه، دفاتر خدمات الکترونیک قضایی، ثنا، دادخواست، شکواییه، مهریه و دعاوی حقوقی و کیفری.",
  keywords: ["واژه نامه حقوقی", "فرهنگ اصطلاحات حقوقی", "اصطلاحات قضایی ایران", "قوه قضاییه", "دادگستری", "دادگاه", "دادسرا", "دفتر خدمات قضایی", "دفاتر خدمات الکترونیک قضایی", "سامانه ثنا", "عدل ایران", "دادخواست", "شکواییه"],
  alternates: { canonical: "/legal-glossary" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: "فرهنگ اصطلاحات حقوقی و قضایی ایران",
    description: "واژه‌نامه قابل جست‌وجوی اصطلاحات حقوقی و قضایی ایران با تعریف ساده و دسته‌بندی موضوعی."
  }
};

export default function LegalGlossaryPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "فرهنگ اصطلاحات حقوقی و قضایی ایران",
    description: "واژه‌نامه آموزشی اصطلاحات حقوقی و قضایی مورد استفاده در نظام حقوقی ایران.",
    inLanguage: "fa-IR",
    hasDefinedTerm: legalGlossary.slice(0, 20).map((item) => ({
      "@type": "DefinedTerm",
      name: item.term,
      description: item.definition
    }))
  };

  return (
    <main className="glossary-page" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">خدمات حقوقی <span>دفتر اهواز · خدمات سراسر ایران</span></Link>
          <Link href="/#contact" className="article-header-cta">درخواست بررسی اولیه ←</Link>
        </div>
      </header>
      <section className="glossary-hero">
        <div className="container">
          <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>فرهنگ اصطلاحات حقوقی</span></div>
          <span className="section-kicker">IRANIAN LAW · LEGAL DICTIONARY</span>
          <h1>فرهنگ اصطلاحات<br /><em>حقوقی و قضایی ایران</em></h1>
          <p>معنی ساده و کاربردی واژه‌هایی که در دادگاه، دادسرا، دادگستری، دفاتر خدمات الکترونیک قضایی و فرایندهای حقوقی ایران با آن‌ها روبه‌رو می‌شویم.</p>
          <div className="glossary-hero-count"><strong>{legalGlossary.length.toLocaleString("fa-IR")}</strong><span>اصطلاح و عبارت مرتبط، در دسته‌بندی‌های موضوعی</span></div>
        </div>
      </section>
      <section className="container glossary-main">
        <LegalGlossarySearch />
      </section>
      <section className="container glossary-reference">
        <h2>این واژه‌نامه درباره چه موضوعاتی است؟</h2>
        <p>مراجع قضایی ایران، قوه قضاییه و دادگستری، دفاتر خدمات الکترونیک قضایی، سامانه‌های قضایی، اوراق دادرسی، اشخاص پرونده، آرای دادگاه، اجرای احکام، حقوق خانواده، دعاوی ملکی، مطالبات و جرایم.</p>
      </section>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>آموزش حقوقی بر پایه اصطلاحات نظام حقوقی ایران</span></div></footer>
    </main>
  );
}
