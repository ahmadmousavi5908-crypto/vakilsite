"use client";

import { useMemo, useState } from "react";

const steps = [
  {
    id: "service",
    title: "چه خدمتی نیاز دارید؟",
    hint: "اول نوع کمکی را که لازم دارید انتخاب کنید.",
    options: [
      ["مشاوره حقوقی", "دریافت راهنمایی و شناخت مسیر قانونی", "✦"],
      ["تنظیم یا بازبینی لایحه", "لایحه دفاعیه، اعتراض یا پاسخ", "§"],
      ["دادخواست یا شکواییه", "تنظیم متن آغاز دعوا یا شکایت", "▤"],
      ["بررسی و پیگیری پرونده", "بررسی وضعیت پرونده و اقدامات بعدی", "⌕"],
      ["اظهارنامه یا اخطار رسمی", "تنظیم و بررسی اظهارنامه", "✉"],
      ["تنظیم یا بررسی قرارداد", "قراردادها و تعهدات", "◇"],
    ],
  },
  {
    id: "area",
    title: "موضوع پرونده در کدام حوزه است؟",
    hint: "نزدیک‌ترین حوزه را انتخاب کنید؛ لازم نیست عنوان حقوقی دقیق را بدانید.",
    options: [
      ["حقوقی و خصوصی", "مطالبات، تعهدات، چک و اختلافات اشخاص", "⚖"],
      ["کیفری و جزایی", "اتهام، شکایت و دفاع در برابر جرم", "◈"],
      ["خانواده", "مهریه، طلاق، نفقه و حضانت", "⌂"],
      ["ملکی و ثبتی", "مالکیت، سند، تصرف و اجاره", "▦"],
      ["تجاری و شرکت‌ها", "اختلافات شرکا، شرکت و امور تجاری", "▧"],
      ["سایر موضوعات", "موضوعی خارج از دسته‌های بالا", "＋"],
    ],
  },
  {
    id: "subject",
    title: "موضوع دقیق‌تر را مشخص کنید",
    hint: "اگر گزینه مناسب را نمی‌بینید، «سایر موارد» را انتخاب کنید.",
    options: [],
  },
  {
    id: "stage",
    title: "پرونده در چه مرحله‌ای است؟",
    hint: "این انتخاب کمک می‌کند درخواست شما دقیق‌تر بررسی شود.",
    options: [
      ["هنوز اقدام قضایی نکرده‌ام", "پیش از طرح دعوا یا شکایت", "۱"],
      ["در حال رسیدگی است", "پرونده در دادسرا یا دادگاه جریان دارد", "۲"],
      ["رأی صادر شده است", "نیاز به بررسی رأی یا اعتراض دارم", "۳"],
      ["مرحله اجراست", "اجرای حکم یا وصول محکوم‌به", "۴"],
      ["پرونده مختومه شده", "بررسی راه‌های قانونی بعدی", "۵"],
      ["مطمئن نیستم", "برای تشخیص مرحله نیاز به راهنمایی دارم", "؟"],
    ],
  },
];

const subjects = {
  "حقوقی و خصوصی": ["مطالبه وجه و طلب", "چک و سفته", "الزام به انجام تعهد", "فسخ یا ابطال قرارداد", "خسارت و مسئولیت مدنی", "ارث و تقسیم ترکه", "سایر دعاوی حقوقی"],
  "کیفری و جزایی": ["کلاهبرداری", "خیانت در امانت", "سرقت", "ضرب و جرح", "تهدید و توهین", "جعل و استفاده از سند مجعول", "جرایم رایانه‌ای", "جرایم مواد مخدر", "سایر عناوین کیفری"],
  "خانواده": ["طلاق", "مهریه", "نفقه", "حضانت و ملاقات فرزند", "تمکین", "استرداد جهیزیه", "اثبات یا نفی نسب", "سایر دعاوی خانواده"],
  "ملکی و ثبتی": ["الزام به تنظیم سند رسمی", "خلع ید و تصرف عدوانی", "تخلیه و اجاره", "سرقفلی و حق کسب", "افراز و تقسیم ملک", "ابطال سند", "پیش‌فروش و مشارکت در ساخت", "سایر دعاوی ملکی"],
  "تجاری و شرکت‌ها": ["اختلاف شرکا", "مطالبات تجاری", "ورشکستگی", "مسئولیت مدیران", "ثبت و تغییرات شرکت", "سایر موضوعات تجاری"],
  "سایر موضوعات": ["امور اداری و استخدامی", "بیمه و تأمین اجتماعی", "مالکیت فکری", "سایر موارد"],
};

