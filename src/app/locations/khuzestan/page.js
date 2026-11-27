import Link from "next/link";
import JsonLd from "../../../components/JsonLd";
import { getSiteUrl } from "../../../lib/site-url.mjs";
import { buildBreadcrumbSchema } from "../../../lib/seo/breadcrumb-schema.mjs";

export const metadata = {
  title: { absolute: "وکیل در اهواز و خوزستان | سید احمد موسوی" },
  description: "سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه با شماره پروانه ۷۴۵۱۶؛ دفتر در اهواز و بررسی اولیه دعاوی کیفری، ملکی، خانواده و حقوقی.",
  alternates: { canonical: "/locations/khuzestan" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "/locations/khuzestan",
    title: "وکیل در اهواز و خوزستان | سید احمد موسوی، وکیل پایه یک",
    description: "سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه با شماره پروانه ۷۴۵۱۶؛ دفتر در اهواز و بررسی اولیه دعاوی کیفری، ملکی، خانواده و حقوقی.",
    siteName: "وکیل سید احمد موسوی",
    images: [{ url: "/images/lawyer.jpg", alt: "تصویر سید احمد موسوی، وکیل پایه یک دادگستری در اهواز" }],
  },
  twitter: {
    card: "summary",
    title: "وکیل در اهواز و خوزستان | سید احمد موسوی، وکیل پایه یک",
    description: "سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه با شماره پروانه ۷۴۵۱۶؛ دفتر در اهواز و بررسی اولیه دعاوی کیفری، ملکی، خانواده و حقوقی.",
    images: [{ url: "/images/lawyer.jpg", alt: "تصویر سید احمد موسوی، وکیل پایه یک دادگستری در اهواز" }],
  },
};

const cities = [
  "اهواز","آبادان","خرمشهر","دزفول","شوشتر","اندیمشک","ماهشهر","بندر امام خمینی",
  "بهبهان","رامهرمز","ایذه","مسجدسلیمان","شوش","هویزه","سوسنگرد","باغ‌ملک",
  "شادگان","حمیدیه","کارون","باوی","لالی","هفتکل","آغاجاری","امیدیه","رامشیر",
  "گتوند","هندیجان","دشت آزادگان","اندیکا","صیدون"
];

const neighborhoods = [
  "کیانپارس", "کیان پارس", "امانیه", "زیتون", "زیتون کارمندی", "گلستان"
];

