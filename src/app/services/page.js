import Link from "next/link";
import JsonLd from "../../components/JsonLd";
import { practiceAreas } from "../../data/practice-areas";
import { getSiteUrl } from "../../lib/site-url.mjs";
import { buildBreadcrumbSchema } from "../../lib/seo/breadcrumb-schema.mjs";
import { SERVICES_HUB_DESCRIPTION, SERVICES_HUB_TITLE } from "../../lib/seo/services-hub-title.mjs";

export const metadata = {
  title: SERVICES_HUB_TITLE,
  description: SERVICES_HUB_DESCRIPTION,
  keywords: [
    "بهترین وکیل حقوقی اهواز", "بهترین وکیل مدنی اهواز", "بهترین وکیل در اهواز",
    "وکیل حقوقی در اهواز", "وکیل مدنی اهواز", "وکیل حرفه‌ای حقوقی اهواز",
    "وکیل باتجربه در اهواز", "وکیل متخصص اهواز", "وکیل دعاوی حقوقی اهواز"
  ],
  alternates: { canonical: "/services" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "/services",
    title: SERVICES_HUB_TITLE + " | موسوی",
    description: SERVICES_HUB_DESCRIPTION,
    siteName: "وکیل سید احمد موسوی",
    images: [{ url: "/images/lawyer.jpg", alt: "تصویر سید احمد موسوی، وکیل پایه یک دادگستری در اهواز" }],
  },
  twitter: {
    card: "summary",
    title: SERVICES_HUB_TITLE + " | موسوی",
    description: SERVICES_HUB_DESCRIPTION,
    images: [{ url: "/images/lawyer.jpg", alt: "تصویر سید احمد موسوی، وکیل پایه یک دادگستری در اهواز" }],
  },
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
        <p>در جست‌وجوهای محلی، عبارت‌هایی مانند «وکیل حرفه‌ای اهواز»، «وکیل متخصص اهواز»، «وکیل باتجربه اهواز»، «وکیل برتر اهواز» و «بهترین وکیل اهواز» به کار می‌روند. صورت‌هایی مانند «حرفه‌ای‌ترین وکیل اهواز» و «متخصص‌ترین وکیل اهواز» نیز قصد جست‌وجو را نشان می‌دهند؛ برای انتخاب، اعتبار پروانه، تجربه مستند در موضوع پرونده، شفافیت هزینه و حدود خدمات را بررسی کنید.</p>
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
        <section className="practice-library-note" aria-labelledby="civil-law-services-title">
          <h2 id="civil-law-services-title">وکیل حقوقی و دعاوی مدنی در اهواز</h2>
          <p>
            اگر برای انتخاب وکیل حقوقی در اهواز یا بررسی یک دعوای مدنی جست‌وجو می‌کنید، ابتدا باید نوع اختلاف و خواسته روشن شود. موضوعاتی مانند مالکیت و اسناد ملک، اجاره و سرقفلی، قرارداد و تعهدات، مطالبه وجه، چک و سفته و اجرای احکام مدنی هرکدام مدارک و مسیر متفاوتی دارند. عنوان «وکیل مدنی» به‌تنهایی نوع دعوا یا اقدام مناسب را مشخص نمی‌کند.
          </p>
          <p>
            برای بررسی موضوعات ملکی و ثبتی، <Link href="/services/property-law">صفحه دعاوی ملکی و ثبتی</Link>؛ برای قرارداد و تعهد، <Link href="/services/contracts-and-obligations">صفحه قراردادها و تعهدات</Link>؛ و برای طلب و اسناد تجاری، <Link href="/services/claims-and-enforcement">صفحه مطالبات و اجرای احکام</Link> را ببینید. برای موضوع کیفری نیز مسیر جداگانه‌ای در <Link href="/services/criminal-law">صفحه دعاوی کیفری</Link> معرفی شده است.
          </p>
          <p>
            محل فعالیت دفتر در اهواز است. ثبت درخواست اولیه از دیگر شهرهای خوزستان یا سراسر ایران به معنی وجود دفتر فیزیکی در آن شهرها یا پذیرش قطعی پرونده نیست؛ امکان ارائه خدمت پس از بررسی مرجع رسیدگی، مدارک و شرایط موضوع مشخص می‌شود.
          </p>
        </section>
        <section className="practice-faq" aria-labelledby="services-faq-title">
          <h2 id="services-faq-title">پرسش‌های رایج درباره انتخاب وکیل و خدمات حقوقی</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>وکیل حقوقی در اهواز چه پرونده‌هایی را بررسی می‌کند؟</summary>
              <p>موضوع می‌تواند اختلاف ملکی و ثبتی، قرارداد و تعهد، مطالبه طلب، چک و سفته، اجرای احکام یا مسائل دیگر حقوق مدنی باشد. نوع خواسته، مدارک، طرف‌های دعوا و مرحله رسیدگی باید بررسی شوند تا مسیر درست مشخص شود.</p>
            </details>
            <details className="faq-item">
              <summary>وکیل مدنی چه تفاوتی با وکیل کیفری دارد؟</summary>
              <p>دعوای حقوقی یا مدنی معمولاً برای مطالبه حق، اجرای تعهد یا جبران خسارت مطرح می‌شود؛ پرونده کیفری به بررسی رفتار مجرمانه و مسئولیت کیفری مربوط است. بعضی وقایع ممکن است جنبه حقوقی و کیفری جداگانه داشته باشند و تشخیص آن به عناصر قانونی و مدارک بستگی دارد.</p>
            </details>
            <details className="faq-item">
              <summary>بهترین وکیل حقوقی و مدنی در اهواز را چگونه انتخاب کنم؟</summary>
              <p>پروانه وکالت و هویت حرفه‌ای را از مرجع رسمی بررسی کنید، تجربه مرتبط با موضوع را با شواهد قابل ارزیابی بسنجید، درباره حدود خدمت و هزینه شفاف سؤال کنید و از وعده تضمین نتیجه پرهیز کنید. عبارت «بهترین وکیل حقوقی اهواز» یا «بهترین وکیل مدنی اهواز» یک عبارت جست‌وجو است؛ انتخاب واقعی باید بر تناسب پرونده، مدارک و صلاحیت قابل احراز استوار باشد.</p>
            </details>
            <details className="faq-item">
              <summary>برای مراجعه به وکیل پایه یک چه اطلاعاتی آماده کنم؟</summary>
              <p>شرح کوتاه و زمان‌بندی‌شده موضوع، آخرین ابلاغیه یا رأی، قراردادها و اسناد مرتبط، تاریخ جلسه یا مهلت نزدیک و فهرست اقدامات قبلی را آماده کنید. اطلاعات هویتی حساس، رمزها یا اسناد محرمانه را در فرم عمومی سایت وارد نکنید.</p>
            </details>
          </div>
        </section>
      </section>
      <section className="article-contact-band"><div className="container">
        <div><span className="section-kicker">INITIAL CASE REVIEW</span><h2>عنوان دقیق مسئله را نمی‌دانید؟<br/><em>شرح کوتاهی ثبت کنید.</em></h2></div>
        <Link href="/#contact">ثبت درخواست بررسی اولیه ←</Link>
      </div></section>
      <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>خدمات حقوقی بر پایه قوانین ایران</span></div></footer>
    </main>
  );
}
