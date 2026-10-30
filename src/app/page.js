"use client";

import { useState } from "react";
import Link from "next/link";
import ServiceFinder from "../components/ServiceFinder";
import { articles } from "../data/articles";

const services = [
  { n: "۰۱", title: "حقوق خانواده", desc: "طلاق، مهریه، نفقه، حضانت فرزند و دعاوی مرتبط با خانواده.", tag: "خانواده" },
  { n: "۰۲", title: "دعاوی ملکی و ثبتی", desc: "اختلافات مالکیت، الزام به تنظیم سند، تخلیه، سرقفلی و امور ثبتی.", tag: "املاک" },
  { n: "۰۳", title: "دعاوی کیفری", desc: "بررسی اتهام، دفاع کیفری، شکواییه و پیگیری حقوق اشخاص در پرونده.", tag: "کیفری" },
  { n: "۰۴", title: "قراردادها و تعهدات", desc: "تنظیم و بررسی قرارداد، مطالبه وجه، خسارت و اختلافات قراردادی.", tag: "قرارداد" },
  { n: "۰۵", title: "مطالبات و امور حقوقی", desc: "مطالبه طلب، چک، سفته، اجرای تعهدات و پیگیری دعاوی حقوقی.", tag: "مطالبات" },
  { n: "۰۶", title: "مشاوره و بررسی پرونده", desc: "بررسی اولیه موضوع، مدارک و مسیرهای قانونی پیش از اقدام.", tag: "مشاوره" },
];

const cities = [
  "اهواز", "آبادان", "خرمشهر", "دزفول", "ماهشهر", "بندر امام خمینی",
  "بهبهان", "شوشتر", "اندیمشک", "ایذه", "شوش", "مسجدسلیمان",
  "رامهرمز", "شادگان", "حمیدیه", "کارون", "باوی", "هویزه",
  "سوسنگرد", "لالی", "هفتکل", "آغاجاری", "امیدیه", "رامشیر",
  "گتوند", "باغ‌ملک", "هندیجان", "دشت آزادگان", "اندیکا", "صیدون",
];

