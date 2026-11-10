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

const ROLE_OPTIONS = {
  property: ["مالک", "خریدار", "فروشنده", "مستأجر", "موجر", "وارث", "متصرف", "نماینده", "سایر"],
  contract: ["متعهد", "متعهدله", "کارفرما", "پیمانکار", "خریدار", "فروشنده", "نماینده", "سایر"],
  cheque: ["دارنده چک یا سفته", "صادرکننده", "ظهرنویس", "ضامن", "نماینده", "سایر"],
  family: ["زوج", "زوجه", "ولی یا قیم", "وارث", "نماینده", "سایر"],
  criminal: ["شاکی", "مشتکی‌عنه", "متهم", "بزه‌دیده", "نماینده یا ولی", "سایر"],
  labor: ["کارگر یا کارمند", "کارفرما", "پیمانکار", "بیمه‌شده", "نماینده", "سایر"],
  administrative: ["شخص حقیقی", "کارمند دولت", "شرکت یا شخص حقوقی", "نماینده", "سایر"],
  other: ["متقاضی یا ذی‌نفع", "طرف مقابل", "نماینده", "سایر"],
};

const STAGE_OPTIONS = {
  property: ["هنوز اقدام رسمی نشده", "مذاکره یا ارسال اظهارنامه", "ثبت دادخواست یا شکایت", "رسیدگی در دادگاه", "اعتراض یا تجدیدنظر", "اجرای رأی یا سند", "اطلاع ندارم"],
  contract: ["قرارداد در حال اجراست", "نقض تعهد یا اختلاف ایجاد شده", "مذاکره یا ارسال اظهارنامه", "ثبت دادخواست", "رسیدگی در دادگاه", "اعتراض یا تجدیدنظر", "اجرای رأی", "اطلاع ندارم"],
  cheque: ["پیش از سررسید", "پس از عدم پرداخت", "گواهی عدم پرداخت یا واخواست دریافت شده", "اقدام قضایی یا اجرایی آغاز شده", "رسیدگی در دادگاه", "اجرای رأی یا اجرائیه", "اطلاع ندارم"],
  family: ["هنوز اقدام رسمی نشده", "مذاکره یا توافق", "ثبت دادخواست یا درخواست", "رسیدگی در دادگاه", "اعتراض یا تجدیدنظر", "اجرای رأی", "اطلاع ندارم"],
  criminal: ["هنوز شکایت یا پرونده تشکیل نشده", "ثبت شکایت یا گزارش", "دادسرا یا تحقیقات مقدماتی", "رسیدگی در دادگاه", "اعتراض یا تجدیدنظر", "اجرای رأی", "اطلاع ندارم"],
  labor: ["هنوز درخواست ثبت نشده", "مراجعه به اداره کار یا تأمین اجتماعی", "رسیدگی در مرجع مربوط", "اعتراض به رأی", "اجرای رأی", "اطلاع ندارم"],
  administrative: ["هنوز درخواست یا اعتراضی ثبت نشده", "مکاتبه با دستگاه", "ثبت درخواست یا شکایت", "رسیدگی در مرجع اداری یا قضایی", "اعتراض یا تجدیدنظر", "اجرای رأی", "اطلاع ندارم"],
  other: ["هنوز اقدام رسمی نشده", "مذاکره یا مکاتبه", "ثبت درخواست یا شکایت", "رسیدگی در مرجع رسمی", "اعتراض یا تجدیدنظر", "اجرای رأی", "اطلاع ندارم"],
};

