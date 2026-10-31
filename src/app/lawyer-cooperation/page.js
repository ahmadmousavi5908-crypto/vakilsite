"use client";

import { useState } from "react";
import Link from "next/link";

const initialForm = {
  name: "", bar: "", city: "", phone: "",
  field: "حقوقی", service: "ارجاع و بررسی پرونده",
  caseCity: "اهواز", stage: "در حال رسیدگی", summary: "",
};

export default function LawyerCooperationPage() {
  const [form, setForm] = useState(initialForm);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const timestamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran",
    }).format(new Date());
    const message = [
      "درخواست همکاری حرفه‌ای وکلا",
      "زمان تهیه درخواست (به وقت ایران): " + timestamp,
      "نام و نام خانوادگی: " + form.name,
      "استان محل فعالیت: " + form.bar,
      "شهر محل فعالیت: " + form.city,
      "راه ارتباطی: " + form.phone,
      "حوزه پرونده: " + form.field,
      "نوع همکاری: " + form.service,
      "شهر محل پرونده: " + form.caseCity,
      "مرحله پرونده: " + form.stage,
      "خلاصه غیرمحرمانه: " + (form.summary.trim() || "اعلام نشده"),
    ].join("\n");

    const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "989169165902").replace(/\D/g, "");
    if (phone) {
      window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message)
        .then(() => window.alert("متن درخواست کپی شد؛ شماره واتساپ دفتر هنوز تنظیم نشده است."))
        .catch(() => window.prompt("متن درخواست را کپی کنید:", message));
      return;
    }
    window.prompt("متن درخواست را کپی کنید:", message);
  }

  return (
    <main className="feature-page cooperation-page" dir="rtl">
      <header className="feature-nav">
        <Link href="/">بازگشت به صفحه اصلی ←</Link>
        <span>شبکه همکاری حرفه‌ای</span>
      </header>

      <section className="feature-hero coop-hero">
        <div className="feature-container">
          <span className="section-kicker">LAWYER-TO-LAWYER NETWORK</span>
          <h1>همکاری وکلا؛ <em>ارتباط حرفه‌ای فراتر از مرز استان‌ها</em></h1>
          <p>اگر وکیل دادگستری هستید و برای پرونده‌ای در خوزستان به همکاری محلی، بررسی موضوع یا هماهنگی حرفه‌ای نیاز دارید، درخواست همکاری خود را ثبت کنید.</p>
          <div className="feature-hero-actions">
            <a href="#cooperation-form" className="feature-primary">ثبت درخواست همکاری ↓</a>
            <a href="#cooperation-process" className="feature-secondary">آشنایی با روند همکاری</a>
          </div>
        </div>
      </section>

      <section className="feature-container feature-section" id="cooperation-process">
        <div className="feature-heading">
          <span className="section-kicker">PROFESSIONAL COLLABORATION</span>
          <h2>زمینه‌های قابل بررسی برای همکاری</h2>
          <p>نوع همکاری و امکان پذیرش هر درخواست پس از بررسی تخصص، تعارض منافع، حدود اختیار و شرایط پرونده مشخص می‌شود.</p>
        </div>
        <div className="feature-tool-grid">
          <article className="feature-tool-card">
            <span className="feature-tool-icon" aria-hidden="true">⌖</span>
            <h3>همکاری محلی در خوزستان</h3>
            <p>هماهنگی برای اقدامات و پیگیری‌های قابل انجام در اهواز و سایر شهرهای استان، در حدود مقررات و توافق طرفین.</p>
          </article>
          <article className="feature-tool-card">
            <span className="feature-tool-icon" aria-hidden="true">§</span>
            <h3>بررسی و تبادل نظر تخصصی</h3>
            <p>مطالعه موضوع، بررسی اسناد از مسیر امن و تبادل نظر حرفه‌ای درباره مسائل حقوقی یا کیفری.</p>
          </article>
          <article className="feature-tool-card">
            <span className="feature-tool-icon" aria-hidden="true">▤</span>
            <h3>تنظیم و بازبینی اسناد</h3>
            <p>همکاری در تهیه یا بازبینی پیش‌نویس لوایح، دادخواست‌ها، قراردادها و مکاتبات حقوقی.</p>
          </article>
        </div>
      </section>

      <section className="ai-workflow" id="cooperation-process-steps">
        <div className="feature-container">
          <div className="feature-heading">
            <span className="section-kicker">CLEAR PROCESS</span>
            <h2>روند پیشنهادی همکاری</h2>
          </div>
          <div className="ai-steps">
            <div><b>۱</b><h3>ثبت درخواست اولیه</h3><p>اطلاعات حرفه‌ای و خلاصه غیرمحرمانه پرونده را ثبت کنید.</p></div>
            <div><b>۲</b><h3>بررسی و هماهنگی</h3><p>امکان همکاری، تعارض منافع، شهر و نوع اقدام بررسی می‌شود.</p></div>
            <div><b>۳</b><h3>توافق و تبادل امن اطلاعات</h3><p>پس از توافق، مدارک لازم از مسیر امن تبادل و حدود مسئولیت به‌صورت مکتوب مشخص می‌شود.</p></div>
          </div>
        </div>
      </section>

      <section className="feature-container feature-section" id="cooperation-form">
        <div className="feature-heading">
          <span className="section-kicker">REQUEST COLLABORATION</span>
          <h2>فرم درخواست همکاری وکلا</h2>
          <p>این فرم ویژه وکلای متقاضی همکاری است و برای ثبت درخواست عمومی موکلان طراحی نشده است.</p>
        </div>

        <form className="feature-form cooperation-form" onSubmit={submit}>
          <div className="feature-form-grid">
            <div>
              <label htmlFor="coop-name">نام و نام خانوادگی وکیل</label>
              <input id="coop-name" name="name" autoComplete="name" required value={form.name} onChange={change} placeholder="نام کامل" />
            </div>
            <div>
              <label htmlFor="coop-bar">استان محل فعالیت</label>
              <input id="coop-bar" name="bar" required value={form.bar} onChange={change} placeholder="برای مثال: تهران" />
            </div>
            <div>
              <label htmlFor="coop-city">شهر محل فعالیت</label>
              <input id="coop-city" name="city" required value={form.city} onChange={change} placeholder="برای مثال: تهران" />
            </div>
            <div>
              <label htmlFor="coop-phone">شماره تماس حرفه‌ای</label>
              <input id="coop-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required value={form.phone} onChange={change} placeholder="09xxxxxxxxx" />
            </div>
            <div>
              <label htmlFor="coop-field">حوزه پرونده</label>
              <select id="coop-field" name="field" value={form.field} onChange={change}>
                <option>حقوقی</option><option>کیفری</option><option>خانواده</option>
                <option>ملکی و ثبتی</option><option>تجاری و شرکت‌ها</option><option>سایر</option>
              </select>
            </div>
            <div>
              <label htmlFor="coop-service">نوع همکاری موردنظر</label>
              <select id="coop-service" name="service" value={form.service} onChange={change}>
                <option>ارجاع و بررسی پرونده</option>
                <option>همکاری و پیگیری محلی در خوزستان</option>
                <option>حضور و اقدام در مرجع قضایی</option>
                <option>تنظیم یا بازبینی لایحه و اسناد</option>
                <option>مشاوره و تبادل نظر تخصصی</option>
                <option>سایر همکاری‌ها</option>
              </select>
            </div>
            <div>
              <label htmlFor="coop-case-city">شهر محل پرونده</label>
              <input id="coop-case-city" name="caseCity" value={form.caseCity} onChange={change} placeholder="برای مثال: اهواز یا آبادان" />
            </div>
            <div>
              <label htmlFor="coop-stage">مرحله فعلی پرونده</label>
              <select id="coop-stage" name="stage" value={form.stage} onChange={change}>
                <option>در حال رسیدگی</option><option>تحقیقات مقدماتی</option>
                <option>مرحله بدوی</option><option>مرحله تجدیدنظر</option>
                <option>اجرای حکم</option><option>هنوز طرح نشده</option><option>نامشخص</option>
              </select>
            </div>
          </div>

          <label htmlFor="coop-summary">خلاصه غیرمحرمانه موضوع</label>
          <textarea id="coop-summary" name="summary" rows="4" maxLength="1500" value={form.summary} onChange={change} placeholder="فقط موضوع کلی و نوع اقدام موردنیاز را بنویسید. نام موکل، شماره پرونده و جزئیات محرمانه را درج نکنید." />
          <div className="feature-warning">با ثبت این فرم، رابطه وکالتی یا تعهدی برای پذیرش پرونده ایجاد نمی‌شود. پیش از تبادل اطلاعات موکل، احراز هویت حرفه‌ای، بررسی تعارض منافع و توافق درباره حدود مسئولیت و حق‌الزحمه ضروری است.</div>
          <button className="feature-primary" type="submit">آماده‌سازی درخواست همکاری ←</button>
          <small className="form-hint">با انتخاب این دکمه، متن درخواست آماده می‌شود؛ ارسال نهایی را خودتان در واتساپ انجام می‌دهید. لطفاً اطلاعات محرمانه موکل را وارد نکنید.</small>
        </form>
      </section>

      <footer className="feature-footer">
        <Link href="/">صفحه اصلی</Link>
        <span>درخواست‌ها پس از بررسی و هماهنگی، مبنای تصمیم درباره همکاری خواهند بود.</span>
      </footer>
    </main>
  );
}
