import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "معرفی سید احمد موسوی | وکیل پایه یک دادگستری",
  description: "معرفی سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه؛ دارای کارشناسی ارشد حقوق و نویسنده مقاله و کتاب. دفتر فعالیت در اهواز.",
  alternates: { canonical: "/about" },
};

const credentials = [
  ["عنوان حرفه‌ای", "وکیل پایه یک دادگستری"],
  ["عضویت حرفه‌ای", "مرکز وکلای قوه قضائیه"],
  ["شماره پروانه وکالت", "74516"],
  ["تحصیلات", "کارشناسی ارشد حقوق"],
  ["فعالیت علمی", "نویسنده مقاله و کتاب"],
  ["محل فعالیت دفتر", "اهواز، استان خوزستان"],
];

const approach = [
  ["۰۱", "شناخت دقیق موضوع", "خواسته، اختلاف، اشخاص مرتبط و مرحله فعلی پرونده به‌صورت جداگانه بررسی می‌شوند."],
  ["۰۲", "مطالعه مدارک و مهلت‌ها", "اسناد و اطلاعات ارائه‌شده، مرجع رسیدگی و مهلت‌های قانونی مرتبط ارزیابی می‌شوند."],
  ["۰۳", "توضیح مسیرهای قابل بررسی", "راهکارهای قانونی متناسب با شرایط پرونده و محدودیت‌های هر مسیر توضیح داده می‌شوند."],
];

export default function AboutPage() {
  return (
    <main className="practice-page about-page" dir="rtl">
      <header className="article-header">
        <div className="container article-header-inner">
          <Link href="/" className="article-brand">
            خدمات حقوقی
            <span>سید احمد موسوی · اهواز و سراسر ایران</span>
          </Link>
          <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه <span aria-hidden="true">←</span></Link>
        </div>
      </header>

      <section className="practice-hero about-hero">
        <div className="container">
          <nav className="article-breadcrumb" aria-label="مسیر صفحه">
            <Link href="/">صفحه اصلی</Link><span aria-hidden="true">←</span><span>معرفی وکیل</span>
          </nav>
          <span className="section-kicker">ATTORNEY PROFILE</span>
          <h1>آشنایی با <em>سید احمد موسوی</em></h1>
          <p>اطلاعات حرفه‌ای، تحصیلات و رویکرد بررسی مسائل حقوقی؛ پیش از آنکه درباره مسیر اقدام تصمیم بگیرید.</p>
        </div>
      </section>

      <section className="container about-profile-section" aria-labelledby="about-profile-title">
        <div className="about-profile-card">
          <figure className="about-attorney-photo">
            <Image
              src="/images/lawyer.jpg"
              alt="تصویر سید احمد موسوی، وکیل پایه یک دادگستری"
              width={800}
              height={1000}
              sizes="(max-width: 760px) 100vw, 380px"
              priority
            />
            <figcaption className="about-photo-caption">
              <strong>سید احمد موسوی</strong>
              <span>وکیل پایه یک دادگستری</span>
              <small>عضو مرکز وکلای قوه قضائیه</small>
            </figcaption>
          </figure>

          <div className="about-attorney-content">
            <span className="section-kicker">PROFESSIONAL INFORMATION</span>
            <h2 id="about-profile-title">مشخصات حرفه‌ای</h2>
            <p className="about-profile-intro">
              سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه، دارای مدرک کارشناسی ارشد حقوق و نویسنده مقاله و کتاب است.
            </p>
            <dl className="about-credentials">
              {credentials.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd dir={label === "شماره پروانه وکالت" ? "ltr" : undefined}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="container about-approach-section">
        <div className="about-section-heading">
          <span className="section-kicker">CASE REVIEW APPROACH</span>
          <h2>هر پرونده، نیازمند بررسی متناسب با شرایط خودش است.</h2>
          <p>
            موضوع واقعی اختلاف، اسناد و مدارک، مرحله رسیدگی، مرجع صالح و مهلت‌های قانونی باید در کنار یکدیگر دیده شوند. ثبت درخواست اولیه به معنای پذیرش قطعی وکالت یا تضمین نتیجه پرونده نیست.
          </p>
        </div>
        <div className="about-approach-grid">
          {approach.map(([number, title, description]) => (
            <article key={number}>
              <span className="about-approach-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="about-service-note">
          <strong>محل فعالیت و نحوه ثبت درخواست</strong>
          <p>
            دفتر در اهواز، استان خوزستان مستقر است. امکان ثبت درخواست اولیه از سراسر ایران وجود دارد؛ امکان ارائه خدمت و شیوه همکاری پس از بررسی موضوع، مرجع رسیدگی و شرایط هر پرونده مشخص می‌شود.
          </p>
        </div>
        <div className="about-cta">
          <Link href="/#contact">ثبت درخواست بررسی اولیه <span aria-hidden="true">←</span></Link>
          <Link href="/services">مشاهده حوزه‌های خدمات حقوقی</Link>
        </div>
      </section>

      <footer className="article-footer">
        <div className="container">
          <Link href="/">بازگشت به صفحه اصلی</Link>
          <span>معرفی وکیل سید احمد موسوی</span>
        </div>
      </footer>
    </main>
  );
}
