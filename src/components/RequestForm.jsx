"use client";

import { useEffect, useState } from "react";

export default function RequestForm({ services }) {
  const [topic, setTopic] = useState("موضوع پرونده را انتخاب کنید");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    function handleServiceSelection(event) {
      if (typeof event.detail === "string" && event.detail.trim()) {
        setTopic(event.detail);
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      }
    }
    window.addEventListener("vakilsite:service-selected", handleServiceSelection);
    return () => window.removeEventListener("vakilsite:service-selected", handleServiceSelection);
  }, []);

  function prepareRequest(event) {
    event.preventDefault();
    const timestamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tehran",
    }).format(new Date());
    const message = [
      "درخواست بررسی اولیه",
      "زمان تهیه درخواست (به وقت ایران): " + timestamp,
      "موضوع: " + topic,
      "شهر: " + (city.trim() || "اعلام نشده"),
      "شرح کوتاه: " + (details.trim() || "در انتظار توضیحات"),
    ].join("\n");
    const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "989169165902").replace(/\D/g, "");

    if (phone) {
      window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message)
        .then(() => window.alert("متن درخواست کپی شد."))
        .catch(() => window.prompt("متن درخواست را کپی کنید:", message));
      return;
    }
    window.prompt("متن درخواست را کپی کنید:", message);
  }

  return (
    <form className="request-form" onSubmit={prepareRequest}>
      <div className="form-heading"><span>فرم درخواست اولیه</span><small>حدود ۱ دقیقه</small></div>
      <label htmlFor="request-topic">موضوع درخواست</label>
      <select id="request-topic" value={topic} onChange={(event) => setTopic(event.target.value)} required>
        <option value="موضوع پرونده را انتخاب کنید" disabled>موضوع پرونده را انتخاب کنید</option>
        {!services.some((service) => service.title === topic) && topic !== "موضوع پرونده را انتخاب کنید" && <option value={topic}>{topic}</option>}
        {services.map((service) => <option key={service.n} value={service.title}>{service.title}</option>)}
        <option value="سایر موضوعات حقوقی">سایر موضوعات حقوقی</option>
      </select>
      <label htmlFor="request-city">شهر محل سکونت یا رسیدگی</label>
      <input id="request-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً آبادان، دزفول، اهواز..." autoComplete="address-level2" />
      <label htmlFor="request-details">شرح کوتاه مسئله <span className="optional">(اختیاری)</span></label>
      <textarea id="request-details" value={details} onChange={(event) => setDetails(event.target.value)} rows="4" maxLength={1200} placeholder="در چند جمله بگویید چه اتفاقی افتاده و پرونده در چه مرحله‌ای است..." />
      <button className="btn btn-submit" type="submit">آماده‌سازی درخواست در واتساپ <span>←</span></button>
      <small className="form-hint">با انتخاب دکمه، متن درخواست آماده می‌شود؛ ارسال نهایی را خودتان در واتساپ انجام می‌دهید. اطلاعات محرمانه یا مدارک پرونده را اینجا وارد نکنید.</small>
    </form>
  );
}
