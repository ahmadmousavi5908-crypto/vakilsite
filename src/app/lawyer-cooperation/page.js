"use client";

import { useState } from "react";

export default function LawyerCooperationPage() {
  const [form,setForm]=useState({name:"",bar:"",city:"",phone:"",field:"حقوقی",service:"ارجاع و بررسی پرونده",caseCity:"اهواز",stage:"در حال رسیدگی",summary:""});
  function change(e){setForm({...form,[e.target.name]:e.target.value});}
  function submit(e){
    e.preventDefault();
    const timestamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date());
    const message=["درخواست همکاری حرفه‌ای وکلا", "زمان تهیه درخواست (به وقت ایران): "+timestamp, "نام و نام خانوادگی: "+form.name, "استان محل فعالیت: "+form.bar, "شهر: "+form.city, "راه ارتباطی: "+form.phone, "حوزه پرونده: "+form.field, "نوع همکاری: "+form.service, "شهر محل پرونده: "+form.caseCity, "مرحله پرونده: "+form.stage, "خلاصه غیرمحرمانه: "+form.summary].join("\n");
    const phone=(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER||"989169165902").replace(/\D/g,"");
    if(phone) window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
    else if(navigator.clipboard?.writeText) navigator.clipboard.writeText(message).then(()=>window.alert("متن درخواست کپی شد؛ شماره واتساپ دفتر هنوز تنظیم نشده است.")).catch(()=>window.prompt("متن درخواست را کپی کنید:",message));
    else window.prompt("متن درخواست را کپی کنید:",message);
  }
  return <main className="feature-page" dir="rtl">
    <header className="feature-nav"><a href="/">← بازگشت به صفحه اصلی</a><span>شبکه همکاری حرفه‌ای</span></header>
    <section className="feature-hero coop-hero"><div className="feature-container"><span className="section-kicker">LAWYER-TO-LAWYER NETWORK</span><h1>همکاری وکلا؛ <em>ارتباط حرفه‌ای فراتر از مرز استان‌ها</em></h1><p>اگر وکیل دادگستری هستید و برای پرونده‌ای در خوزستان به همکاری محلی، بررسی موضوع یا هماهنگی حرفه‌ای نیاز دارید، درخواست همکاری خود را ثبت کنید.</p><div className="feature-hero-actions"><a href="#cooperation-form" className="feature-primary">ثبت درخواست همکاری ↓</a><a href="#cooperation-process" className="feature-secondary">روند همکاری</a></div></div></section>
    <section className="feature-container feature-section" id="cooperation-process"><div className="feature-heading"><span className="section-kicker">PROFESSIONAL COLLABORATION</span><h2>زمینه‌های قابل بررسی برای همکاری</h2><p>نوع همکاری و امکان پذیرش هر درخواست پس از بررسی تخصص، تعارض منافع، حدود اختیار و شرایط پرونده مشخص می‌شود.</p></div>
    <div className="feature-tool-grid"><article className="feature-tool-card"><span className="feature-tool-icon">⌖</span><h3>همکاری محلی در خوزستان</h3><p>هماهنگی برای اقدامات و پیگیری‌های قابل انجام در اهواز و سایر شهرهای استان، در حدود مقررات و توافق طرفین.</p></article><article className="feature-tool-card"><span className="feature-tool-icon">§</span><h3>بررسی و تبادل نظر تخصصی</h3><p>مطالعه موضوع، بررسی اسناد از مسیر امن و تبادل نظر حرفه‌ای درباره مسائل حقوقی یا کیفری.</p></article><article className="feature-tool-card"><span className="feature-tool-icon">▤</span><h3>تنظیم و بازبینی اسناد</h3><p>همکاری در تهیه یا بازبینی پیش‌نویس لوایح، دادخواست‌ها، قراردادها و مکاتبات حقوقی.</p></article></div></section>
    <section className="ai-workflow"><div className="feature-container"><div className="feature-heading"><span className="section-kicker">CLEAR PROCESS</span><h2>روند پیشنهادی همکاری</h2></div><div className="ai-steps"><div><b>۱</b><h3>ثبت درخواست اولیه</h3><p>اطلاعات حرفه‌ای و خلاصه غیرمحرمانه پرونده را ثبت کنید.</p></div><div><b>۲</b><h3>بررسی و هماهنگی</h3><p>امکان همکاری، تعارض منافع، شهر و نوع اقدام بررسی می‌شود.</p></div><div><b>۳</b><h3>توافق و ارجاع امن</h3><p>پس از توافق، مدارک و اطلاعات لازم از مسیر امن تبادل و حدود مسئولیت مکتوب می‌شود.</p></div></div></div></section>
    <section className="feature-container feature-section" id="cooperation-form"><div className="feature-heading"><span className="section-kicker">REQUEST COLLABORATION</span><h2>فرم درخواست همکاری وکلا</h2><p>این فرم برای وکلای متقاضی همکاری است، نه ثبت درخواست عمومی موکلان.</p></div>
    <form className="feature-form cooperation-form" onSubmit={submit}>
      <div className="feature-form-grid">
        <div><label>نام و نام خانوادگی وکیل</label><input name="name" required value={form.name} onChange={change} placeholder="نام کامل" /></div>
        <div><label>استان محل فعالیت</label><input name="bar" required value={form.bar} onChange={change} placeholder="مثلاً تهران" /></div>
        <div><label>شهر محل فعالیت</label><input name="city" required value={form.city} onChange={change} placeholder="مثلاً تهران" /></div>
        <div><label>شماره تماس حرفه‌ای</label><input name="phone" required value={form.phone} onChange={change} placeholder="شماره تماس" /></div>
        <div><label>حوزه پرونده</label><select name="field" value={form.field} onChange={change}><option>حقوقی</option><option>کیفری</option><option>خانواده</option><option>ملکی و ثبتی</option><option>تجاری و شرکت‌ها</option><option>سایر</option></select></div>
        <div><label>نوع همکاری موردنظر</label><select name="service" value={form.service} onChange={change}><option>ارجاع و بررسی پرونده</option><option>همکاری و پیگیری محلی در خوزستان</option><option>حضور و اقدام در مرجع قضایی</option><option>تنظیم یا بازبینی لایحه و اسناد</option><option>مشاوره و تبادل نظر تخصصی</option><option>سایر همکاری‌ها</option></select></div>
        <div><label>شهر محل پرونده</label><input name="caseCity" value={form.caseCity} onChange={change} placeholder="مثلاً اهواز یا آبادان" /></div>
        <div><label>مرحله فعلی پرونده</label><select name="stage" value={form.stage} onChange={change}><option>در حال رسیدگی</option><option>مرحله تحقیقات مقدماتی</option><option>بدوی</option><option>تجدیدنظر</option><option>اجرای حکم</option><option>هنوز طرح نشده</option><option>نامشخص</option></select></div>
      </div>
      <label>خلاصه غیرمحرمانه موضوع</label><textarea name="summary" rows="4" maxLength="1500" value={form.summary} onChange={change} placeholder="صرفاً موضوع کلی و نوع اقدام موردنیاز را بنویسید. نام موکل، شماره پرونده و جزئیات محرمانه را درج نکنید." />
      <div className="feature-warning">با ثبت این فرم، هیچ رابطه وکالتی یا تعهدی برای پذیرش پرونده ایجاد نمی‌شود. پیش از تبادل اطلاعات موکل، احراز هویت حرفه‌ای، بررسی تعارض منافع و توافق درباره حدود مسئولیت و حق‌الزحمه ضروری است.</div>
      <button className="feature-primary" type="submit">آماده‌سازی درخواست همکاری ←</button>
    </form></section>
    <footer className="feature-footer"><a href="/">صفحه اصلی</a><span>درخواست‌ها پس از بررسی و هماهنگی، مبنای تصمیم درباره همکاری خواهند بود.</span></footer>
  </main>;
}
