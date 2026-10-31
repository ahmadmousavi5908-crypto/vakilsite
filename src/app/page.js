import Link from "next/link";
import Image from "next/image";
import ServiceFinder from "../components/ServiceFinder";
import RequestForm from "../components/RequestForm";
import { articles } from "../data/articles";
import OfficeLocationPublic from "../components/OfficeLocationPublic";
import JsonLd from "../components/JsonLd";
import SocialLinksPublic from "../components/SocialLinksPublic";

const services = [
  { n: "۰۱", slug: "family-law", title: "حقوق خانواده", desc: "طلاق، مهریه، نفقه، حضانت فرزند و دعاوی مرتبط با خانواده.", tag: "خانواده" },
  { n: "۰۲", slug: "property-law", title: "دعاوی ملکی و ثبتی", desc: "اختلافات مالکیت، الزام به تنظیم سند، تخلیه، سرقفلی و امور ثبتی.", tag: "املاک" },
  { n: "۰۳", slug: "criminal-law", title: "دعاوی کیفری", desc: "بررسی اتهام، دفاع کیفری، شکواییه و پیگیری حقوق اشخاص در پرونده.", tag: "کیفری" },
  { n: "۰۴", slug: "contracts-and-obligations", title: "قراردادها و تعهدات", desc: "تنظیم و بررسی قرارداد، مطالبه وجه، خسارت و اختلافات قراردادی.", tag: "قرارداد" },
  { n: "۰۵", slug: "claims-and-enforcement", title: "مطالبات و اجرای احکام", desc: "مطالبه طلب، چک، سفته، اجرای تعهدات و پیگیری دعاوی حقوقی.", tag: "مطالبات" },
  { n: "۰۶", slug: "legal-consultation", title: "مشاوره و بررسی پرونده", desc: "بررسی اولیه موضوع، مدارک و مسیرهای قانونی پیش از اقدام.", tag: "مشاوره" },
];

const cities = [
  "اهواز", "آبادان", "خرمشهر", "دزفول", "ماهشهر", "بندر امام خمینی",
  "بهبهان", "شوشتر", "اندیمشک", "ایذه", "شوش", "مسجدسلیمان",
  "رامهرمز", "شادگان", "حمیدیه", "کارون", "باوی", "هویزه",
  "سوسنگرد", "لالی", "هفتکل", "آغاجاری", "امیدیه", "رامشیر",
  "گتوند", "باغ‌ملک", "هندیجان", "دشت آزادگان", "اندیکا", "صیدون",
];

