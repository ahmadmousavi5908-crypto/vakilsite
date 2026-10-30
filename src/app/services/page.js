import Link from "next/link";
import { practiceAreas } from "../../data/practice-areas";

export const metadata = {
  title: "حوزه‌های خدمات حقوقی و وکالت",
  description: "معرفی حوزه‌های بررسی و خدمات حقوقی سید احمد موسوی؛ دعاوی خانواده، کیفری، ملکی، قراردادها، مطالبات و مشاوره اولیه در اهواز و سراسر ایران.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main className="practice-page" dir="rtl">
      <header className="article-header"><div className="container article-header-inner">
        <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
        <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
      </div></header>
      <section className="practice-hero"><div className="container">
        <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>حوزه‌های خدمات حقوقی</span></div>
        <span className="section-kicker">LEGAL PRACTICE AREAS · IRAN</span>
        <h1>حوزه‌های فعالیت و<br/><em>بررسی مسائل حقوقی</em></h1>
        <p>موضوعات زیر برای آشنایی اولیه دسته‌بندی شده‌اند. انتخاب مسیر حقوقی و امکان ارائه خدمت به جزئیات پرونده، اسناد، مرحله رسیدگی و مقررات جاری بستگی دارد.</p>
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
