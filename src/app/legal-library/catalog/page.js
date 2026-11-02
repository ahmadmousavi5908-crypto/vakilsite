import Link from "next/link";
import { getLegalRecords, legalLibraryCategories, legalReviewLabels } from "../../../lib/legal-library";

export const metadata = {
  title: "فهرست مدخل‌های دانشنامه حقوقی ایران",
  description: "فهرست ساختاریافته اصطلاحات، قوانین و خلاصه مواد قانونی در کتابخانه پژوهشی حقوق ایران؛ همراه با پیوند مستقل و وضعیت بازبینی هر مدخل.",
  alternates: { canonical: "/legal-library/catalog" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: "فهرست کتابخانه پژوهشی حقوق ایران",
    description: "دسترسی به مدخل‌های مستقل اصطلاحات، قوانین و مواد قانونی ایران.",
  },
};

function RecordGrid({ title, records, getLabel }) {
  return (
    <section className="container practice-list-section">
      <div className="legal-library-section-heading">
        <span className="section-kicker">LEGAL KNOWLEDGE INDEX</span>
        <h2>{title}</h2>
        <p>{records.length.toLocaleString("fa-IR")} مدخل در این بخش</p>
      </div>
      <div className="practice-card-grid">
        {records.map((record) => (
          <article className="practice-card" key={record.id}>
            <span className="practice-card-number">{legalReviewLabels[record.review_status] || "وضعیت بررسی نامشخص"}</span>
            <h3><Link href={record.path}>{getLabel(record)}</Link></h3>
            <p>{record.definition || record.summary || record.notes || "مدخل پژوهشی کتابخانه حقوقی ایران."}</p>
            <Link className="practice-card-link" href={record.path}>مشاهده مدخل مستقل ←</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const terms = getLegalRecords("terms");
const laws = getLegalRecords("laws");
const articles = getLegalRecords("articles");

export default function LegalLibraryCatalogPage() {
  const groupedTerms = legalLibraryCategories
    .map((category) => ({
      ...category,
      records: terms.filter((term) => term.category === category.code),
    }))
    .filter((category) => category.records.length > 0);

  return (
    <main className="practice-page" dir="rtl">
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
          <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
        </div>
      </header>
      <section className="practice-hero">
        <div className="container">
          <div className="article-breadcrumb">
            <Link href="/">صفحه اصلی</Link><span>←</span><Link href="/legal-library">کتابخانه حقوقی</Link><span>←</span><span>فهرست مدخل‌ها</span>
          </div>
          <span className="section-kicker">IRANIAN LEGAL KNOWLEDGE BASE</span>
          <h1>فهرست دانشنامه حقوقی ایران</h1>
          <p>هر مدخل مسیر مستقل دارد و به قوانین و موضوعات مرتبط پیوند می‌خورد. وضعیت بازبینی کنار هر عنوان نمایش داده شده است تا محتوای پژوهشی با متن رسمی قانون اشتباه نشود.</p>
          <div className="legal-library-hero-links">
            <Link href="/legal-library">بازگشت به جست‌وجوی کتابخانه ←</Link>
            <Link href="/legal-glossary">فرهنگ عمومی اصطلاحات حقوقی ←</Link>
          </div>
        </div>
      </section>

      {groupedTerms.map((category) => (
        <RecordGrid key={category.code} title={category.name} records={category.records} getLabel={(record) => record.canonical} />
      ))}
      <RecordGrid title="قوانین و مقررات" records={laws} getLabel={(record) => record.title} />
      <RecordGrid title="خلاصه مواد قانونی" records={articles} getLabel={(record) => `ماده ${record.article_number} · ${record.title}`} />

      <section className="container practice-library-note">
        <h2>درباره وضعیت بازبینی</h2>
        <p>مدخل‌هایی که وضعیت «تطبیق‌شده با منبع اولیه» ندارند، برای استناد حقوقی تأیید نهایی نشده‌اند. این صفحات تا زمان تکمیل بازبینی از فهرست ایندکس عمومی موتورهای جست‌وجو کنار گذاشته می‌شوند.</p>
        <p>{legalLibraryCategories.length.toLocaleString("fa-IR")} حوزه موضوعی در ساختار داده تعریف شده است؛ نمایش هر مدخل به معنی تأیید قضایی یا وابستگی به نهاد رسمی نیست.</p>
      </section>
      <footer className="article-footer">
        <div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>کتابخانه پژوهشی حقوق ایران · فهرست نسخه داده جاری</span></div>
      </footer>
    </main>
  );
}
