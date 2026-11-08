export const INTAKE_CONSENT_BASE_VERSION = "mavis-intake-v1";

export function getIntakeConsentVersion(retentionDays) {
  return Number.isInteger(retentionDays) && retentionDays >= 1 && retentionDays <= 3650
    ? INTAKE_CONSENT_BASE_VERSION + "-" + retentionDays + "d"
    : null;
}

export function getIntakeConsentCopy(retentionDays) {
  return {
    initialReview: "با ارسال این فرم، موافقت می‌کنم اطلاعاتی که وارد می‌کنم برای بررسی اولیه درخواست و تماس مرتبط استفاده شود. ثبت درخواست به معنی قبول وکالت، ایجاد رابطه وکالتی، بررسی تعارض منافع یا ارائه نظر حقوقی نیست.",
    retention: "اطلاعات درخواست حداکثر تا " + retentionDays.toLocaleString("fa-IR") + " روز پس از ثبت نگهداری می‌شود؛ مگر آنکه توقف نگهداری به دلیل الزام قانونی یا ضرورت رسیدگی اعمال شود.",
    marketing: "مایلم پیام‌ها و اطلاع‌رسانی‌های اختیاری دفتر را دریافت کنم. این انتخاب اختیاری است و بر بررسی اولیه درخواست اثر ندارد.",
    thirdParty: "اگر در شرح درخواست اطلاعات شخص دیگری را وارد می‌کنم، فقط اطلاعات ضروری را درج می‌کنم و از ارائه اطلاعات غیرضروری خودداری می‌کنم. این اعلام آگاهی به معنای رضایت شخص ثالث یا ایجاد مبنای قانونی به جای او نیست.",
  };
}
