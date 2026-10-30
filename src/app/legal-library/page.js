import Link from "next/link";

export const metadata = {
  title: "کتابخانه حقوقی و منابع قضایی ایران",
  description: "دسترسی به منابع و درگاه‌های رسمی حقوقی و قضایی ایران، سامانه عدل ایران، قوه قضاییه، قوانین و آرای قضایی.",
  alternates: { canonical: "/legal-library" },
};

const links = [
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
  return <main className="practice-page" dir="rtl">
    <header className="article-header"><div className="container article-header-inner">
      <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
      <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
    </div></header>
    <section className="practice-hero"><div className="container">
      <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>کتابخانه حقوقی</span></div>
      <span className="section-kicker">LEGAL RESEARCH LIBRARY · IRAN</span>
      <h1>کتابخانه حقوقی<br/><em>قوانین، مراجع و سامانه‌ها</em></h1>
      <p>پیوندهای زیر برای دسترسی مستقیم به مراجع و سامانه‌های عمومی گردآوری شده‌اند. این وب‌سایت وابسته به قوه قضاییه یا هیچ‌یک از سامانه‌های معرفی‌شده نیست. برای مشاهده پرونده، پرداخت یا ثبت درخواست قضایی، فقط از درگاه رسمی مربوط استفاده کنید.</p>
    </div></section>
    <section className="container practice-list-section"><div className="practice-card-grid">
      {links.map(([title, description, url], index) => <article className="practice-card" key={url}>
        <span className="practice-card-number">منبع رسمی {index + 1}</span>
        <h2>{title}</h2><p>{description}</p>
        <a className="practice-card-link" href={url} target="_blank" rel="noopener noreferrer">ورود به منبع ↗</a>
      </article>)}
    </div></section>
    <section className="container practice-library-note">
      <h2>یادآوری درباره اعتبار قوانین</h2>
      <p>قوانین و مقررات ممکن است اصلاح یا نسخ شوند. پیش از استناد، متن معتبر و آخرین اصلاحات را در منابع رسمی بررسی کنید. این کتابخانه مسیر دسترسی به منابع است و جایگزین بررسی حقوقی پرونده نیست.</p>
      <div><Link href="/legal-glossary">واژه‌نامه حقوقی ←</Link><Link href="/articles">مقالات حقوقی ←</Link></div>
    </section>
    <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>منابع حقوقی و قضایی ایران</span></div></footer>
  </main>;
}
