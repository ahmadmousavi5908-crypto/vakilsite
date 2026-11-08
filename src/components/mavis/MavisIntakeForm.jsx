"use client";

import { useState } from "react";
import styles from "./MavisIntakeForm.module.css";

function createIdempotencyKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

const initialValues = {
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  preferred_contact_method: "phone",
  city: "",
  legal_area: "",
  matter_summary: "",
  privacy_notice_accepted: false,
  contact_consent: false,
  third_party_consent: false,
  marketing_consent: false,
};

export default function MavisIntakeForm({ privacyNoticeVersion, retentionDays }) {
  const [values, setValues] = useState(initialValues);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setIdempotencyKey("");
    setError("");
    setReceipt("");
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setReceipt("");
    const key = idempotencyKey || createIdempotencyKey();
    setIdempotencyKey(key);
    try {
      const response = await fetch("/api/mavis/public-intake", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, idempotency_key: key }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error?.message || "ثبت درخواست تأیید نشد.");
      setReceipt(result.reference_code);
      setValues(initialValues);
      setIdempotencyKey("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ارتباط با سامانه ثبت درخواست برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.grid}>
        <label>نام و نام خانوادگی<input value={values.contact_name} onChange={(event) => update("contact_name", event.target.value)} minLength={2} maxLength={100} autoComplete="name" required /></label>
        <label>شماره تماس<input value={values.contact_phone} onChange={(event) => update("contact_phone", event.target.value)} maxLength={24} inputMode="tel" autoComplete="tel" required /></label>
        <label>ایمیل (اختیاری)<input type="email" value={values.contact_email} onChange={(event) => update("contact_email", event.target.value)} maxLength={254} autoComplete="email" required={values.preferred_contact_method === "email"} /></label>
        <label>روش ترجیحی تماس<select value={values.preferred_contact_method} onChange={(event) => update("preferred_contact_method", event.target.value)}><option value="phone">تلفن</option><option value="email">ایمیل</option></select></label>
        <label>شهر محل موضوع<input value={values.city} onChange={(event) => update("city", event.target.value)} minLength={2} maxLength={80} autoComplete="address-level2" required /></label>
        <label>حوزه حقوقی<select value={values.legal_area} onChange={(event) => update("legal_area", event.target.value)} required><option value="">انتخاب کنید</option><option value="املاک و امور ثبتی">املاک و امور ثبتی</option><option value="قراردادها و تعهدات">قراردادها و تعهدات</option><option value="چک و مطالبات">چک و مطالبات</option><option value="دعاوی حقوقی">دعاوی حقوقی</option><option value="دعاوی کیفری">دعاوی کیفری</option><option value="خانواده">خانواده</option><option value="کار و تأمین اجتماعی">کار و تأمین اجتماعی</option><option value="دیوان عدالت اداری">دیوان عدالت اداری</option><option value="سایر">سایر</option></select></label>
      </div>
      <label>شرح کوتاه موضوع<textarea value={values.matter_summary} onChange={(event) => update("matter_summary", event.target.value)} minLength={20} maxLength={4000} rows={5} required placeholder="موضوع را به‌صورت خلاصه و بدون درج اطلاعات محرمانه توضیح دهید." /></label>
      <p className={styles.warning}>در این فرم کد ملی، شماره پرونده، نشانی دقیق، اطلاعات بانکی، رمزها یا تصویر اسناد را وارد نکنید. این فرم صرفاً برای ثبت درخواست تماس اولیه است و به‌تنهایی رابطه وکالت ایجاد نمی‌کند.</p>
      <fieldset><legend>رضایت‌های ضروری</legend>
        <label className={styles.check}><input type="checkbox" checked={values.privacy_notice_accepted} onChange={(event) => update("privacy_notice_accepted", event.target.checked)} required /> <span><a href="/mavis-intake/privacy" target="_blank" rel="noopener noreferrer">اطلاعیه حریم خصوصی نسخه {privacyNoticeVersion}</a> را مطالعه کردم؛ مدت نگهداری اعلام‌شده {retentionDays} روز است.</span></label>
        <label className={styles.check}><input type="checkbox" checked={values.contact_consent} onChange={(event) => update("contact_consent", event.target.checked)} required /> برای پیگیری همین درخواست با من تماس گرفته شود.</label>
      </fieldset>
      <fieldset><legend>رضایت‌های اختیاری و مستقل</legend>
        <label className={styles.check}><input type="checkbox" checked={values.third_party_consent} onChange={(event) => update("third_party_consent", event.target.checked)} /> با اشتراک‌گذاری اطلاعات با اشخاص ثالث برای پیگیری درخواست موافقم.</label>
        <label className={styles.check}><input type="checkbox" checked={values.marketing_consent} onChange={(event) => update("marketing_consent", event.target.checked)} /> مایل به دریافت اطلاع‌رسانی‌های عمومی و محتوای دفتر هستم.</label>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {receipt && <div className={styles.receipt} role="status"><strong>شناسه پیگیری</strong><code dir="ltr">{receipt}</code><span>این شناسه را نزد خود نگهداری کنید. ثبت درخواست به معنی پذیرش وکالت نیست.</span></div>}
      <button type="submit" disabled={loading}>{loading ? "در حال ثبت امن..." : "ثبت درخواست تماس اولیه"}</button>
    </form>
  );
}
