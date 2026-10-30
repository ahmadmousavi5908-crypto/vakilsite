import Link from "next/link";
import { notFound } from "next/navigation";
import { practiceAreas } from "../../../data/practice-areas";

export function generateStaticParams() {
  return practiceAreas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const area = practiceAreas.find((item) => item.slug === slug);
  if (!area) return { title: "حوزه خدمات پیدا نشد" };
  return {
    title: area.title + " | خدمات حقوقی سید احمد موسوی",
    description: area.description,
    alternates: { canonical: "/services/" + area.slug },
    openGraph: { type: "website", locale: "fa_IR", title: area.title, description: area.description },
  };
}

export default async function PracticeAreaPage({ params }) {
  const { slug } = await params;
  const area = practiceAreas.find((item) => item.slug === slug);
  if (!area) notFound();

  return (
    <main className="practice-page" dir="rtl">
      <header className="article-header"><div className="container article-header-inner">
        <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
        <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
      </div></header>
      <section className="practice-hero"><div className="container">
        <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><Link href="/services">حوزه‌های خدمات</Link><span>←</span><span>{area.title}</span></div>
        <span className="section-kicker">LEGAL SERVICES · IRANIAN LAW</span>
        <h1>{area.title}<br/><em>بررسی موردی و مستند</em></h1>
        <p>{area.description}</p>
      </div></section>
      <section className="container practice-detail-layout">
        <article className="practice-detail-main">
          <h2>درباره این حوزه</h2><p>{area.intro}</p>
          <h2>موضوعات قابل بررسی</h2>
          <ul className="practice-topic-list">{area.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
          <h2>برای بررسی اولیه چه مدارکی آماده کنید؟</h2>
          <ul className="practice-check-list">{area.checks.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="article-legal-note"><b>توضیح مهم</b><p>{area.note}</p></div>
        </article>
        <aside className="practice-detail-aside">
          <span className="section-kicker">CASE REVIEW</span>
          <h2>پرونده شما<br/><em>شرایط خاص خودش را دارد.</em></h2>
          <p>شرح اولیه موضوع، شهر محل رسیدگی و مرحله فعلی را ثبت کنید. اطلاعات محرمانه و مدارک هویتی را در فرم عمومی ننویسید.</p>
          <Link href="/#contact">ثبت درخواست بررسی اولیه ←</Link>
          <Link href="/services">مشاهده همه حوزه‌ها</Link>
        </aside>
      </section>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>اطلاع‌رسانی حقوقی بر پایه قوانین ایران</span></div></footer>
    </main>
  );
}
