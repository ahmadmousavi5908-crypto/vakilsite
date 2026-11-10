const SIMPLE_FIELDS = ["fullName", "phone", "city", "topicLabel", "role", "stage", "urgency", "deadline", "reference", "goal", "otherDocs"];
const TOPIC_LABELS = {
  property: "ملک، زمین و امور ثبتی",
  contract: "قرارداد و تعهدات",
  cheque: "چک، سفته و مطالبه وجه",
  family: "خانواده، مهریه و طلاق",
  criminal: "شکایت و پرونده کیفری",
  labor: "کار و تأمین اجتماعی",
  administrative: "امور اداری و دیوان عدالت",
  other: "سایر موضوعات",
};

export function normalizeDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
}

function cleanLine(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanParagraph(value, maxLength = 2000) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function validateIntake(data) {
  const errors = [];
  if (cleanLine(data.fullName, 80).length < 2) errors.push("نام و نام خانوادگی را وارد کنید.");
  const phone = normalizeDigits(data.phone).replace(/[\s()-]/g, "");
  if (!/^\+?\d{10,15}$/.test(phone)) errors.push("شماره همراه معتبر وارد کنید.");
  if (cleanLine(data.city, 60).length < 2) errors.push("شهر را وارد کنید.");
  if (!TOPIC_LABELS[data.topic]) errors.push("موضوع درخواست را انتخاب کنید.");
  if (!cleanLine(data.role, 80)) errors.push("سمت خود را مشخص کنید.");
  if (!cleanLine(data.stage, 100)) errors.push("مرحله فعلی موضوع را مشخص کنید.");
  if (!["عادی", "نیازمند بررسی زودهنگام", "دارای مهلت یا جلسه نزدیک"].includes(data.urgency)) errors.push("میزان فوریت را مشخص کنید.");
  if (cleanParagraph(data.summary).length < 20) errors.push("شرح موضوع باید دست‌کم ۲۰ نویسه باشد.");
  if (cleanLine(data.goal, 500).length < 5) errors.push("خواسته خود از وکیل را توضیح دهید.");
  if (data.caseConsent !== true) errors.push("رضایت بررسی اولیه درخواست الزامی است.");
  if (data.thirdPartyNotice !== true) errors.push("تأیید آگاهی درباره اطلاعات اشخاص ثالث الزامی است.");
  return errors;
}

export function buildIntakeMessage(data, meta = {}) {
  const topicLabel = TOPIC_LABELS[data.topic] || "سایر موضوعات";
  const lines = [
    "درخواست بررسی اولیه حقوقی | دفتر وکیل سید احمد موسوی",
    "شناسه پیگیری محلی: " + cleanLine(meta.trackingId, 50),
    "زمان تهیه: " + cleanLine(meta.timestamp, 80),
    "",
    "مشخصات متقاضی",
    "نام: " + cleanLine(data.fullName, 80),
    "شماره همراه: " + cleanLine(normalizeDigits(data.phone), 20),
    "شهر: " + cleanLine(data.city, 60),
    "",
    "مشخصات موضوع",
    "موضوع: " + topicLabel,
    "سمت متقاضی: " + cleanLine(data.role, 80),
    "مرحله فعلی: " + cleanLine(data.stage, 100),
    "فوریت: " + cleanLine(data.urgency, 80),
    "تاریخ جلسه/ابلاغ/مهلت: " + cleanLine(data.deadline, 80),
    "شماره پرونده یا شعبه: " + cleanLine(data.reference, 100),
  ];
  const topicDetails = Object.entries(data.topicDetails || {})
    .map(([label, value]) => [cleanLine(label, 80), cleanLine(value, 250)])
    .filter(([, value]) => value);
  if (topicDetails.length) {
    lines.push("", "اطلاعات تکمیلی موضوع");
    for (const [label, value] of topicDetails) lines.push(label + ": " + value);
  }
  lines.push(
    "",
    "شرح موضوع از زبان متقاضی",
    cleanParagraph(data.summary),
    "",
    "خواسته متقاضی از وکیل",
    cleanParagraph(data.goal, 500),
    "",
    "مدارک/اطلاعات موجود",
    (Array.isArray(data.documents) ? data.documents.map((item) => cleanLine(item, 100)).filter(Boolean) : []).join("، ") || "اعلام نشده",
    "توضیح مدارک: " + cleanLine(data.otherDocs, 250),
    "",
    "رضایت بررسی اولیه: بله",
    "آگاهی درباره اطلاعات اشخاص ثالث: تأیید شد",
    "رضایت پیام‌های بازاریابی: " + (data.marketingConsent === true ? "بله" : "خیر"),
    "",
    "این متن گزارش پاسخ‌های متقاضی است و شامل تحلیل یا نتیجه‌گیری حقوقی نیست.",
  );
  return lines.join("\n");
}