export default function ServiceFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const current = steps[step];
  const options = useMemo(() => {
    if (current.id !== "subject") return current.options;
    return (subjects[answers.area] || subjects["سایر موضوعات"]).map((item) => [item, "انتخاب این موضوع", "›"]);
  }, [current.id, current.options, answers.area]);

  function choose(value) {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    if (step < steps.length - 1) setStep(step + 1);
    else emitSelection(next);
  }

  function emitSelection(selection) {
    const detail = typeof selection === "string"
      ? selection
      : [selection.service, selection.area, selection.subject, selection.stage].filter(Boolean).join(" | ");
    window.dispatchEvent(new CustomEvent("vakilsite:service-selected", { detail }));
  }

  function finish() {
    emitSelection(answers);
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  }

  const selectedCount = Object.keys(answers).length;

  return (
    <section className="section finder-section" id="service-finder">
      <div className="container">
        <div className="finder-heading">
          <span className="section-kicker">SMART SERVICE GUIDE</span>
          <h2>برای راهنمایی بهتر، <em>از اینجا شروع کنید.</em></h2>
          <p>در چند انتخاب کوتاه، نوع درخواست و موضوع پرونده‌تان را مشخص کنید.</p>
        </div>
        <div className="finder-shell">
          <div className="finder-progress" aria-label="مراحل انتخاب خدمت">
            {steps.map((item, index) => (
              <div className={index <= step ? "finder-progress-item is-current" : "finder-progress-item"} key={item.id}>
                <span>{index + 1}</span><small>{["نوع خدمت", "حوزه پرونده", "موضوع دقیق", "مرحله پرونده"][index]}</small>
              </div>
            ))}
          </div>
          <div className="finder-content">
            <div className="finder-step-meta"><span>مرحله {step + 1} از ۴</span><span>{selectedCount} انتخاب ثبت شده</span></div>
            <h3>{current.title}</h3>
            <p className="finder-hint">{current.hint}</p>
            <div className="finder-options">
              {options.map(([title, desc, symbol]) => (
                <button className={answers[current.id] === title ? "finder-option selected" : "finder-option"} type="button" key={title} onClick={() => choose(title)}>
                  <span className="finder-option-symbol">{symbol}</span>
                  <span className="finder-option-copy"><b>{title}</b><small>{desc}</small></span>
                  <span className="finder-option-arrow">←</span>
                </button>
              ))}
            </div>
            <div className="finder-controls">
              <button type="button" className="finder-back" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>مرحله قبل</button>
              {step === steps.length - 1 && <button type="button" className="finder-finish" onClick={finish}>تکمیل انتخاب و رفتن به فرم <span>←</span></button>}
              {step > 0 && <button type="button" className="finder-reset" onClick={() => { setAnswers({}); setStep(0); }}>شروع دوباره</button>}
            </div>
          </div>
          <aside className="finder-summary">
            <div className="finder-summary-icon">§</div>
            <b>خلاصه انتخاب شما</b>
            <p>انتخاب‌ها به فرم درخواست منتقل می‌شوند تا موضوع اولیه روشن‌تر باشد.</p>
            <ul>
              {steps.slice(0, 3).map((item) => <li key={item.id}><span>{item.title}</span><strong>{answers[item.id] || "انتخاب نشده"}</strong></li>)}
              <li><span>مرحله پرونده</span><strong>{answers.stage || "انتخاب نشده"}</strong></li>
            </ul>
            <small>این راهنما تشخیص حقوقی یا پذیرش قطعی پرونده نیست؛ بررسی نهایی پس از دریافت اطلاعات لازم انجام می‌شود.</small>
          </aside>
        </div>
      </div>
    </section>
  );
}