const faqs = [
  ["آیا فقط از اهواز می‌توانم درخواست مشاوره بدهم؟", "خیر. امکان ارسال درخواست اولیه از شهرهای مختلف خوزستان و سایر نقاط ایران در نظر گرفته شده است. امکان پذیرش و نحوه ارائه خدمت، پس از بررسی موضوع و مدارک مشخص می‌شود."],
  ["برای بررسی اولیه چه اطلاعاتی لازم است؟", "موضوع پرونده، شهر محل رسیدگی، مرحله فعلی پرونده و خلاصه‌ای از اتفاقات کافی است. مدارک حساس یا اطلاعات محرمانه را در فرم عمومی ارسال نکنید؛ روش امن تبادل مدارک پس از هماهنگی اعلام می‌شود."],
  ["آیا ارسال درخواست به معنی قبول وکالت است؟", "خیر. ارسال درخواست صرفاً برای بررسی اولیه است. قبول وکالت، حدود خدمات، حق‌الوکاله و تعهدات طرفین فقط پس از بررسی و توافق روشن خواهد شد."],
  ["اگر از شهر دیگری باشم چه می‌شود؟", "درخواست شما ابتدا از نظر موضوع، مرجع رسیدگی و امکان ارائه خدمت بررسی می‌شود. درباره مشاوره غیرحضوری یا اقدامات قابل انجام، متناسب با پرونده اطلاع‌رسانی خواهد شد."],
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const [topic, setTopic] = useState("موضوع پرونده را انتخاب کنید");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");

  async function prepareRequest(e) {
    e.preventDefault();
    const timestamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date());
    const text = [
      "درخواست بررسی اولیه",
      "زمان تهیه درخواست (به وقت ایران): " + timestamp,
      "موضوع: " + topic,
      "شهر: " + (city || "اعلام نشده"),
      "شرح کوتاه: " + (details || "در انتظار توضیحات"),
    ].join("\n");
    const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "989169165902").replace(/\D/g, "");
    if (phone) {
      window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      window.alert("متن درخواست کپی شد. شماره واتساپ دفتر هنوز در تنظیمات سایت ثبت نشده است؛ پس از ثبت شماره، ارسال مستقیم فعال می‌شود.");
    } catch {
      window.prompt("شماره واتساپ دفتر هنوز تنظیم نشده است. متن درخواست را کپی کنید:", text);
    }
  }

  return (
    <main dir="rtl">
      <div className="topline">
        <div className="container topline-inner">
          <span>پاسخ‌گویی به درخواست‌های حقوقی از خوزستان و سراسر ایران</span>
          <span className="topline-note"><i /> مسیر روشن، تصمیم آگاهانه</span>
        </div>
      </div>

      <header className="site-header">
        <div className="container nav-wrap">
          <a className="brand" href="#" aria-label="صفحه اصلی">
            <span className="brand-mark"><span>و</span></span>
            <span className="brand-copy"><strong>مجموعه خدمات حقوقی</strong><small>اهواز · خوزستان · سراسر ایران</small></span>
          </a>
          <nav className="desktop-nav" aria-label="منوی اصلی">
            <a href="#services">حوزه‌های فعالیت</a>
            <a href="#cities">مناطق تحت پوشش</a>
            <a href="#process">روند همکاری</a>
            <Link href="/articles">مقالات حقوقی</Link>
            <Link href="/ai-assistant">دستیار هوشمند</Link>
            <Link href="/lawyer-cooperation">همکاری وکلا</Link>
            <a href="#faq">پرسش‌های متداول</a>
          </nav>
          <details className="mobile-menu">
            <summary aria-label="باز کردن فهرست سایت">فهرست</summary>
            <nav aria-label="منوی موبایل">
              <a href="#services">حوزه‌های فعالیت</a>
              <a href="#cities">مناطق تحت پوشش</a>
              <a href="#process">روند همکاری</a>
              <Link href="/articles">مقالات حقوقی</Link>
              <Link href="/ai-assistant">دستیار هوشمند</Link>
              <Link href="/lawyer-cooperation">همکاری وکلا</Link>
              <a href="#faq">پرسش‌های متداول</a>
              <a href="#contact">درخواست مشاوره</a>
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
          <div className="hero-visual" aria-label="تصویر گرافیکی ترازوی عدالت">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-card">
              <div className="visual-top"><span>JUSTICE · CLARITY · TRUST</span><span className="visual-dot" /></div>
              <svg viewBox="0 0 420 390" role="img" aria-label="نقش هنری ترازوی عدالت">
                <defs>
                  <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#e4cf9f"/><stop offset="1" stopColor="#9c7842"/></linearGradient>
                </defs>
                <path d="M210 64 V304 M150 304 H270 M174 326 H246 M190 346 H230" stroke="url(#gold)" strokeWidth="7" strokeLinecap="round" fill="none"/>
                <g className="scale-beam"><path d="M92 120 H328 M210 64 L92 120 M210 64 L328 120" stroke="url(#gold)" strokeWidth="5" fill="none" strokeLinecap="round"/></g>
                <g className="scale-pan-left"><path d="M92 120 L55 220 Q92 254 129 220 Z" fill="rgba(201,169,112,.16)" stroke="url(#gold)" strokeWidth="4"/></g><g className="scale-pan-right"><path d="M328 120 L291 220 Q328 254 365 220 Z" fill="rgba(201,169,112,.16)" stroke="url(#gold)" strokeWidth="4"/></g>
                <g className="scale-pan-left"><path d="M55 220 Q92 242 129 220" stroke="url(#gold)" strokeWidth="3" fill="none"/></g><g className="scale-pan-right"><path d="M291 220 Q328 242 365 220" stroke="url(#gold)" strokeWidth="3" fill="none"/></g>
                <circle cx="210" cy="64" r="13" fill="#d6bd8c"/>
                <path d="M210 34 V18 M188 40 L177 28 M232 40 L243 28" stroke="#d6bd8c" strokeWidth="3" strokeLinecap="round"/>
                <path d="M144 370 H276" stroke="rgba(214,189,140,.35)" strokeWidth="2"/>
              </svg>
              <div className="visual-bottom"><strong>عدالت، با آگاهی آغاز می‌شود.</strong><span>LEGAL SERVICES</span></div>
            </div>
            <div className="floating-note"><span className="note-icon">§</span><span><b>بررسی دقیق موضوع</b><small>پیش از انتخاب مسیر قانونی</small></span></div>
          </div>
        </div>
        <div className="hero-bottom-line"><span /> <span>اهواز، نقطه شروع ارتباط با سراسر خوزستان</span></div>
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
            {services.map((s) => <a className="service-card" href="#contact" key={s.n} onClick={() => setTopic(s.title)}>
              <div className="service-card-top"><span>{s.n}</span><span className="service-arrow">↙</span></div>
              <div className="service-symbol">{s.tag === "خانواده" ? "⌂" : s.tag === "املاک" ? "▧" : s.tag === "کیفری" ? "§" : s.tag === "قرارداد" ? "▤" : s.tag === "مطالبات" ? "◈" : "✳"}</div>
              <h3>{s.title}</h3><p>{s.desc}</p><span className="card-more">ثبت درخواست در این زمینه <b>←</b></span>
            </a>)}
          </div>
        </div>
      </section>

      <ServiceFinder onChoose={(selection) => setTopic(selection)} />

      <section className="city-section" id="cities">
        <div className="container city-layout">
          <div className="city-intro">
            <span className="section-kicker">KHOUZESTAN & IRAN</span>
            <h2>فاصله، مانع<br/><em>ثبت درخواست</em> نیست.</h2>
            <p>تمرکز جغرافیایی مجموعه در اهواز است؛ با این حال، درخواست‌های اولیه از شهرهای مختلف خوزستان و سایر استان‌ها قابل ثبت و بررسی است. امکان پذیرش هر پرونده به موضوع، مرجع رسیدگی و شرایط آن بستگی دارد.</p>
            <a href="#contact" className="city-cta">درخواست از شهر خودتان <span>←</span></a>
          </div>
          <div className="city-panel">
            <div className="city-panel-head"><div><span className="section-kicker">KHOUZESTAN PROVINCE</span><h3>شهرهای استان خوزستان</h3></div><span className="city-count">۳۰ نام منطقه</span></div>
            <div className="city-list">{cities.map((c, i) => <span className={i === 0 ? "city-chip city-featured" : "city-chip"} key={c}>{c}{i === 0 && <b>مرکز</b>}</span>)}</div>
            <div className="city-foot"><span className="city-pin">⌖</span><span>همچنین امکان ثبت درخواست اولیه از سایر شهرهای ایران وجود دارد.</span></div>
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

      <section className="section home-articles-section" id="articles">
        <div className="container">
          <div className="section-heading">
            <div><span className="section-kicker">LEGAL KNOWLEDGE · IRANIAN LAW</span><h2>پیش از تصمیم،<br/><em>آگاهانه‌تر بدانید.</em></h2></div>
            <p>راهنماهای کوتاه و کاربردی بر پایه قوانین ایران؛ برای شناخت بهتر موضوع، آماده‌سازی مدارک و پرسیدن سؤال‌های درست.</p>
          </div>
          <div className="home-article-grid">
            {articles.slice(0, 3).map((article, index) => <Link className="home-article-card" href={"/articles/" + article.slug} key={article.slug}>
              <div className="home-article-symbol">{["§","⚖","▤"][index]}</div>
              <div className="home-article-meta"><span>{article.category}</span><span>{article.readTime} مطالعه</span></div>
              <h3>{article.title}</h3><p>{article.excerpt}</p><b>مطالعه راهنما <span>←</span></b>
            </a>)}
          </div>
          <div className="home-articles-more"><Link href="/articles">مشاهده همه مقالات و راهنماها ←</Link></div>
        </div>
      </section>

      <section className="feature-entry-section">
        <div className="container">
          <div className="section-heading">
            <div><span className="section-kicker">SMART LEGAL SERVICES</span><h2>خدماتی فراتر از<br/><em>یک وب‌سایت حقوقی معمولی</em></h2></div>
            <p>از راهنمایی هوشمند و ابزارهای مدیریت محتوا تا همکاری حرفه‌ای میان وکلا؛ مسیرهای تخصصی را از اینجا آغاز کنید.</p>
          </div>
          <div className="feature-entry-grid">
            <Link className="feature-entry-card ai-entry" href="/ai-assistant"><span className="feature-entry-mark">✦</span><span className="section-kicker">AI LEGAL ASSISTANT</span><h3>دستیار هوشمند حقوقی و سایت</h3><p>راهنمای اولیه حقوقی، کمک به پیش‌نویس اسناد، خلاصه‌سازی امن، تولید مقاله و پشتیبانی از مدیریت وب‌سایت.</p><b>ورود به مرکز هوشمند <span>←</span></b></Link>
            <Link className="feature-entry-card lawyer-entry" href="/lawyer-cooperation"><span className="feature-entry-mark">§</span><span className="section-kicker">LAWYER NETWORK</span><h3>درگاه همکاری وکلا</h3><p>ارتباط وکلای سراسر کشور برای ارجاع و بررسی پرونده، همکاری محلی در خوزستان و تبادل نظر تخصصی.</p><b>ثبت درخواست همکاری <span>←</span></b></Link>
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
            <p className="connection-note">تماس کاری: <a href="tel:09169165902" dir="ltr">0916 916 5902</a> · واتساپ: <a href="https://wa.me/989169165902" target="_blank" rel="noreferrer">ارسال پیام</a></p>
            {process.env.NEXT_PUBLIC_CONTACT_EMAIL && <p className="connection-note">ایمیل: <a href={"mailto:" + process.env.NEXT_PUBLIC_CONTACT_EMAIL}>{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a></p>}
            <p className="connection-note">شبکه‌های اجتماعی پس از ثبت نشانی واقعی در تنظیمات نمایش داده می‌شوند.</p>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="container contact-layout">
          <div className="contact-copy"><span className="section-kicker">START HERE</span><h2>مسئله‌تان را<br/><em>از همین‌جا</em> مطرح کنید.</h2><p>چند مورد کوتاه را تکمیل کنید تا متن درخواست اولیه آماده شود. لطفاً در این مرحله اطلاعات محرمانه، کد ملی، شماره پرونده یا تصویر اسناد را وارد نکنید.</p><div className="contact-assurance"><span>✓</span> ثبت درخواست اولیه به معنی قبول وکالت یا تضمین نتیجه پرونده نیست.</div></div>
          <form className="request-form" onSubmit={prepareRequest}>
            <div className="form-heading"><span>فرم درخواست اولیه</span><small>حدود ۱ دقیقه</small></div>
            <label>موضوع درخواست</label>
            <select value={topic} onChange={e => setTopic(e.target.value)} required>
              <option value="موضوع پرونده را انتخاب کنید" disabled>موضوع پرونده را انتخاب کنید</option>
              {!services.some((s) => s.title === topic) && topic !== "موضوع پرونده را انتخاب کنید" && <option value={topic}>{topic}</option>}
              {services.map(s => <option key={s.n} value={s.title}>{s.title}</option>)}
              <option value="سایر موضوعات حقوقی">سایر موضوعات حقوقی</option>
            </select>
            <label>شهر محل سکونت یا رسیدگی</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="مثلاً آبادان، دزفول، اهواز..." />
            <label>شرح کوتاه مسئله <span className="optional">(اختیاری)</span></label>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows="4" placeholder="در چند جمله بگویید چه اتفاقی افتاده و پرونده در چه مرحله‌ای است..." />
            <button className="btn btn-submit" type="submit">آماده‌سازی درخواست در واتساپ <span>←</span></button>
            <small className="form-hint">با انتخاب دکمه، متن درخواست آماده می‌شود؛ ارسال نهایی را خودتان در واتساپ انجام می‌دهید.</small>
          </form>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="container faq-layout">
          <div><span className="section-kicker">GOOD TO KNOW</span><h2>پیش از شروع،<br/><em>این نکات را بدانید.</em></h2><p>پاسخ‌های کوتاه برای پرسش‌هایی که معمولاً در نخستین تماس مطرح می‌شوند.</p></div>
          <div className="faq-list">{faqs.map((f, i) => <div className={openFaq === i ? "faq-item faq-open" : "faq-item"} key={f[0]}><button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}><span>{f[0]}</span><b>{openFaq === i ? "−" : "+"}</b></button>{openFaq === i && <p>{f[1]}</p>}</div>)}</div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-main">
          <a className="brand footer-brand" href="#"><span className="brand-mark"><span>و</span></span><span className="brand-copy"><strong>مجموعه خدمات حقوقی</strong><small>اهواز · خوزستان · سراسر ایران</small></span></a>
          <p>آگاهی حقوقی، نخستین قدم برای انتخاب درست است.</p>
          <a href="#contact" className="footer-link">ثبت درخواست <span>←</span></a>
        </div>
        <div className="container footer-bottom"><span>© تمامی حقوق این وب‌سایت محفوظ است.</span><span>اطلاعات این وب‌سایت جایگزین بررسی اختصاصی پرونده و مشاوره حقوقی نیست.</span><Link href="/privacy">حریم خصوصی</Link><Link href="/articles">مقالات</Link><Link href="/lawyer-cooperation">همکاری وکلا</Link></div>
      </footer>
    </main>
  );
}