const faqs = [
  ["برای شروع بررسی پرونده چه اطلاعاتی لازم است؟", "کافی است موضوع اختلاف، شهر محل رسیدگی، مرحله فعلی پرونده و خلاصه‌ای روشن از اتفاقات را بنویسید. اگر مهلت قانونی یا تاریخ جلسه‌ای در پیش دارید، آن را هم ذکر کنید."],
  ["آیا فقط پرونده‌های شهر اهواز پذیرفته می‌شوند؟", "خیر. امکان ثبت درخواست اولیه از سراسر ایران وجود دارد. پس از بررسی موضوع، مرجع رسیدگی و شرایط پرونده مشخص می‌شود که ارائه خدمت به‌صورت حضوری یا غیرحضوری امکان‌پذیر است یا خیر."],
  ["آیا ثبت درخواست در سایت به معنی قبول وکالت است؟", "خیر. ثبت درخواست فقط برای آشنایی اولیه با موضوع است و به‌تنهایی رابطه وکالت ایجاد نمی‌کند. پذیرش پرونده، حدود خدمات و تعهدات طرفین پس از بررسی و توافق جداگانه مشخص خواهد شد."],
  ["هزینه مشاوره و حق‌الوکاله چگونه تعیین می‌شود؟", "هزینه با توجه به نوع خدمت، پیچیدگی موضوع، حجم مدارک و اقدامات موردنیاز تعیین می‌شود. پیش از شروع خدمت، درباره هزینه و حدود کار با شما هماهنگ خواهد شد."],
  ["برای بررسی اولیه باید همه مدارک را ارسال کنم؟", "در مرحله نخست، شرح دقیق موضوع و اشاره به مدارک موجود کافی است. لطفاً اطلاعات بسیار حساس، رمزها، کدهای شناسایی یا تصاویر اسناد محرمانه را در فرم عمومی سایت وارد نکنید؛ در صورت نیاز، روش مناسب تبادل مدارک هماهنگ می‌شود."],
  ["اگر پرونده در مرحله دادسرا یا دادگاه باشد، امکان بررسی وجود دارد؟", "بله، می‌توانید مرحله فعلی پرونده و تاریخ ابلاغ یا جلسه را در درخواست خود توضیح دهید. امکان اقدام و مهلت‌های قابل استفاده باید با توجه به جزئیات پرونده و اسناد بررسی شود."],
  ["آیا قبل از مراجعه حضوری می‌توانم موضوع را مطرح کنم؟", "بله. می‌توانید درخواست اولیه را از طریق سایت ثبت کنید یا با شماره‌های تماس دفتر ارتباط بگیرید. در صورت نیاز به جلسه حضوری، زمان و محل آن هماهنگ خواهد شد."],
  ["چه مدت طول می‌کشد تا به درخواست من پاسخ داده شود؟", "زمان پاسخ‌گویی به حجم درخواست‌ها و کامل بودن اطلاعات اولیه بستگی دارد. اگر مهلت فوری یا جلسه نزدیک دارید، آن را در ابتدای شرح درخواست به‌وضوح بنویسید و برای موضوعات فوری صرفاً به فرم سایت اکتفا نکنید."]
];

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const structuredSite = siteUrl
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": siteUrl + "/#website",
            url: siteUrl,
            name: "خدمات حقوقی سید احمد موسوی",
            inLanguage: "fa-IR",
          },
          {
            "@type": "Person",
            "@id": siteUrl + "/#attorney",
            name: "سید احمد موسوی",
            jobTitle: "وکیل پایه یک دادگستری",
            telephone: ["+989169165902", "+989388322230"],
            memberOf: { "@type": "Organization", name: "مرکز وکلای قوه قضائیه" },
            identifier: { "@type": "PropertyValue", name: "شماره پروانه وکالت", value: "74516" },
            knowsLanguage: "fa",
          },
          {
            "@type": "LegalService",
            "@id": siteUrl + "/#legal-service",
            name: "خدمات حقوقی سید احمد موسوی",
            url: siteUrl,
            provider: { "@id": siteUrl + "/#attorney" },
            telephone: "+989169165902",
            areaServed: [
              { "@type": "AdministrativeArea", name: "استان خوزستان" },
              { "@type": "Country", name: "ایران" },
            ],
            availableLanguage: ["Persian"],
          },
        ],
      }
    : null;

  return (
    <main id="main-content" dir="rtl">
      {structuredSite && <JsonLd data={structuredSite} />}
      <a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
      <div className="topline">
        <div className="container topline-inner">
          <span>پاسخ‌گویی به درخواست‌های حقوقی از سراسر ایران با مرکزیت اهواز، خوزستان</span>
          <span className="topline-note"><i /> مسیر روشن، تصمیم آگاهانه</span>
        </div>
      </div>

      <header className="site-header">
        <div className="container nav-wrap">
          <a className="brand" href="#" aria-label="صفحه اصلی">
            <span className="brand-mark"><span>و</span></span>
            <span className="brand-copy"><strong>مجموعه خدمات حقوقی</strong><small>اهواز، خوزستان · پذیرش درخواست از سراسر ایران</small></span>
          </a>
          <nav className="desktop-nav" aria-label="منوی اصلی">
            <Link href="/services">حوزه‌های فعالیت</Link>
            <Link href="/about">معرفی وکیل</Link>
            <Link href="/locations/khuzestan">مناطق تحت پوشش</Link>
            <a href="#process">روند همکاری</a>
            <Link href="/articles">مقالات حقوقی</Link>
            <Link href="/legal-glossary">واژه‌نامه حقوقی</Link>
            <Link href="/legal-library">کتابخانه حقوقی</Link>
            <Link href="/ai-assistant">دستیار هوشمند</Link>
            <Link href="/lawyer-cooperation">همکاری وکلا</Link>
            <a href="#faq">پرسش‌های متداول</a>
          </nav>
          <details className="mobile-menu">
            <summary aria-label="باز کردن فهرست سایت" aria-controls="mobile-site-navigation">
              <span className="menu-visually-hidden">فهرست سایت</span>
              <i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>
            </summary>
            <nav id="mobile-site-navigation" aria-label="فهرست اصلی سایت">
              <div className="mobile-menu-heading">
                <span className="mobile-menu-kicker">راهنمای دسترسی</span>
                <strong>چطور می‌توانیم راهنمایی‌تان کنیم؟</strong>
                <small>بخش موردنظر خود را انتخاب کنید</small>
              </div>
              <div className="mobile-menu-group">
                <span className="mobile-menu-group-title">آشنایی و خدمات حقوقی</span>
                <Link href="/services"><b>01</b><span>حوزه‌های فعالیت حقوقی</span><i>←</i></Link>
                <Link href="/about"><b>02</b><span>معرفی وکیل</span><i>←</i></Link>
                <Link href="/locations/khuzestan"><b>03</b><span>مناطق تحت پوشش</span><i>←</i></Link>
                <a href="#process"><b>04</b><span>مراحل و روند همکاری</span><i>←</i></a>
              </div>
              <div className="mobile-menu-group">
                <span className="mobile-menu-group-title">دانش و ابزارهای حقوقی</span>
                <Link href="/articles"><b>05</b><span>مقالات و آموزش حقوقی</span><i>←</i></Link>
                <Link href="/legal-glossary"><b>06</b><span>واژه‌نامه حقوقی</span><i>←</i></Link>
                <Link href="/legal-library"><b>07</b><span>کتابخانه حقوقی</span><i>←</i></Link>
                <Link href="/ai-assistant"><b>08</b><span>دستیار هوشمند حقوقی</span><i>←</i></Link>
              </div>
              <div className="mobile-menu-group mobile-menu-secondary">
                <Link href="/lawyer-cooperation"><b>09</b><span>همکاری با وکلا</span><i>←</i></Link>
                <a href="#faq"><b>10</b><span>پرسش‌های متداول</span><i>←</i></a>
              </div>
              <a className="mobile-menu-cta" href="#contact"><span>برای شروع، درخواست خود را ثبت کنید</span><b>ثبت درخواست بررسی اولیه <i>←</i></b></a>
              <div className="mobile-menu-foot">خدمات حقوقی سید احمد موسوی · اهواز و سراسر ایران</div>
            </nav>
          </details>
          <a className="nav-cta" href="#contact">درخواست مشاوره <span>←</span></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-pattern" />
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="eyebrow"><span /> همراه حقوقی شما، از نخستین قدم</div>
            <h1>وقتی با یک مسئله حقوقی روبه‌رو می‌شوید،<em> مسیر درست</em> اهمیت دارد.</h1>
            <p className="hero-lead">موضوع حقوقی خود را ساده و روشن مطرح کنید. درخواست شما بررسی می‌شود تا با شناخت بهتر شرایط، مسیرهای قانونی و قدم بعدی را آگاهانه انتخاب کنید.</p>
            <div className="hero-actions">
              <a className="btn btn-gold" href="#contact">ثبت درخواست بررسی <span>←</span></a>
              <a className="text-link" href="#services">آشنایی با خدمات <span>↓</span></a>
            </div>
            <div className="hero-points">
              <span><b>✓</b> مسیر ارتباط ساده</span>
              <span><b>✓</b> توضیح روشن و قابل فهم</span>
              <span><b>✓</b> امکان درخواست از سراسر ایران</span>
            </div>
          </div>
          <div className="hero-visual attorney-profile-visual" aria-label="تصویر و معرفی وکیل">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="lawyer-photo-card">
              <div className="visual-top"><span>ATTORNEY PROFILE · AHVAZ</span><span className="visual-dot" /></div>
              <div className="lawyer-photo-wrap">
                <Image src="/images/lawyer.jpg" alt="سید احمد موسوی، وکیل پایه یک دادگستری" width={800} height={1000} priority sizes="(max-width: 700px) 100vw, 390px" quality={82} className="lawyer-photo-image" style={{ objectFit: "cover", objectPosition: "center 25%" }} />
                <svg className="photo-justice-mark" viewBox="0 0 100 100" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M50 13v65M35 78h30M41 86h18M50 17L20 31M50 17l30 14M20 31L9 57M20 31l11 26M80 31L69 57M80 31l11 26M9 57q11 10 22 0M69 57q11 10 22 0"/>
                    <circle cx="50" cy="17" r="5" fill="currentColor" stroke="none"/>
                  </g>
                </svg>
              </div>
              <div className="visual-bottom attorney-photo-caption"><strong>سید احمد موسوی</strong><span>وکیل پایه یک دادگستری</span><small>شماره پروانه وکالت: <b dir="ltr">74516</b></small></div>
            </div>
            <div className="attorney-credentials" aria-label="مشخصات حرفه‌ای وکیل">
              <div className="attorney-identity">
                <div>
                  <span className="attorney-eyebrow">معرفی وکیل</span>
                  <strong>سید احمد موسوی</strong>
                  <span className="attorney-role">وکیل پایه یک دادگستری</span>
                </div>
              </div>
              <p className="attorney-summary">
                سید احمد موسوی، وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه، دارای کارشناسی ارشد حقوق و نویسنده مقاله و کتاب است. در این مجموعه، درخواست‌های حقوقی پس از دریافت شرح اولیه، از نظر موضوع، مدارک، مرحله رسیدگی و مرجع صالح بررسی می‌شوند تا مسیرهای قانونی قابل بررسی برای متقاضی روشن شود. محل فعالیت دفتر در اهواز است و امکان ثبت درخواست اولیه از سراسر ایران فراهم شده است؛ پذیرش هر پرونده پس از بررسی جداگانه انجام می‌شود.
              </p>
              <div className="attorney-credential-grid">
                <div><span>شماره پروانه وکالت</span><strong dir="ltr">74516</strong></div>
                <div><span>عضویت حرفه‌ای</span><strong>مرکز وکلای قوه قضائیه</strong></div>
                <div><span>تحصیلات</span><strong>کارشناسی ارشد حقوق</strong></div>
                <div><span>فعالیت علمی</span><strong>نویسنده مقاله و کتاب</strong></div>
              </div>
              <div className="attorney-direct-lines">
                <span>ارتباط مستقیم</span>
                <a href="tel:09169165902" dir="ltr">0916 916 5902</a>
                <a href="tel:09388322230" dir="ltr">0938 832 2230</a>
              </div>
            </div>
            <div className="floating-note"><span className="note-icon">§</span><span><b>بررسی دقیق موضوع</b><small>پیش از انتخاب مسیر قانونی</small></span></div>
          </div>
        </div>
        <div className="hero-bottom-line"><span /> <span>پایگاه فعالیت در اهواز، پاسخ‌گو به درخواست‌ها از سراسر ایران</span></div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <div><strong>۰۱</strong><span>شرح ساده مسئله</span></div>
          <div><strong>۰۲</strong><span>بررسی شرایط و مدارک</span></div>
          <div><strong>۰۳</strong><span>توضیح مسیرهای قانونی</span></div>
          <div><strong>۰۴</strong><span>تصمیم‌گیری آگاهانه</span></div>
        </div>
      </section>

      <section className="section services-section" id="services">
        <div className="container">
          <div className="section-heading">
            <div><span className="section-kicker">AREAS OF PRACTICE</span><h2>در چه زمینه‌ای<br/><em>به راهنمایی حقوقی</em> نیاز دارید؟</h2></div>
            <p>از میان موضوعات زیر، نزدیک‌ترین گزینه به مسئله خود را پیدا کنید. هر موضوع می‌تواند شرایط و مسیر قانونی متفاوتی داشته باشد و نیازمند بررسی جداگانه است.</p>
          </div>
          <div className="service-grid">
            {services.map((s) => <Link className="service-card" href={"/services/" + s.slug} key={s.n} >
              <div className="service-card-top"><span>{s.n}</span><span className="service-arrow">↙</span></div>
              <div className="service-symbol">{s.tag === "خانواده" ? "⌂" : s.tag === "املاک" ? "▧" : s.tag === "کیفری" ? "§" : s.tag === "قرارداد" ? "▤" : s.tag === "مطالبات" ? "◈" : "✳"}</div>
              <h3>{s.title}</h3><p>{s.desc}</p><span className="card-more">مشاهده جزئیات این حوزه <b>←</b></span>
            </Link>)}
          </div>
        </div>
      </section>

      <ServiceFinder />

      <section className="city-section" id="cities">
        <div className="container city-layout">
          <div className="city-intro">
            <span className="section-kicker">KHOUZESTAN & IRAN</span>
            <h2>فاصله، مانع<br/><em>ثبت درخواست</em> نیست.</h2>
            <p>دفتر و پایگاه فعالیت مجموعه در اهواز، استان خوزستان قرار دارد؛ با این حال، متقاضیان از سراسر ایران می‌توانند درخواست اولیه خود را ثبت کنند. امکان پذیرش و شیوه ارائه خدمت پس از بررسی موضوع، مرجع رسیدگی و شرایط پرونده مشخص می‌شود.</p>
            <a href="#contact" className="city-cta">درخواست از شهر خودتان <span>←</span></a>
          </div>
          <div className="city-panel">
            <div className="city-panel-head"><div><span className="section-kicker">KHOUZESTAN PROVINCE</span><h3>شهرهای استان خوزستان</h3></div><span className="city-count">شهرها و مناطق استان</span></div>
            <div className="city-list">{cities.map((c, i) => <span className={i === 0 ? "city-chip city-featured" : "city-chip"} key={c}>{c}{i === 0 && <b>مرکز</b>}</span>)}</div>
            <div className="city-foot"><span className="city-pin">⌖</span><span>همچنین امکان ثبت درخواست اولیه از سایر شهرهای ایران وجود دارد.</span></div>
            <a className="city-national-link" href="#contact"><span className="city-national-icon">⌘</span><span><strong>سایر استان‌های ایران</strong><small>اگر شهر یا استان شما در فهرست بالا نیست، درخواست خود را از این بخش ثبت کنید.</small></span><b>←</b></a>
          </div>
        </div>
      </section>

      <section className="section process-section" id="process">
        <div className="container">
          <div className="center-heading"><span className="section-kicker">HOW IT WORKS</span><h2>شروع ارتباط، <em>ساده و مرحله‌به‌مرحله</em></h2><p>برای مطرح کردن مسئله حقوقی، لازم نیست از ابتدا اصطلاحات پیچیده بدانید.</p></div>
          <div className="process-grid">
            <div className="process-step"><span className="step-no">۱</span><div className="step-line" /><h3>موضوع را انتخاب کنید</h3><p>زمینه حقوقی و شهر محل پرونده را مشخص کنید.</p></div>
            <div className="process-step"><span className="step-no">۲</span><div className="step-line" /><h3>شرح کوتاهی بنویسید</h3><p>اصل ماجرا و مرحله فعلی پرونده را ساده توضیح دهید.</p></div>
            <div className="process-step"><span className="step-no">۳</span><div className="step-line" /><h3>درخواست را ارسال کنید</h3><p>اطلاعات اولیه برای بررسی و هماهنگی ارسال می‌شود.</p></div>
            <div className="process-step"><span className="step-no">۴</span><div className="step-line" /><h3>قدم بعدی را بشناسید</h3><p>پس از بررسی امکان ارائه خدمت و مسیر مناسب توضیح داده می‌شود.</p></div>
          </div>
        </div>
      </section>

      <section className="section home-articles-section home-editorial-section" id="articles">
        <div className="container">
          <div className="section-heading home-articles-heading">
            <div><span className="section-kicker">کتابخانه حقوقی</span><h2>دانش حقوقی،<br/><em>برای تصمیم‌های آگاهانه.</em></h2></div>
            <p>راهنماهای کوتاه و کاربردی بر پایه قوانین ایران؛ برای شناخت موضوع، آماده‌سازی مدارک و پرسیدن سؤال‌های درست.</p>
          </div>
          <div className="home-article-accordion-list">
            {articles.map((article) => <details className="home-article-accordion" key={article.slug}>
              <summary>
                <span className="home-article-accordion-title"><strong>{article.title}</strong><small>{article.readTime} مطالعه</small></span>
                <b aria-hidden="true">+</b>
              </summary>
              <div className="home-article-accordion-panel">
                <p>{article.excerpt}</p>
                <Link href={"/articles/" + article.slug}>مطالعه مقاله کامل <span>←</span></Link>
              </div>
            </details>)}
          </div>
          <div className="home-articles-more"><Link href="/articles">ورود به کتابخانه راهنماهای حقوقی <span>←</span></Link></div>
        </div>
      </section>

      <section className="feature-entry-section">
        <div className="container">
          <div className="section-heading">
            <div><span className="section-kicker">SMART LEGAL SERVICES</span><h2>خدماتی فراتر از<br/><em>یک وب‌سایت حقوقی معمولی</em></h2></div>
            <p>درگاه‌های تکمیلی برای ثبت درخواست و هماهنگی همکاری؛ قابلیت‌های خودکار فقط پس از راه‌اندازی و آزمون واقعی فعال خواهند شد.</p>
          </div>
          <div className="feature-entry-grid">
            <Link className="feature-entry-card ai-entry" href="/ai-assistant"><span className="feature-entry-mark">✦</span><span className="section-kicker">AI LEGAL ASSISTANT</span><h3>درگاه درخواست راهنمایی هوشمند</h3><p>این نسخه فعلاً پرسش شما را برای ارسال به دفتر آماده می‌کند و پاسخ خودکار هوش مصنوعی یا سامانه بارگذاری امن اسناد نیست.</p><b>ورود به مرکز هوشمند <span>←</span></b></Link>
            <Link className="feature-entry-card lawyer-entry" href="/lawyer-cooperation"><span className="feature-entry-mark">§</span><span className="section-kicker">LAWYER NETWORK</span><h3>درخواست همکاری حرفه‌ای وکلا</h3><p>فرم اولیه برای هماهنگی و بررسی امکان همکاری است؛ ثبت درخواست به معنی ایجاد شبکه ارجاع یا پذیرش قطعی پرونده نیست.</p><b>ثبت درخواست همکاری <span>←</span></b></Link>
          </div>
        </div>
      </section>

      <section className="connection-section" aria-labelledby="connection-title">
        <div className="container connection-card">
          <div className="connection-copy">
            <span className="section-kicker">LET&apos;S TALK</span>
            <h2 id="connection-title">برای شروع، لازم نیست همه‌چیز را بدانید.</h2>
            <p>کافی است مسئله‌تان را کوتاه مطرح کنید. مسیر مناسب ارتباط و بررسی اولیه، متناسب با شرایط شما مشخص می‌شود.</p>
            <div className="connection-assurance"><span>✓</span> بدون نیاز به اصطلاحات پیچیده حقوقی</div>
          </div>
          <div className="connection-actions">
            <a className="connection-primary" href="#contact"><span className="connection-icon">✉</span><span><b>ثبت درخواست بررسی اولیه</b><small>فرم کوتاه و ساده، حدود یک دقیقه</small></span><strong>←</strong></a>
            <a className="connection-whatsapp" href="#contact"><span className="whatsapp-mark">◉</span><span><b>شروع ارتباط و دریافت راهنمایی</b><small>ابتدا موضوع را ثبت کنید تا مسیر ارتباط مشخص شود</small></span><strong>←</strong></a>
            <SocialLinksPublic />
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="container contact-layout">
          <div className="contact-copy"><span className="section-kicker">START HERE</span><h2>مسئله‌تان را<br/><em>از همین‌جا</em> مطرح کنید.</h2><p>چند مورد کوتاه را تکمیل کنید تا متن درخواست اولیه آماده شود. لطفاً در این مرحله اطلاعات محرمانه، کد ملی، شماره پرونده یا تصویر اسناد را وارد نکنید.</p><div className="contact-assurance"><span>✓</span> ثبت درخواست اولیه به معنی قبول وکالت یا تضمین نتیجه پرونده نیست.</div></div>
          <RequestForm services={services} />
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="container faq-layout">
          <div><span className="section-kicker">GOOD TO KNOW</span><h2>پیش از شروع،<br/><em>این نکات را بدانید.</em></h2><p>پاسخ‌های کوتاه برای پرسش‌هایی که معمولاً در نخستین تماس مطرح می‌شوند.</p></div>
          <div className="faq-list">{faqs.map((f) => <details className="faq-item" key={f[0]}><summary><span>{f[0]}</span><b aria-hidden="true">+</b></summary><p>{f[1]}</p></details>)}</div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-main">
          <a className="brand footer-brand" href="#"><span className="brand-mark"><span>و</span></span><span className="brand-copy"><strong>مجموعه خدمات حقوقی</strong><small>دفتر اهواز، خوزستان · خدمات در سراسر ایران</small></span></a>
          <p>آگاهی حقوقی، نخستین قدم برای انتخاب درست است.</p>
          <a href="#contact" className="footer-link">ثبت درخواست <span>←</span></a>
        </div>
        <div className="container"><OfficeLocationPublic /></div>
        <div className="container footer-bottom"><span>© تمامی حقوق این وب‌سایت محفوظ است.</span><span>اطلاعات این وب‌سایت جایگزین بررسی اختصاصی پرونده و مشاوره حقوقی نیست.</span><Link href="/privacy">حریم خصوصی</Link><Link href="/articles">مقالات</Link><Link href="/lawyer-cooperation">همکاری وکلا</Link></div>
      </footer>
    </main>
  );
}