const BASE_QUESTIONS = {
  property: [
    { question: "نوع سند یا مدرک مالکیت چیست؟", label: "نوع سند یا مدرک", type: "select", required: true, options: ["سند رسمی تک‌برگ", "سند دفترچه‌ای", "قولنامه یا مبایعه‌نامه", "مدرک عادی دیگر", "بدون سند", "اطلاع ندارم"] },
    { question: "ملک در کدام شهر یا محدوده قرار دارد؟", label: "شهر ملک", type: "text", required: true },
    { question: "وضعیت فعلی تصرف ملک چیست؟", label: "وضعیت تصرف", type: "select", options: ["در تصرف خودم", "در تصرف طرف مقابل", "در تصرف شخص ثالث", "بدون متصرف", "اطلاع ندارم"] },
    { question: "تاریخ معامله یا صدور سند (در صورت اطلاع)", label: "تاریخ معامله یا سند", type: "text" },
    { question: "آیا استعلام، اظهارنامه یا سابقه ثبتی مرتبط دارید؟", label: "استعلام یا سابقه ثبتی", type: "select", options: ["بله", "خیر", "درخواست شده", "اطلاع ندارم"] },
  ],
  contract: [
    { question: "نوع قرارداد یا توافق چیست؟", label: "نوع قرارداد", type: "text", required: true },
    { question: "تاریخ انعقاد قرارداد", label: "تاریخ قرارداد", type: "text" },
    { question: "تعهد اصلی انجام‌نشده یا مورد اختلاف چیست؟", label: "تعهد یا تخلف", type: "text", required: true },
    { question: "آیا اخطار یا اظهارنامه‌ای ارسال یا دریافت شده است؟", label: "اظهارنامه یا اخطار", type: "select", options: ["ارسال کرده‌ام", "دریافت کرده‌ام", "هر دو", "خیر", "اطلاع ندارم"] },
  ],
  cheque: [
    { question: "نوع سند مورد مطالبه چیست؟", label: "نوع سند", type: "select", required: true, options: ["چک صیادی", "چک قدیمی", "سفته", "سند تجاری دیگر"] },
    { question: "تاریخ صدور و سررسید (در صورت اطلاع)", label: "تاریخ صدور و سررسید", type: "text" },
    { question: "وضعیت گواهی عدم پرداخت یا واخواست چیست؟", label: "گواهی عدم پرداخت یا واخواست", type: "select", options: ["دریافت شده", "دریافت نشده", "در حال پیگیری", "اطلاع ندارم"] },
    { question: "مبلغ تقریبی مورد مطالبه (بدون اطلاعات حساب)", label: "مبلغ تقریبی", type: "text" },
    { question: "آیا تاکنون بخشی از مبلغ پرداخت شده است؟", label: "پرداخت بخشی از مبلغ", type: "select", options: ["بله", "خیر", "مورد اختلاف است", "اطلاع ندارم"] },
  ],
  family: [
    { question: "نوع رابطه یا خواسته اصلی چیست؟", label: "نوع رابطه یا خواسته", type: "text", required: true },
    { question: "آیا رأی، توافق یا پرونده قبلی وجود دارد؟", label: "رأی یا توافق قبلی", type: "select", options: ["رأی صادر شده", "توافق انجام شده", "پرونده در جریان است", "وجود ندارد", "اطلاع ندارم"] },
    { question: "تاریخ ابلاغ یا ثبت درخواست (در صورت وجود)", label: "تاریخ ابلاغ یا درخواست", type: "text" },
    { question: "آیا موضوع فرزند یا حضانت به درخواست مرتبط است؟", label: "ارتباط موضوع با فرزند یا حضانت", type: "select", options: ["بله", "خیر", "ترجیح می‌دهم در تماس توضیح دهم"] },
  ],
  criminal: [
    { question: "مرجع رسیدگی و شعبه (در صورت اطلاع)", label: "مرجع و شعبه", type: "text" },
    { question: "عنوان اتهام یا شکایت (در صورت اطلاع)", label: "عنوان اتهام یا شکایت", type: "text" },
    { question: "تاریخ احضار، جلسه یا آخرین ابلاغ", label: "تاریخ احضار یا جلسه", type: "text" },
    { question: "وضعیت فعلی آزادی شخص مرتبط با پرونده چیست؟", label: "وضعیت آزادی شخص", type: "select", options: ["بازداشت یا محدودیت آزادی وجود دارد", "شخص آزاد است", "موضوع ارتباطی ندارد", "اطلاع ندارم"] },
  ],
  labor: [
    { question: "نوع رابطه کاری چیست؟", label: "نوع رابطه کاری", type: "select", required: true, options: ["قرارداد کتبی", "توافق شفاهی", "پیمانکاری", "استخدام رسمی یا پیمانی", "سایر"] },
    { question: "مدت اشتغال یا همکاری", label: "مدت اشتغال", type: "text" },
    { question: "موضوع اصلی اختلاف چیست؟", label: "موضوع اختلاف", type: "text", required: true },
    { question: "وضعیت بیمه و سوابق پرداخت چگونه است؟", label: "وضعیت بیمه", type: "select", options: ["بیمه کامل", "بیمه ناقص", "بدون بیمه", "مورد اختلاف", "اطلاع ندارم"] },
    { question: "آیا در اداره کار یا تأمین اجتماعی درخواست ثبت کرده‌اید؟", label: "وضعیت مراجعه", type: "select", options: ["ثبت درخواست شده", "رأی صادر شده", "مراجعه نشده", "اطلاع ندارم"] },
  ],
  administrative: [
    { question: "نام دستگاه یا مرجع اداری چیست؟", label: "دستگاه یا مرجع اداری", type: "text", required: true },
    { question: "نوع تصمیم یا اقدام مورد اعتراض چیست؟", label: "تصمیم یا اقدام مورد اعتراض", type: "text", required: true },
    { question: "تاریخ ابلاغ تصمیم (در صورت وجود)", label: "تاریخ ابلاغ تصمیم", type: "text" },
    { question: "آیا پیش از این درخواست یا اعتراض ثبت کرده‌اید؟", label: "درخواست یا اعتراض قبلی", type: "select", options: ["بله و پاسخ دریافت شده", "بله و بدون پاسخ", "خیر", "اطلاع ندارم"] },
  ],
  other: [
    { question: "ماهیت موضوع را در یک عبارت مشخص کنید.", label: "ماهیت موضوع", type: "text", required: true },
    { question: "آیا موضوع در مرجع رسمی مطرح شده است؟", label: "طرح موضوع در مرجع رسمی", type: "select", options: ["بله", "خیر", "اطلاع ندارم"] },
  ],
};

