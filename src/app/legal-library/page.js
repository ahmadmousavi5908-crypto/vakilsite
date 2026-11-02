import Link from "next/link";
import LegalLibraryExplorer from "../../components/LegalLibraryExplorer";
import { getLegalRecords } from "../../lib/legal-library";

const termCount = getLegalRecords("terms").length;
const lawCount = getLegalRecords("laws").length;
const articleCount = getLegalRecords("articles").length;

export const metadata = {
  title: "کتابخانه پژوهشی حقوق ایران | قوانین و اصطلاحات حقوقی",
  description: "جست‌وجوی اصطلاحات حقوقی، قوانین و خلاصه مواد قانونی ایران همراه با وضعیت بررسی منابع و پیوند به مراجع رسمی.",
  keywords: ["کتابخانه حقوقی", "قوانین ایران", "اصطلاحات حقوقی", "خلاصه مواد قانونی", "حقوق ثبت", "چک صیادی", "سفته"],
  alternates: { canonical: "/legal-library" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    title: "کتابخانه پژوهشی حقوق ایران",
    description: "مجموعه‌ای ساختاریافته برای جست‌وجوی اصطلاحات، قوانین و خلاصه مواد حقوقی ایران."
  }
};

const officialResources = [
  ["درگاه ملی قوه قضاییه", "معرفی سامانه‌ها، ساختار قوه قضاییه و واحدهای تابعه", "https://www.eadil.com/"],
  ["درگاه خدمات الکترونیک قضایی", "ورود به خدمات الکترونیک قضایی و پیوندهای مرتبط", "https://my.adliran.ir/"],
  ["سامانه ثنا", "درگاه احراز هویت برخط ثنا", "https://sana.adliran.ir/"],
  ["روزنامه رسمی", "دسترسی به آگهی‌ها و انتشارات روزنامه رسمی", "https://www.rrk.ir/"],
  ["قوانین و مقررات", "پایگاه قوانین و مقررات معرفی‌شده در درگاه قوه قضاییه", "https://www.dastour.ir/"],
  ["سامانه ملی آرای قضایی", "دسترسی به آرای منتشرشده قضایی", "https://ara.jri.ac.ir/"],
  ["دیوان عدالت اداری", "درگاه دیوان عدالت اداری", "https://divan-edalat.ir/"],
  ["مرکز وکلا و کارشناسان رسمی", "وب‌سایت مرکز وکلا، کارشناسان رسمی و مشاوران خانواده", "https://judiciarybar.ir/"],
  ["دادگستری کل استان خوزستان", "پایگاه دادگستری استان خوزستان", "https://dadgostari-khz.eadl.ir/"],
];

export default function LegalLibraryPage() {
  return (
    <main className="practice-page" dir="rtl">
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">
            خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span>
          </Link>
          <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
        </div>
      </header>

      <section className="practice-hero">
        <div className="container">
          <div className="article-breadcrumb">
            <Link href="/">صفحه اصلی</Link><span>←</span><span>کتابخانه حقوقی</span>
          </div>
          <span className="section-kicker">IRANIAN LEGAL RESEARCH · VERSION 1.3.1</span>
          <h1>کتابخانه پژوهشی حقوق ایران<br /><em>اصطلاحات، قوانین و خلاصه مواد</em></h1>
          <p>
            جست‌وجوی موضوعی در {termCount.toLocaleString("fa-IR")} اصطلاح حقوقی، {lawCount.toLocaleString("fa-IR")} رکورد قانون و {articleCount.toLocaleString("fa-IR")} خلاصه ماده قانونی.
            وضعیت بررسی هر مدخل مشخص شده است تا محتوای پژوهشی با متن رسمی قانون اشتباه گرفته نشود.
          </p>
          <div className="legal-library-hero-links">
            <Link href="/legal-glossary">فرهنگ عمومی اصطلاحات حقوقی ←</Link>
            <Link href="/articles">راهنماها و مقالات حقوقی ←</Link>
            <Link href="/legal-library/catalog">فهرست مستقل همه مدخل‌های کتابخانه ←</Link>
          </div>
        </div>
      </section>

      <section className="container practice-list-section legal-library-main">
        <LegalLibraryExplorer />
      </section>

      <section className="container practice-list-section legal-official-resources">
        <div className="legal-library-section-heading">
          <span className="section-kicker">PRIMARY REFERENCE PORTALS</span>
          <h2>درگاه‌ها و مراجع رسمی</h2>
          <p>برای بررسی متن معتبر، آخرین اصلاحات و وضعیت جاری مقررات، به مرجع رسمی مربوط مراجعه کنید.</p>
        </div>
        <div className="practice-card-grid">
          {officialResources.map(([title, description, url], index) => (
            <article className="practice-card" key={url}>
              <span className="practice-card-number">مرجع {String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <a className="practice-card-link" href={url} target="_blank" rel="noopener noreferrer">ورود به درگاه ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="container practice-library-note">
        <h2>حدود اعتبار محتوای این کتابخانه</h2>
        <p>
          این مجموعه ابزار پژوهش و آموزش عمومی است، نه پایگاه رسمی قوانین. همه اصطلاحات و خلاصه‌ها
          پیش از استفاده در مشاوره، تنظیم دادخواست یا محاسبه مهلت باید با متن جاری قانون، اصلاحات،
          مقررات اجرایی و شرایط پرونده تطبیق داده شوند. این وب‌سایت وابسته به قوه قضاییه یا مراجع
          معرفی‌شده نیست.
        </p>
      </section>

      <footer className="article-footer">
        <div className="container">
          <Link href="/">بازگشت به صفحه اصلی</Link>
          <span>کتابخانه پژوهشی حقوق ایران · نسخه داده ۱.۳.۱</span>
        </div>
      </footer>
    </main>
  );
}
