"use client";

import { useState } from "react";
import Link from "next/link";

const tools = [
  ["§", "راهنمای اولیه حقوقی", "پرسش‌های عمومی درباره قوانین ایران، مفاهیم حقوقی و مسیرهای معمول پیگیری؛ همراه با ارجاع به بررسی وکیل در موضوعات پرونده‌ای."],
  ["▤", "آماده‌سازی و تنظیم پیش‌نویس", "کمک به تهیه چک‌لیست مدارک، ساختار اولیه دادخواست، لایحه، اظهارنامه و قرارداد؛ پیش‌نویس نهایی باید توسط وکیل بازبینی شود."],
  ["⌕", "تحلیل و خلاصه‌سازی اسناد", "در نسخه امن و پس از راه‌اندازی، استخراج تاریخ‌ها، اشخاص، تعهدات و نکات قابل بررسی از اسناد بارگذاری‌شده."],
  ["✦", "دستیار مدیریت وب‌سایت", "پیشنهاد مقاله، ویرایش محتوا، ساختاردهی صفحات، بررسی عنوان و توضیحات سئو و تهیه گزارش عملکرد سایت."],
];

export default function AiAssistantPage() {
  const [question, setQuestion] = useState("");
  const [kind, setKind] = useState("پرسش عمومی حقوقی");
  function prepare(e) {
    e.preventDefault();
    const timestamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date());
    const message = ["درخواست استفاده از دستیار هوشمند حقوقی", "زمان تهیه درخواست (به وقت ایران): " + timestamp, "نوع درخواست: " + kind, "پرسش: " + question, "لطفاً برای بررسی و راهنمایی اولیه تماس بگیرید."].join("\n");
    const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "989169165902").replace(/\D/g, "");
    if (phone) window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
    else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(message).then(() => window.alert("متن درخواست کپی شد؛ شماره واتساپ دفتر هنوز تنظیم نشده است.")).catch(() => window.prompt("متن درخواست را کپی کنید:", message));
    else window.prompt("متن درخواست را کپی کنید:", message);
  }
  return <main className="feature-page" dir="rtl">
    <header className="feature-nav"><Link href="/">← بازگشت به صفحه اصلی</Link><span>مرکز خدمات هوشمند</span></header>
    <section className="feature-hero ai-hero"><div className="feature-container">
      <span className="section-kicker">AI-POWERED LEGAL WORKSPACE</span>
      <h1>هوش مصنوعی، در خدمت <em>آگاهی و دقت حقوقی</em></h1>
      <p>یک فضای هوشمند برای شناخت اولیه مسائل حقوقی، آماده‌سازی پیش‌نویس‌ها و کمک به مدیریت حرفه‌ای وب‌سایت؛ با نظارت و بازبینی انسانی در تصمیم‌های مهم.</p>
      <div className="feature-hero-actions"><a href="#ai-tools" className="feature-primary">آشنایی با قابلیت‌ها ↓</a><a href="#ai-request" className="feature-secondary">ثبت پرسش اولیه</a></div>
    </div></section>
    <section className="feature-container feature-section" id="ai-tools">
      <div className="feature-heading"><span className="section-kicker">SMART WORKFLOW</span><h2>چه کارهایی را پوشش می‌دهد؟</h2><p>قابلیت‌ها به‌صورت مرحله‌ای فعال می‌شوند تا امنیت اطلاعات و کیفیت پاسخ قربانی عجله نشود.</p></div>
      <div className="feature-tool-grid">{tools.map((t,i)=><article className="feature-tool-card" key={t[1]}><span className="feature-tool-icon">{t[0]}</span><small>۰{i+1}</small><h3>{t[1]}</h3><p>{t[2]}</p></article>)}</div>
    </section>
    <section className="ai-workflow"><div className="feature-container"><div className="feature-heading"><span className="section-kicker">HOW IT WORKS</span><h2>از پرسش تا پاسخ قابل اتکا</h2></div><div className="ai-steps"><div><b>۱</b><h3>تعریف مسئله</h3><p>موضوع و هدف خود را بدون درج اطلاعات محرمانه مشخص کنید.</p></div><div><b>۲</b><h3>تحلیل و منبع‌یابی</h3><p>سامانه در نسخه نهایی باید پاسخ را به قوانین و منابع معتبر ایران متصل کند.</p></div><div><b>۳</b><h3>بازبینی انسانی</h3><p>موضوعات اختصاصی و حساس پیش از هر اقدام، توسط وکیل بررسی می‌شوند.</p></div></div></div></section>
    <section className="feature-container feature-section" id="ai-request"><div className="ai-request-layout"><div><span className="section-kicker">ASK A QUESTION</span><h2>پرسش اولیه خود را ثبت کنید.</h2><p>این فرم فعلاً درخواست را برای ارتباط با دفتر آماده می‌کند و پاسخ خودکار هوش مصنوعی نیست. اتصال مدل هوش مصنوعی و پایگاه دانش حقوقی پس از راه‌اندازی امن سرور انجام خواهد شد.</p><div className="feature-warning">اطلاعات هویتی، شماره پرونده، نشانی، رمزها یا تصویر اسناد محرمانه را در این فرم وارد نکنید.</div></div>
    <form className="feature-form" onSubmit={prepare}><label>نوع درخواست</label><select value={kind} onChange={e=>setKind(e.target.value)}><option>پرسش عمومی حقوقی</option><option>آماده‌سازی پیش‌نویس</option><option>راهنمایی درباره خدمات سایت</option><option>پیشنهاد یا گزارش مشکل سایت</option></select><label>پرسش یا توضیح کوتاه</label><textarea required rows="5" maxLength="1200" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="موضوع را بدون ذکر اطلاعات محرمانه توضیح دهید..." /><button className="feature-primary" type="submit">آماده‌سازی درخواست ←</button></form></div></section>
    <footer className="feature-footer"><Link href="/">صفحه اصلی</Link><span>اطلاعات عمومی هوش مصنوعی جایگزین مشاوره اختصاصی و بررسی وکیل نیست.</span></footer>
  </main>;
}
