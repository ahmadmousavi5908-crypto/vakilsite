"use client";

import { useState } from "react";
import { getIntakeConsentCopy } from "../../lib/mavis/public-intake-copy.mjs";
import styles from "./MavisPublicIntakeForm.module.css";

const caseOptions = [
  ["civil", "حقوقی و قراردادها"],
  ["criminal", "کیفری"],
  ["family", "خانواده"],
  ["property", "املاک و اراضی"],
  ["commercial", "تجاری و شرکت‌ها"],
  ["labor", "کار و تأمین اجتماعی"],
  ["administrative", "اداری و دیوان عدالت اداری"],
  ["other", "سایر موضوعات"],
];

const urgencyOptions = [
  ["routine", "عادی"],
  ["soon", "نیازمند بررسی زودتر"],
  ["urgent", "فوری یا دارای ابلاغ / مهلت نزدیک"],
];

function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues !== "function") return null;

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const initialState = {
  fullName: "",
  phone: "",
  caseType: "",
  summary: "",
  urgency: "soon",
  opposingParty: "",
  consent: false,
  marketingConsent: false,
  thirdPartyDataNoticeAcknowledged: false,
};

export default function MavisPublicIntakeForm({ retentionDays }) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const consentCopy = getIntakeConsentCopy(retentionDays);

  function updateField(name, value) {
    setIdempotencyKey(null);
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    setRequestError("");
    setReceipt(null);

    try {
      const requestKey = idempotencyKey || createIdempotencyKey();
      if (!requestKey) throw new Error("مرورگر شما امکان ساخت شناسه امن درخواست را فراهم نمی‌کند.");
      setIdempotencyKey(requestKey);

      const response = await fetch("/api/mavis/intake", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify(form),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (payload?.error?.code === "VALIDATION_FAILED" && payload.error.fields) {
          setErrors(payload.error.fields);
          throw new Error("لطفاً موارد مشخص‌شده را اصلاح کنید.");
        }
        throw new Error(payload?.error?.message || "ثبت درخواست انجام نشد. اطلاعات شما ثبت‌شده تلقی نمی‌شود.");
      }

      setReceipt(payload);
      setForm(initialState);
      setIdempotencyKey(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "خطای ناشناخته در ارسال درخواست.");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <section className={styles.success} role="status" aria-live="polite">
        <span className={styles.eyebrow}>REQUEST RECEIVED</span>
        <h1>درخواست اولیه ثبت شد</h1>
        <p>{receipt.notice}</p>
        <div className={styles.tracking}>
          <small>شناسه پیگیری</small>
          <strong dir="ltr">{receipt.trackingCode}</strong>
        </div>
        <p className={styles.warning}>این شناسه را نگهداری کنید و هنگام تماس با دفتر اعلام نمایید. از طریق این صفحه امکان مشاهده جزئیات پرونده وجود ندارد.</p>
        <button type="button" onClick={() => setReceipt(null)}>ثبت درخواست جدید</button>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>INITIAL LEGAL INTAKE</span>
        <h1>فرم ثبت درخواست بررسی اولیه</h1>
        <p>اطلاعات لازم برای ارجاع درخواست به بررسی انسانی را وارد کنید. لطفاً شرح را روشن و مختصر بنویسید.</p>
      </header>

      <div className={styles.notice}>
        <strong>پیش از تکمیل فرم</strong>
        <ul>
          <li>ارسال فرم به معنی قبول وکالت، ایجاد رابطه وکالتی یا ارائه نظر حقوقی نیست.</li>
          <li>در این فرم کد ملی، اطلاعات بانکی، رمز عبور یا فایل مدارک ارسال نکنید.</li>
          <li>در موارد فوری، منتظر پاسخ فرم نمانید و از مسیرهای رسمی و فوری مربوط اقدام کنید.</li>
          <li>شرح درخواست فقط برای بررسی اولیه استفاده می‌شود و تمام موارد باید توسط انسان بررسی شوند.</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="mavis-full-name">نام و نام خانوادگی *</label>
            <input id="mavis-full-name" name="fullName" autoComplete="name" maxLength={100} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
            {errors.fullName && <small>{errors.fullName}</small>}
          </div>

          <div className={styles.field}>
            <label htmlFor="mavis-phone">شماره همراه *</label>
            <input id="mavis-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="0912..." value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
            {errors.phone && <small>{errors.phone}</small>}
          </div>

          <div className={styles.field}>
            <label htmlFor="mavis-case-type">موضوع درخواست *</label>
            <select id="mavis-case-type" name="caseType" value={form.caseType} onChange={(event) => updateField("caseType", event.target.value)} required>
              <option value="">انتخاب موضوع</option>
              {caseOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {errors.caseType && <small>{errors.caseType}</small>}
          </div>

          <div className={styles.field}>
            <label htmlFor="mavis-urgency">فوریت اعلام‌شده *</label>
            <select id="mavis-urgency" name="urgency" value={form.urgency} onChange={(event) => updateField("urgency", event.target.value)}>
              {urgencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {errors.urgency && <small>{errors.urgency}</small>}
          </div>

          <div className={styles.field}>
            <label htmlFor="mavis-opposing-party">نام طرف مقابل (اختیاری)</label>
            <input id="mavis-opposing-party" name="opposingParty" maxLength={120} value={form.opposingParty} onChange={(event) => updateField("opposingParty", event.target.value)} />
          </div>

          <div className={styles.field + " " + styles.full}>
            <label htmlFor="mavis-summary">شرح اولیه موضوع *</label>
            <textarea id="mavis-summary" name="summary" rows={5} maxLength={6000} value={form.summary} onChange={(event) => updateField("summary", event.target.value)} placeholder="موضوع، اتفاقات اصلی، تاریخ‌های مهم و وضعیت فعلی را توضیح دهید. از درج اطلاعات غیرضروری خودداری کنید." required />
            <div className={styles.counter}>{form.summary.length.toLocaleString("fa-IR")} / ۶۰۰۰</div>
            {errors.summary && <small>{errors.summary}</small>}
          </div>
        </div>

        <fieldset className={styles.consents}>
          <legend>رضایت‌ها و اطلاع‌رسانی</legend>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={form.consent} onChange={(event) => updateField("consent", event.target.checked)} required />
            <span>{consentCopy.initialReview} *</span>
          </label>
          {errors.consent && <small>{errors.consent}</small>}
          <p className={styles.retention}>{consentCopy.retention}</p>

          <label className={styles.checkbox}>
            <input type="checkbox" checked={form.marketingConsent} onChange={(event) => updateField("marketingConsent", event.target.checked)} />
            <span>{consentCopy.marketing}</span>
          </label>

          <label className={styles.checkbox}>
            <input type="checkbox" checked={form.thirdPartyDataNoticeAcknowledged} onChange={(event) => updateField("thirdPartyDataNoticeAcknowledged", event.target.checked)} />
            <span>{consentCopy.thirdParty}</span>
          </label>
        </fieldset>

        {requestError && <p className={styles.error} role="alert">{requestError}</p>}

        <button className={styles.submit} type="submit" disabled={submitting || !form.consent}>
          {submitting ? "در حال ثبت درخواست..." : "ارسال برای بررسی اولیه"}
        </button>
        <p className={styles.footerNote}>با ارسال فرم، فقط دریافت درخواست اولیه را ثبت می‌کنید؛ هیچ تعهدی برای پذیرش وکالت ایجاد نمی‌شود.</p>
      </form>
    </section>
  );
}