const DOCUMENT_OPTIONS = {
  property: ["سند مالکیت یا استعلام", "قولنامه یا مبایعه‌نامه", "رسید پرداخت", "نقشه یا مدارک ثبتی", "اظهارنامه یا رأی"],
  contract: ["اصل قرارداد و الحاقیه", "رسیدها و اسناد پرداخت", "مکاتبات و پیام‌ها", "اظهارنامه یا اخطار", "فاکتور یا صورت‌جلسه"],
  cheque: ["تصویر چک یا سفته", "گواهی عدم پرداخت", "رسید یا اسناد پرداخت مرتبط", "واخواست یا اجرائیه", "قرارداد پایه"],
  family: ["سند ازدواج یا طلاق", "رأی یا توافق قبلی", "ابلاغیه یا دادخواست", "مدارک پرداخت مرتبط", "مدرک ضروری دیگر"],
  criminal: ["شکواییه یا لایحه", "احضاریه یا ابلاغیه", "گزارش یا صورت‌جلسه", "رأی یا قرار صادرشده", "مدرک مرتبط با واقعه"],
  labor: ["قرارداد یا حکم کارگزینی", "فیش حقوقی یا سابقه بیمه", "سوابق حضور و غیاب", "نامه یا رأی اداره کار", "مکاتبات کاری"],
  administrative: ["تصمیم یا نامه اداری", "ابلاغیه", "درخواست یا پاسخ دستگاه", "رأی مرجع اداری", "مدرک ثبت اعتراض"],
  other: ["قرارداد یا توافق", "مکاتبات", "رسید یا سند پرداخت", "ابلاغیه یا رأی", "سایر مدارک مرتبط"],
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

export function getRoleOptions(topic) {
  return [...(ROLE_OPTIONS[topic] || ROLE_OPTIONS.other)];
}

export function getStageOptions(topic) {
  return [...(STAGE_OPTIONS[topic] || STAGE_OPTIONS.other)];
}

export function getTopicQuestions(topic, role = "", stage = "") {
  const questions = [...(BASE_QUESTIONS[topic] || BASE_QUESTIONS.other)];
  if (topic === "property" && ["مستأجر", "موجر"].includes(role)) {
    questions.push({ question: "تاریخ و مدت قرارداد اجاره", label: "تاریخ و مدت اجاره", type: "text" });
    questions.push({ question: "وضعیت پرداخت اجاره یا درخواست تخلیه چیست؟", label: "وضعیت اجاره یا تخلیه", type: "select", options: ["اجاره پرداخت می‌شود", "اجاره معوق است", "درخواست تخلیه مطرح شده", "اختلاف دیگری وجود دارد", "اطلاع ندارم"] });
  }
  if (topic === "property" && ["خریدار", "فروشنده"].includes(role)) {
    questions.push({ question: "وضعیت پرداخت ثمن یا تحویل ملک چیست؟", label: "وضعیت پرداخت یا تحویل", type: "select", options: ["پرداخت و تحویل کامل", "پرداخت کامل نشده", "ملک تحویل نشده", "هر دو مورد اختلاف است", "اطلاع ندارم"] });
  }
  if (topic === "contract" && role) {
    questions.push({ question: "تعهد اصلی شما در قرارداد انجام شده است؟", label: "انجام تعهد توسط متقاضی", type: "select", options: ["بله", "خیر", "بخشی انجام شده", "مورد اختلاف است", "اطلاع ندارم"] });
  }
  if (topic === "family" && ["زوج", "زوجه"].includes(role)) {
    questions.push({ question: "آیا موضوع فرزند مشترک در این درخواست مؤثر است؟", label: "وجود موضوع مرتبط با فرزند", type: "select", options: ["بله", "خیر", "ترجیح می‌دهم در تماس توضیح دهم"] });
  }
  if (topic === "criminal" && ["متهم", "مشتکی‌عنه"].includes(role)) {
    questions.push({ question: "آیا احضاریه یا دستور حضور دریافت کرده‌اید؟", label: "وضعیت احضاریه", type: "select", options: ["بله", "خیر", "اطلاع ندارم"] });
  }
  if (/(دادگاه|دادسرا|رسیدگی|اعتراض|تجدیدنظر|اجرای رأی|اجرائیه)/.test(stage)) {
    questions.push({ question: "نام مرجع و شعبه فعلی (در صورت اطلاع)", label: "مرجع و شعبه فعلی", type: "text" });
    questions.push({ question: "تاریخ آخرین ابلاغ یا اقدام رسمی", label: "تاریخ آخرین ابلاغ", type: "text" });
  }
  const seen = new Set();
  return questions.filter((question) => {
    if (seen.has(question.label)) return false;
    seen.add(question.label);
    return true;
  });
}

export function getDocumentOptions(topic) {
  return [...(DOCUMENT_OPTIONS[topic] || DOCUMENT_OPTIONS.other)];
}

export function classifyIntake(data) {
  const signal = cleanLine(data.urgentSignal, 100);
  const contactWindow = cleanLine(data.contactWindow, 80);
  const urgency = cleanLine(data.urgency, 80);

  if (
    signal === "بازداشت یا محدودیت آزادی" ||
    signal === "جلسه یا مهلت در ۷۲ ساعت آینده" ||
    signal === "اقدام اجرایی فوری" ||
    contactWindow === "امروز" ||
    urgency === "دارای مهلت یا جلسه نزدیک"
  ) {
    return {
      code: "urgent",
      label: "اولویت بالا برای بررسی انسانی",
      reason: signal && signal !== "هیچ‌کدام" ? "بر اساس وضعیت فوری اعلام‌شده توسط متقاضی" : "بر اساس فوریت اعلام‌شده توسط متقاضی",
    };
  }

  if (urgency === "نیازمند بررسی زودهنگام" || contactWindow === "حداکثر ۳ روز آینده") {
    return {
      code: "early",
      label: "نیازمند بررسی زودهنگام",
      reason: "بر اساس زمان تماس درخواستی یا فوریت اعلام‌شده توسط متقاضی",
    };
  }

  return {
    code: "standard",
    label: "بررسی در روال عادی پذیرش",
    reason: "فوریت ویژه‌ای از سوی متقاضی اعلام نشده است",
  };
}

export function getReviewChecklist(data) {
  const missing = [];
  if (!cleanLine(data.deadline, 80)) missing.push("تاریخ جلسه، ابلاغ یا مهلت (در صورت وجود)");
  if (!cleanLine(data.reference, 100)) missing.push("شماره پرونده یا شعبه (در صورت وجود)");
  if (!Array.isArray(data.documents) || data.documents.length === 0) missing.push("مدارک موجود یا توضیح درباره نبود مدارک");
  if (!cleanLine(data.otherDocs, 250)) missing.push("توضیح تکمیلی درباره مدارک (در صورت نیاز)");
  const questions = getTopicQuestions(data.topic, data.role, data.stage);
  const unanswered = questions
    .filter((question) => question.required && !cleanLine(data.topicDetails?.[question.label], 250))
    .map((question) => question.label);
  return { missing, unanswered };
}

export function validateIntake(data) {
  const errors = [];
  if (cleanLine(data.fullName, 80).length < 2) errors.push("نام و نام خانوادگی را وارد کنید.");
  const phone = normalizeDigits(data.phone).replace(/[\s()-]/g, "");
  if (!/^\+?\d{10,15}$/.test(phone)) errors.push("شماره همراه معتبر وارد کنید.");
  if (cleanLine(data.city, 60).length < 2) errors.push("شهر را وارد کنید.");
  if (!TOPIC_LABELS[data.topic]) errors.push("موضوع درخواست را انتخاب کنید.");
  if (!getRoleOptions(data.topic).includes(cleanLine(data.role, 80))) errors.push("نقش خود را متناسب با موضوع مشخص کنید.");
  if (!getStageOptions(data.topic).includes(cleanLine(data.stage, 100))) errors.push("مرحله فعلی موضوع را مشخص کنید.");
  if (!["عادی", "نیازمند بررسی زودهنگام", "دارای مهلت یا جلسه نزدیک"].includes(data.urgency)) errors.push("میزان فوریت را مشخص کنید.");
  if (!["امروز", "حداکثر ۳ روز آینده", "حداکثر یک هفته آینده", "بدون فوریت خاص", "مطمئن نیستم"].includes(data.contactWindow)) errors.push("زمان مورد انتظار برای تماس را مشخص کنید.");
  if (!["هیچ‌کدام", "بازداشت یا محدودیت آزادی", "جلسه یا مهلت در ۷۲ ساعت آینده", "اقدام اجرایی فوری", "مطمئن نیستم"].includes(data.urgentSignal)) errors.push("وضعیت فوریت را مشخص کنید.");
  if (cleanParagraph(data.summary).length < 20) errors.push("شرح موضوع باید دست‌کم ۲۰ نویسه باشد.");
  if (cleanLine(data.goal, 500).length < 5) errors.push("خواسته خود از وکیل را توضیح دهید.");
  if (data.caseConsent !== true) errors.push("رضایت بررسی اولیه درخواست الزامی است.");
  if (data.thirdPartyNotice !== true) errors.push("تأیید آگاهی درباره اطلاعات اشخاص ثالث الزامی است.");
  for (const question of getTopicQuestions(data.topic, data.role, data.stage)) {
    if (question.required && !cleanLine(data.topicDetails?.[question.label], 250)) {
      errors.push("پاسخ به پرسش ضروری «" + question.label + "» را تکمیل کنید.");
    }
  }
  return errors;
}

export function buildIntakeMessage(data, meta = {}) {
  const topicLabel = TOPIC_LABELS[data.topic] || "سایر موضوعات";
  const priority = classifyIntake(data);
  const checklist = getReviewChecklist(data);
  const lines = [
    "درخواست بررسی اولیه حقوقی | دفتر وکیل سید احمد موسوی",
    "شناسه محلی پیش‌نویس: " + cleanLine(meta.trackingId, 50),
    "زمان تهیه: " + cleanLine(meta.timestamp, 80),
    "",
    "خلاصه پذیرش برای دفتر",
    "موضوع ارجاع: " + topicLabel,
    "اولویت پیشنهادی بررسی: " + priority.label,
    "مبنای اولویت: " + priority.reason,
    "وضعیت ثبت: فقط پیش‌نویس محلی؛ هنوز به دفتر تحویل نشده است",
  ];
  if (checklist.missing.length || checklist.unanswered.length) {
    lines.push("موارد تکمیلی برای پیگیری دفتر:");
    for (const item of checklist.missing) lines.push("- " + item);
    for (const item of checklist.unanswered) lines.push("- پاسخ ضروری ناقص: " + item);
  } else {
    lines.push("چک‌لیست اطلاعات اولیه: تکمیل شده بر اساس پاسخ‌های واردشده");
  }
  lines.push(
    "",
    "مشخصات متقاضی",
    "نام: " + cleanLine(data.fullName, 80),
    "شماره همراه: " + cleanLine(normalizeDigits(data.phone), 20),
    "شهر: " + cleanLine(data.city, 60),
    "",
    "مشخصات موضوع",
    "سمت متقاضی: " + cleanLine(data.role, 80),
    "مرحله فعلی: " + cleanLine(data.stage, 100),
    "فوریت اعلام‌شده: " + cleanLine(data.urgency, 80),
    "زمان تماس درخواستی: " + cleanLine(data.contactWindow, 80),
    "نشانه فوری اعلام‌شده: " + cleanLine(data.urgentSignal, 100),
    "تاریخ جلسه/ابلاغ/مهلت: " + cleanLine(data.deadline, 80),
    "شماره پرونده یا شعبه: " + cleanLine(data.reference, 100),
  );
  const topicDetails = Object.entries(data.topicDetails || {})
    .map(([label, value]) => [cleanLine(label, 80), cleanLine(value, 250)])
    .filter(([, value]) => value);
  if (topicDetails.length) {
    lines.push("", "پاسخ‌های تکمیلی متناسب با موضوع و مرحله");
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
    "این اولویت صرفاً برای نظم‌دهی پذیرش و بر اساس اظهارات متقاضی است؛ تشخیص فوریت قانونی، ارزیابی حقوقی و قبول وکالت فقط با بررسی وکیل انجام می‌شود.",
    "این متن گزارش پاسخ‌های متقاضی است و شامل تحلیل یا نتیجه‌گیری حقوقی نیست.",
  );
  return lines.join("\n");
}
