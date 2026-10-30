import Link from "next/link";

export const metadata = {
  title: "درخواست خدمات حقوقی در شهرهای خوزستان | دفتر اهواز",
  description: "ثبت درخواست بررسی اولیه مسائل حقوقی از اهواز، آبادان، خرمشهر، دزفول، شوشتر، ماهشهر و دیگر شهرهای خوزستان؛ امکان ارائه خدمت پس از بررسی پرونده مشخص می‌شود.",
  alternates: { canonical: "/locations/khuzestan" },
};

const cities = [
  "اهواز","آبادان","خرمشهر","دزفول","شوشتر","اندیمشک","ماهشهر","بندر امام خمینی",
  "بهبهان","رامهرمز","ایذه","مسجدسلیمان","شوش","هویزه","سوسنگرد","باغ‌ملک",
  "شادگان","حمیدیه","کارون","باوی","لالی","هفتکل","آغاجاری","امیدیه","رامشیر",
  "گتوند","هندیجان","دشت آزادگان","اندیکا","صیدون"
];

export default function KhuzestanLocationPage() {
  return <main className="practice-page" dir="rtl">
    <header className="article-header"><div className="container article-header-inner">
      <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · دفتر اهواز</span></Link>
      <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
    </div></header>
    <section className="practice-hero"><div className="container">
      <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>مناطق تحت پوشش</span></div>
      <span className="section-kicker">LEGAL SERVICES · KHUZESTAN</span>
      <h1>درخواست بررسی حقوقی<br/><em>در شهرهای استان خوزستان</em></h1>
      <p>محل فعالیت دفتر سید احمد موسوی در اهواز، استان خوزستان است. ساکنان شهرهای دیگر استان نیز می‌توانند درخواست اولیه خود را ثبت کنند. شیوه ارائه خدمت و امکان پذیرش هر پرونده پس از بررسی موضوع، مرجع رسیدگی، مدارک و شرایط قانونی مشخص می‌شود؛ درج نام شهر به معنای وجود دفتر یا شعبه مستقل در آن شهر نیست.</p>
    </div></section>
    <section className="container practice-list-section">
      <div className="practice-library-note"><h2>شهرها و مناطق قابل انتخاب در فرم درخواست</h2><p>برای موضوعاتی مانند دعاوی خانواده، کیفری، ملکی، قراردادها و مطالبات، شهر محل پرونده را دقیق انتخاب کنید تا امکان بررسی اولیه و هماهنگی متناسب با شرایط پرونده مشخص شود.</p></div>
      <div className="practice-city-list">{cities.map((city) => <span key={city}>{city}</span>)}</div>
      <div className="practice-library-note">
        <h2>پیش از ثبت درخواست</h2>
        <p>شرح کوتاه موضوع، مرحله فعلی پرونده و مرجع رسیدگی را آماده کنید. اطلاعات هویتی حساس، شماره پرونده و اسناد محرمانه را در فرم عمومی وارد نکنید. در صورت نیاز، روش مناسب تبادل مدارک پس از هماهنگی اعلام می‌شود.</p>
        <div><Link href="/services">مشاهده حوزه‌های خدمات حقوقی ←</Link><Link href="/#contact">ثبت درخواست بررسی اولیه ←</Link></div>
      </div>
    </section>
    <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>دفتر در اهواز · درخواست اولیه از سراسر خوزستان</span></div></footer>
  </main>;
}