export default function KhuzestanLocationPage() {
  const siteUrl = getSiteUrl();
  const structuredBreadcrumb = siteUrl
    ? buildBreadcrumbSchema(siteUrl, [
        { name: "صفحه اصلی", path: "/" },
        { name: "مناطق تحت پوشش" },
      ])
    : null;

  return <main className="practice-page" dir="rtl">
    {structuredBreadcrumb && <JsonLd data={structuredBreadcrumb} />}
    <header className="article-header"><div className="container article-header-inner">
      <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · دفتر اهواز</span></Link>
      <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
    </div></header>
    <section className="practice-hero"><div className="container">
      <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>مناطق تحت پوشش</span></div>
      <span className="section-kicker">LEGAL SERVICES · KHUZESTAN</span>
      <h1>وکیل در اهواز و خوزستان<br/><em>سید احمد موسوی، وکیل پایه یک دادگستری</em></h1>
      <p>سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه، دارای کارشناسی ارشد حقوق جزا و شماره پروانه وکالت ۷۴۵۱۶ است. دفتر فعالیت در اهواز، استان خوزستان قرار دارد. برای بررسی اولیه دعاوی کیفری، حقوقی، خانواده و ملکی، شهر محل پرونده و موضوع درخواست را مشخص کنید. امکان پذیرش و شیوه ارائه خدمت پس از بررسی جداگانه مدارک و شرایط پرونده تعیین می‌شود. <Link href="/about">مشاهده مشخصات حرفه‌ای و سوابق علمی</Link> · <a href="https://hub.23055.ir/search-lawyer" target="_blank" rel="noopener noreferrer">استعلام پروانه در سامانه رسمی مرکز وکلا</a>.</p>
    </div></section>
    <section className="container practice-list-section">
      <div className="practice-library-note"><h2>شهرها و مناطق قابل انتخاب در فرم درخواست</h2><p>برای موضوعاتی مانند دعاوی خانواده، کیفری، ملکی، قراردادها و مطالبات، شهر محل پرونده را دقیق انتخاب کنید تا امکان بررسی اولیه و هماهنگی متناسب با شرایط پرونده مشخص شود.</p></div>
      <div className="practice-city-list">{cities.map((city) => <span key={city}>{city}</span>)}</div>
      <div className="practice-library-note">
        <h2>وکیل در محله‌های اهواز</h2>
        <p>اگر برای جست‌وجوی «وکیل کیانپارس اهواز»، «وکیل کیان پارس اهواز»، «وکیل امانیه اهواز»، «وکیل زیتون اهواز»، «وکیل زیتون کارمندی اهواز» یا «وکیل گلستان اهواز» به دنبال اطلاعات هستید، دفتر سید احمد موسوی در اهواز فعالیت می‌کند و امکان ثبت درخواست اولیه برای ساکنان این محله‌ها وجود دارد. این نام‌ها محدوده‌های شهری هستند و به معنی وجود شعبه یا دفتر مستقل در هر محله نیستند.</p>
        <div className="practice-city-list">{neighborhoods.map((neighborhood) => <span key={neighborhood}>{neighborhood}</span>)}</div>
        <p>در جست‌وجوهای محلی، عبارت‌هایی مانند «وکیل حرفه‌ای اهواز»، «وکیل متخصص اهواز»، «وکیل باتجربه اهواز»، «وکیل برتر اهواز»، «وکیل برجسته اهواز»، «وکیل سرشناس اهواز»، «وکیل معروف اهواز»، «وکیل معتبر اهواز»، «وکیل مجرب اهواز»، «وکیل کاربلد اهواز» و «وکیل خبره اهواز» به کار می‌روند. عبارت‌های «بهترین وکیل اهواز»، «بهترین وکیل در اهواز»، «حرفه‌ای‌ترین وکیل اهواز» و «متخصص‌ترین وکیل اهواز» نیز صورت‌های جست‌وجوی کاربران‌اند. این توصیف‌ها به‌تنهایی معیار انتخاب نیستند؛ اعتبار پروانه، مرجع صادرکننده، تجربه مستند در موضوع پرونده، بررسی مدارک و شفافیت هزینه و حدود خدمات را بررسی کنید.</p>
      </div>
      <div className="practice-library-note">
        <h2>انتخاب وکیل برای پرونده‌های آبادان و خرمشهر</h2>
        <p>اگر عبارت‌هایی مانند «بهترین وکیل خرمشهر» یا «بهترین وکیل آبادان» را جست‌وجو می‌کنید، محل رسیدگی، نوع دعوا و امکان همکاری را پیش از تصمیم بررسی کنید. دفتر در اهواز مستقر است؛ ثبت درخواست اولیه از شهرهای استان به معنی وجود دفتر فیزیکی در آن شهر یا پذیرش قطعی پرونده نیست.</p>
      </div>
      <div className="practice-library-note">
        <h2>موضوعات حقوقی قابل بررسی</h2>
        <p>درخواست‌های اولیه می‌توانند درباره اختلافات خانواده مانند مهریه، نفقه، طلاق و حضانت؛ موضوعات کیفری مانند شکایت، اتهام و دفاع؛ اختلافات ملکی و ثبتی؛ قراردادها و تعهدات؛ یا مطالبه وجه، چک و اجرای احکام باشند. عنوان دقیق موضوع و امکان ارائه خدمت پس از بررسی مدارک و شرایط پرونده مشخص می‌شود.</p>
        <p>برای آشنایی با مسیر هر موضوع، صفحه‌های <Link href="/services/family-law">حقوق خانواده</Link>، <Link href="/services/criminal-law">دعاوی کیفری</Link>، <Link href="/services/property-law">دعاوی ملکی و ثبتی</Link>، <Link href="/services/contracts-and-obligations">قراردادها و تعهدات</Link> و <Link href="/services/claims-and-enforcement">مطالبات و اجرای احکام</Link> را مطالعه کنید.</p>
      </div>
      <div className="practice-library-note">
        <h2>پیش از ثبت درخواست</h2>
        <p>شرح کوتاه و زمان‌بندی‌شده موضوع، مرحله فعلی پرونده و مرجع رسیدگی را آماده کنید. اگر جلسه یا مهلت قانونی نزدیک دارید، تاریخ آن را در ابتدای شرح بنویسید. اطلاعات هویتی حساس، شماره پرونده و اسناد محرمانه را در فرم عمومی وارد نکنید؛ در صورت نیاز، روش مناسب تبادل مدارک پس از هماهنگی اعلام می‌شود.</p>
        <div><Link href="/services">مشاهده همه حوزه‌های خدمات حقوقی ←</Link><Link href="/#contact">ثبت درخواست بررسی اولیه ←</Link></div>
      </div>
    </section>
    <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>دفتر در اهواز · درخواست اولیه از سراسر خوزستان</span></div></footer>
  </main>;
}
