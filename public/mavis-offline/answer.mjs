const FOLLOW_UPS = [
  {
    pattern: /مهلت|اعتراض|تجدیدنظر|فرجام|واخواهی/,
    text: "برای بررسی مهلت، نوع رأی یا ابلاغیه، مرجع صادرکننده، سمت شما و تاریخ دقیق ابلاغ لازم است. بدون این اطلاعات، عدد یا مهلت قطعی اعلام نمی‌شود."
  },
  {
    pattern: /چک|سفته|مطالبه وجه|طلب|گواهی عدم پرداخت/,
    text: "برای بررسی دقیق‌تر، نوع سند، تاریخ صدور و سررسید، وضعیت ثبت یا انتقال، گواهی عدم پرداخت و پرداخت‌های قبلی اهمیت دارد."
  },
  {
    pattern: /ملک|سند|قولنامه|ثبت رسمی|مالکیت|سامانه ثبت ادعا/,
    text: "نوع سند، تاریخ صدور سند حدنگار، تاریخ معامله، وضعیت ثبتی ملک و شهر محل وقوع در بررسی موضوع مؤثرند."
  },
  {
    pattern: /طلاق|مهریه|نفقه|حضانت|ملاقات فرزند|تمکین/,
    text: "نوع خواسته، وجود توافق یا رأی قبلی، تاریخ ابلاغ و وضعیت کلی موضوع باید جداگانه بررسی شود."
  },
  {
    pattern: /احضار|اتهام|دادسرا|بازپرسی|کیفری|شکایت/,
    text: "سمت شما در پرونده، مرجع و شعبه، عنوان اتهام یا شکایت، متن احضاریه و تاریخ حضور اهمیت دارد."
  }
];

function hasValidReviewDate(value) {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function currentValidityVerified(record) {
  return record?.provenance?.current_validity_verified === true
    && hasValidReviewDate(record?.provenance?.last_primary_source_check);
}

function sourceStatus(record) {
  if (record?.review_status === "verified_primary_source" && record?.provenance?.exact_primary_document_verified === true) {
    if (currentValidityVerified(record)) {
      return "سند اولیه بررسی شده و وضعیت اعتبار فعلی نیز در تاریخ ثبت‌شده کنترل شده است.";
    }
    return "سند اولیه بررسی شده است؛ اما وضعیت اعتبار فعلی و اصلاحات بعدی هنوز به‌طور مستقل تأیید نشده است.";
  }
  if (record?.review_status === "secondary_source_only") {
    return "این مدخل فعلاً بر منابع ثانویه متکی است؛ متن رسمی و وضعیت روز باید جداگانه بررسی شود.";
  }
  if (record?.status === "needs_consolidation_review") {
    return "این مدخل نیازمند بازبینی و تنقیح است و نباید مبنای تصمیم قطعی قرار گیرد.";
  }
  return "وضعیت اعتبار منبع و به‌روز بودن این مدخل به‌طور کامل تأیید نشده است.";
}

export function buildOfflineAnswer(query, rankedRecords) {
  const records = Array.isArray(rankedRecords) ? rankedRecords : [];
  const best = records[0];
  if (!best) {
    return {
      status: "no_match",
      title: "در کتابخانه فعلی پاسخ مستند پیدا نشد",
      summary: "این موضوع ممکن است در قوانین یا منابع خارج از بسته فعلی وجود داشته باشد. نبود نتیجه به معنی نبود حق یا راهکار قانونی نیست.",
      sourceStatus: "هیچ منبعی برای این پرسش در بسته فعلی بازیابی نشد.",
      followUp: "موضوع را با واژه حقوقی دقیق‌تر یا عنوان سند جست‌وجو کنید؛ برای بررسی موردی، وکیل باید اسناد و تاریخ‌ها را ببیند.",
      caution: "این پاسخ‌گو آفلاین به منابع دانلودشده محدود است و در نبود اینترنت نمی‌تواند آخرین اصلاحات یا منابع جدید را بررسی کند.",
      recordId: null,
    };
  }

  const summary = String(best.summary || best.definition || best.notes || "").trim();
  const followUp = FOLLOW_UPS.find((item) => item.pattern.test(String(query || "")))?.text
    || "برای پاسخ دقیق‌تر، نوع موضوع، تاریخ‌های مهم، مدارک موجود و مرحله فعلی را برای بررسی اختصاصی آماده کنید.";
  return {
    status: "retrieved",
    title: "خلاصه اولیه بر اساس «" + String(best.title || best.canonical || "مدخل حقوقی") + "»",
    summary: summary || "برای این مدخل متن توضیحی کافی در بسته فعلی موجود نیست.",
    sourceStatus: sourceStatus(best),
    followUp,
    caution: String(best.notes || best.warning || "این خروجی بازیابی اطلاعات عمومی است؛ تفسیر قانون و انطباق آن با پرونده باید توسط وکیل انجام شود."),
    recordId: best.id,
    reviewStatus: best.review_status || "unknown",
    currentValidityVerified: currentValidityVerified(best),
    sources: (Array.isArray(best.sources) ? best.sources : []).filter((source) => typeof source?.url === "string" && /^https:\/\//i.test(source.url)),
  };
}
