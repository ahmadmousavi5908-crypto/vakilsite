"use client";

import { useMemo, useState } from "react";
import styles from "./PublicIntake.module.css";

const configuredPhone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "989169165902").replace(/\\D/g, "");
const OFFICE_WHATSAPP_NUMBER = configuredPhone.startsWith("00")
  ? configuredPhone.slice(2)
  : configuredPhone.startsWith("0")
    ? `98${configuredPhone.slice(1)}`
    : configuredPhone;
const OFFICE_LOCAL_NUMBER = OFFICE_WHATSAPP_NUMBER.startsWith("98")
  ? `0${OFFICE_WHATSAPP_NUMBER.slice(2)}`
  : OFFICE_WHATSAPP_NUMBER;
const OFFICE_DISPLAY_NUMBER = OFFICE_LOCAL_NUMBER.replace(/\\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

const topics = [
  { value: "family", label: "خانواده و امور زوجین" },
  { value: "property", label: "ملکی و ثبتی" },
  { value: "criminal", label: "کیفری" },
  { value: "contracts", label: "قرارداد و مطالبه وجه" },
  { value: "labor", label: "کار و تأمین اجتماعی" },
  { value: "other", label: "سایر موضوعات" },
];

const stages = [
  "هنوز اقدامی انجام نداده‌ام",
  "در حال جمع‌آوری مدارک یا پیگیری اولیه هستم",
  "اظهارنامه، شکایت یا دادخواست ثبت شده است",
  "پرونده در دادسرا، دادگاه یا اجرای احکام است",
  "رأی صادر شده یا موضوع در مرحله اعتراض/اجراست",
];

const guidance = {
  family: "برای بررسی دقیق، وضعیت رابطه، خواسته اصلی، وجود فرزند و مرحله فعلی موضوع باید توسط وکیل شنیده شود. فعلاً فقط مدارک مرتبط را نگه دارید و از ارسال عمومی اسناد هویتی خودداری کنید.",
  property: "در موضوعات ملکی، نوع سند، سابقه تصرف، قراردادها و اقدامات ثبتی می‌توانند مسیر بررسی را تغییر دهند. بررسی اصل مدارک و جزئیات ملک را به جلسه با وکیل موکول کنید.",
  criminal: "در موضوعات کیفری، عنوان اتهام، نقش اشخاص، ابلاغ‌ها و مرحله رسیدگی اهمیت دارند. اگر احضاریه، بازداشت یا مهلت نزدیک وجود دارد، برای تماس مستقیم با دفتر منتظر تکمیل فرم نمانید.",
  contracts: "در اختلافات قراردادی، متن قرارداد، تعهدات، رسیدها و مکاتبات معمولاً تعیین‌کننده‌اند. از حذف یا تغییر پیام‌ها و اسناد مرتبط خودداری کنید و اصل مدارک را حفظ کنید.",
  labor: "برای بررسی موضوعات کار و تأمین اجتماعی، نوع رابطه کاری، قرارداد، سوابق پرداخت و تصمیم یا ابلاغ مرجع مربوط اهمیت دارد. مدارک را نگه دارید تا در بررسی اختصاصی ارزیابی شوند.",
  other: "برای تعیین مسیر مناسب، ابتدا باید ماهیت اختلاف، اشخاص درگیر و مرحله فعلی روشن شود. شرح مختصر موضوع برای هماهنگی اولیه کافی است.",
};

export default function PublicIntake() {
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState("");
  const [stage, setStage] = useState("");
  const [urgency, setUrgency] = useState("");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");
  const [style, setStyle] = useState("مختصر و مستقیم");
  const [confirmed, setConfirmed] = useState(false);
  const [companionName, setCompanionName] = useState("");
  const [companionCity, setCompanionCity] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const selectedTopic = topics.find((item) => item.value === topic);
  const isUrgent = urgency === "مهلت یا جلسه نزدیک دارم" || urgency === "موضوع فوری مانند بازداشت یا خطر فوری وجود دارد" || urgency === "از مهلت قانونی مطمئن نیستم";

  const summary = useMemo(() => [
    "درخواست بررسی اولیه برای دفتر وکالت سید احمد موسوی",
    "موضوع: " + (selectedTopic?.label || "اعلام نشده"),
    "مرحله: " + (stage || "اعلام نشده"),
    "فوریت: " + (urgency || "اعلام نشده"),
    "شهر: " + (city.trim() || "اعلام نشده"),
    "ترجیح ارتباط: " + style,
    "شرح کوتاه: " + (details.trim() || "در انتظار توضیح در تماس"),
    "این پیام درخواست بررسی اولیه است و به‌معنای قبول وکالت یا ایجاد رابطه وکالت نیست.",
  ].join("\n"), [selectedTopic, stage, urgency, city, style, details]);

  function next() {
    if (step === 0 && !topic) return;
    if (step === 1 && (!stage || !urgency)) return;
    setStep((current) => Math.min(current + 1, 2));
  }

  function openWhatsApp() {
    const phone = OFFICE_WHATSAPP_NUMBER;
    if (!phone || !confirmed) return;
    const text = isUrgent
      ? "توجه: مراجعه‌کننده اعلام کرده موضوع فوری یا دارای مهلت نزدیک است. لطفاً فوریت را در تماس مستقیم بررسی کنید.\n\n" + summary
      : summary;
    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
  }

  async function copyOfficeNumber() {
    const officeNumber = OFFICE_LOCAL_NUMBER;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(officeNumber);
      } else {
        const field = document.createElement("textarea");
        field.value = officeNumber;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(field);
        if (!copied) throw new Error("Clipboard copy failed");
      }
      setCopyStatus("شماره دفتر کپی شد؛ می‌توانید آن را در مخاطبین ذخیره کنید.");
    } catch {
      setCopyStatus("کپی خودکار انجام نشد؛ شماره ۰۹۱۶۹۱۶۵۹۰۲ را دستی کپی کنید.");
    }
  }

  const companionMessage = [
    "سلام، مایلم از نکته‌های حقوقی و خبرهای وضعیت واتساپ دفتر وکیل موسوی باخبر شوم.",
    "نام و نام خانوادگی: " + (companionName.trim() || "اعلام نشده"),
    "شهر: " + (companionCity.trim() || "اعلام نشده"),
    "کد معرفی: MAVIS-WEB",
  ].join("\n");

  const companionWhatsAppUrl =
    "https://wa.me/" + OFFICE_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(companionMessage);

  return (
    <>
      <section className={styles.companion} aria-labelledby="mavis-companion-title">
        <div className={styles.companionShell}>
          <div className={styles.companionContent}>
            <span className={styles.companionKicker}>همراهی با دفتر وکیل موسوی</span>
            <h2 id="mavis-companion-title">🌿 همراهان وکیل موسوی</h2>
            <p className={styles.companionSubtitle}>خوشحال می‌شویم با ما همراه باشید.</p>
            <p className={styles.companionDescription}>
              دوست دارید از نکته‌های مهم حقوقی و خبرهایی که ممکن است به درد زندگی روزمره‌تان بخورد باخبر شوید؟
              از موضوعات خانواده، مهریه و طلاق گرفته تا قراردادها و تغییرات مهم قوانین؛
              مطالب را کوتاه و ساده در وضعیت واتساپ با شما به اشتراک می‌گذاریم.
            </p>
            <div className={styles.companionNumber}>
              <span>📱 برای دیدن مطالب، شماره دفتر را ذخیره کنید:</span>
              <strong dir="ltr">{OFFICE_DISPLAY_NUMBER}</strong>
              <button type="button" className={styles.copyNumber} onClick={copyOfficeNumber}>کپی شماره</button>
              <p className={styles.copyFeedback} role="status" aria-live="polite">{copyStatus}</p>
            </div>
          </div>
          <div className={styles.companionForm}>
            <h3>ارتباط با واتساپ دفتر</h3>
            <p>نام و شهر اختیاری است؛ شماره شما پس از ارسال پیام در واتساپ مشخص می‌شود.</p>
            <label htmlFor="mavis-companion-name">نام و نام خانوادگی (اختیاری)</label>
            <input id="mavis-companion-name" className={styles.companionInput} value={companionName} onChange={(event) => setCompanionName(event.target.value)} maxLength={80} autoComplete="name" placeholder="نام شما" />
            <label htmlFor="mavis-companion-city">شهر محل سکونت (اختیاری)</label>
            <input id="mavis-companion-city" className={styles.companionInput} value={companionCity} onChange={(event) => setCompanionCity(event.target.value)} maxLength={60} autoComplete="address-level2" placeholder="مثلاً اهواز" />
            <a className={styles.whatsappButton} href={companionWhatsAppUrl} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">◉</span> ارسال پیام به واتساپ دفتر
            </a>
            <small className={styles.companionNote}>واتساپ با پیام آماده باز می‌شود؛ ارسال پیام با تأیید خود شما انجام خواهد شد.</small>
          </div>
        </div>
      </section>
      <section className={styles.section} id="ai-request" aria-labelledby="mavis-intake-title">
      <div className={styles.shell}>
        <div className={styles.intro}>
          <span className={styles.kicker}>MAVIS · مسیر ارتباط با دفتر</span>
          <h2 id="mavis-intake-title">اول مسئله‌ات را می‌فهمیم، بعد مسیر بررسی را مشخص می‌کنیم.</h2>
          <p>چند پرسش کوتاه برای شناخت موضوع و هماهنگی با دفتر. این مرحله جای بررسی پرونده توسط وکیل را نمی‌گیرد و پاسخ اختصاصی حقوقی صادر نمی‌کند.</p>
          <div className={styles.trustNote}>اطلاعات این فرم در سایت ذخیره نمی‌شود. متن نهایی فقط پس از انتخاب شما در واتساپ باز می‌شود؛ ارسال آن نیز با تأیید خودتان انجام خواهد شد.</div>
          <div className={styles.steps} aria-label="مراحل فرم">
            {["موضوع", "وضعیت", "هماهنگی"].map((label, index) => (
              <div key={label} className={index <= step ? styles.activeStep : styles.step}>
                <span>{index + 1}</span>{label}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          {step === 0 && (
            <fieldset className={styles.fieldset}>
              <legend>موضوع اصلی درخواست شما چیست؟</legend>
              <p className={styles.hint}>نزدیک‌ترین گزینه را انتخاب کنید؛ تشخیص نهایی پس از شنیدن جزئیات انجام می‌شود.</p>
              <div className={styles.options}>
                {topics.map((item) => (
                  <button type="button" key={item.value} onClick={() => setTopic(item.value)} className={topic === item.value ? styles.selected : styles.option} aria-pressed={topic === item.value}>
                    <span>{item.label}</span><span aria-hidden="true">{topic === item.value ? "✓" : "＋"}</span>
                  </button>
                ))}
              </div>
              <button type="button" className={styles.primary} disabled={!topic} onClick={next}>ادامه <span aria-hidden="true">←</span></button>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className={styles.fieldset}>
              <legend>موضوع در چه مرحله‌ای است؟</legend>
              <label className={styles.label} htmlFor="mavis-stage">وضعیت فعلی</label>
              <select id="mavis-stage" className={styles.select} value={stage} onChange={(event) => setStage(event.target.value)}>
                <option value="">انتخاب کنید</option>
                {stages.map((item) => <option key={item}>{item}</option>)}
              </select>
              <label className={styles.label} htmlFor="mavis-urgency">آیا مهلت یا فوریت خاصی وجود دارد؟</label>
              <select id="mavis-urgency" className={styles.select} value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                <option value="">انتخاب کنید</option>
                <option>فوریت خاصی ندارم</option>
                <option>مهلت یا جلسه نزدیک دارم</option>
                <option>موضوع فوری مانند بازداشت یا خطر فوری وجود دارد</option>
                <option>از مهلت قانونی مطمئن نیستم</option>
              </select>
              {isUrgent && <div className={styles.urgent} role="alert">اگر خطر فوری، بازداشت، مهلت نزدیک یا تردید درباره مهلت قانونی وجود دارد، منتظر پاسخ فرم نمانید و مستقیماً با دفتر یا مرجع اضطراری صالح تماس بگیرید. <a href={"tel:+" + OFFICE_WHATSAPP_NUMBER}>تماس مستقیم با دفتر: {OFFICE_DISPLAY_NUMBER}</a></div>}
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => setStep(0)}>بازگشت</button>
                <button type="button" className={styles.primary} disabled={!stage || !urgency} onClick={next}>ادامه <span aria-hidden="true">←</span></button>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <div className={styles.fieldset}>
              <h3 className={styles.legend}>برای هماهنگی با دفتر</h3>
              <label className={styles.label} htmlFor="mavis-city">شهر محل سکونت یا رسیدگی (اختیاری)</label>
              <input id="mavis-city" className={styles.input} value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} placeholder="مثلاً اهواز، آبادان یا تهران" />
              <label className={styles.label} htmlFor="mavis-details">شرح بسیار کوتاه موضوع (اختیاری)</label>
              <textarea id="mavis-details" className={styles.textarea} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={3} placeholder="بدون نام اشخاص، شماره پرونده، کد ملی یا جزئیات محرمانه..." />
              <label className={styles.label} htmlFor="mavis-style">ترجیح می‌دهید پاسخ اولیه چگونه باشد؟</label>
              <select id="mavis-style" className={styles.select} value={style} onChange={(event) => setStyle(event.target.value)}>
                <option>مختصر و مستقیم</option>
                <option>با توضیح مرحله‌به‌مرحله</option>
              </select>
              <div className={styles.guidance} aria-live="polite">
                <strong>نکته مرتبط با موضوع انتخابی</strong>
                <p>{guidance[topic]}</p>
                <small>این فقط راهنمای عمومی برای آماده‌سازی گفت‌وگو است، نه تحلیل یا نظر حقوقی درباره پرونده شما.</small>
              </div>
              <label className={styles.consent}>
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span>می‌دانم این فرم مشاوره حقوقی اختصاصی نیست و با انتخاب دکمه، متن درخواست برای بررسی توسط خودم در واتساپ باز می‌شود.</span>
              </label>
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => setStep(1)}>بازگشت</button>
                <button type="button" className={styles.primary} disabled={!confirmed} onClick={openWhatsApp}>آماده‌سازی درخواست برای دفتر <span aria-hidden="true">←</span></button>
              </div>
              <p className={styles.footnote}>اطلاعات حساس، اسناد، رمزها و مشخصات طرف مقابل را در فرم عمومی ننویسید. پذیرش پرونده و تعیین حدود خدمات پس از بررسی و توافق جداگانه انجام می‌شود.</p>
            </div>
          )}
        </div>
      </div>
      </section>
    </>
  );
}
