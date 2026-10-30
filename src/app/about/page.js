import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "معرفی سید احمد موسوی | وکیل پایه یک دادگستری",
  description: "معرفی سید احمد موسوی، وکیل پایه یک دادگستری، عضو مرکز وکلای قوه قضائیه، کارشناسی ارشد حقوق و نویسنده مقاله و کتاب؛ دفتر فعالیت در اهواز.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <main className="practice-page" dir="rtl">
    <header className="article-header"><div className="container article-header-inner">
      <Link href="/" className="article-brand">خدمات حقوقی <span>سید احمد موسوی · اهواز و سراسر ایران</span></Link>
      <Link href="/#contact" className="article-header-cta">ثبت درخواست اولیه ←</Link>
    </div></header>
    <section className="practice-hero"><div className="container">
      <div className="article-breadcrumb"><Link href="/">صفحه اصلی</Link><span>←</span><span>معرفی وکیل</span></div>
      <span className="section-kicker">ATTORNEY PROFILE</span>
      <h1>معرفی سید احمد موسوی<br/><em>وکیل پایه یک دادگستری</em></h1>
      <p>آشنایی با مشخصات حرفه‌ای، تحصیلات و رویکرد بررسی مسائل حقوقی پیش از انتخاب مسیر اقدام.</p>
    </div></section>
    <section className="container about-attorney-layout">
      <figure className="about-attorney-photo">
        <Image src="/images/lawyer.jpg" alt="تصویر سید احمد موسوی، وکیل پایه یک دادگستری" width={800} height={1000} sizes="(max-width: 700px) 100vw, 420px" />
        <figcaption className="about-photo-caption"><strong>سید احمد موسوی</strong><span>وکیل پایه یک دادگستری</span><small>عضو مرکز وکلای قوه قضائیه</small><b>شماره پروانه وکالت: <i dir="ltr">74516</i></b></figcaption>
      </figure>
      <div className="about-attorney-content">
        <span className="section-kicker">PROFESSIONAL INFORMATION</span>
        <h2>سید احمد موسوی</h2>
        <p>وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه، دارای مدرک کارشناسی ارشد حقوق و نویسنده مقاله و کتاب.</p>
        <dl>
          <div><dt>عنوان حرفه‌ای</dt><dd>وکیل پایه یک دادگستری</dd></div>
          <div><dt>مرجع عضویت حرفه‌ای</dt><dd>مرکز وکلای قوه قضائیه</dd></div>
          <div><dt>شماره پروانه وکالت</dt><dd dir="ltr">74516</dd></div>
          <div><dt>تحصیلات</dt><dd>کارشناسی ارشد حقوق</dd></div>
          <div><dt>فعالیت علمی</dt><dd>نویسنده مقاله و کتاب</dd></div>
          <div><dt>محل فعالیت دفتر</dt><dd>اهواز، استان خوزستان</dd></div>
        </dl>
      </div>
    </section>
    <section className="container about-approach">
      <h2>رویکرد در بررسی مسائل حقوقی</h2>
      <p>هر پرونده باید با توجه به موضوع واقعی اختلاف، اسناد و مدارک، مرحله رسیدگی، مرجع صالح و مهلت‌های قانونی بررسی شود. ثبت درخواست اولیه به معنای پذیرش قطعی وکالت یا تضمین نتیجه نیست؛ امکان ارائه خدمت و شیوه همکاری پس از بررسی شرایط هر پرونده و توافق روشن مشخص می‌شود.</p>
      <div className="about-approach-grid">
        <article><strong>۱</strong><h3>شناخت موضوع</h3><p>تفکیک خواسته، اختلاف و مرحله فعلی پرونده.</p></article>
        <article><strong>۲</strong><h3>بررسی مستندات</h3><p>مطالعه مدارک و شناسایی اطلاعات تکمیلی لازم.</p></article>
        <article><strong>۳</strong><h3>توضیح مسیرها</h3><p>بررسی راهکارهای قانونی قابل طرح با توجه به شرایط.</p></article>
      </div>
      <div className="about-cta"><Link href="/#contact">ثبت درخواست بررسی اولیه ←</Link><Link href="/services">مشاهده حوزه‌های خدمات حقوقی</Link></div>
    </section>
    <footer className="article-footer"><div className="container"><Link href="/">بازگشت به صفحه اصلی</Link><span>معرفی وکیل سید احمد موسوی</span></div></footer>
  </main>;
}
