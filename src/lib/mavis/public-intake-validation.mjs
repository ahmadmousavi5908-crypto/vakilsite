const CASE_TYPES = new Set(["civil", "criminal", "family", "property", "commercial", "labor", "administrative", "other"]);
const URGENCY_LEVELS = new Set(["routine", "soon", "urgent"]);
const PHONE_PATTERN = /^(?:\+98|0098|0)?9\d{9}$/;

function normalizeDigits(value) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10));
}

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function validatePublicIntake(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: { form: "ساختار درخواست معتبر نیست." } };
  }

  const fullName = cleanText(input.fullName, 100);
  const phone = normalizeDigits(cleanText(input.phone, 20)).replace(/[\s()-]/g, "");
  const caseType = input.caseType;
  const summary = cleanText(input.summary, 6000);
  const urgency = input.urgency;
  const opposingParty = cleanText(input.opposingParty, 120);
  const consent = input.consent === true;
  const errors = {};

  if (fullName.length < 3) errors.fullName = "نام و نام خانوادگی را کامل وارد کنید.";
  if (!PHONE_PATTERN.test(phone)) errors.phone = "شماره همراه معتبر وارد کنید.";
  if (!CASE_TYPES.has(caseType)) errors.caseType = "موضوع درخواست را انتخاب کنید.";
  if (summary.length < 30) errors.summary = "شرح اولیه باید دست‌کم ۳۰ نویسه باشد.";
  if (!URGENCY_LEVELS.has(urgency)) errors.urgency = "فوریت درخواست را مشخص کنید.";
  if (!consent) errors.consent = "رضایت برای استفاده از اطلاعات جهت بررسی درخواست الزامی است.";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName,
      phone,
      caseType,
      summary,
      urgency,
      opposingParty: opposingParty || null,
      consentPurpose: "initial_intake_review",
      marketingConsent: input.marketingConsent === true,
      thirdPartyConsent: input.thirdPartyConsent === true,
    },
    warnings: [
      "این اعتبارسنجی به معنی ثبت درخواست یا ایجاد رابطه وکالتی نیست.",
      "در این مرحله کد ملی، رمز، اطلاعات بانکی یا فایل مدارک دریافت نشود.",
      "اطلاعات اشخاص ثالث فقط در حد ضروری و با رعایت مبانی قانونی دریافت شود.",
    ],
  };
}

export const publicIntakeOptions = Object.freeze({
  caseTypes: [...CASE_TYPES],
  urgencyLevels: [...URGENCY_LEVELS],
});
