const SIGNALS = [
  { code: "time_sensitive", pattern: /مهلت|ابلاغ|جلسه\s*رسیدگی|وقت\s*دادگاه|واخواهی|تجدیدنظر|فرجام|اعتراض|اجرائیه|مزایده|توقیف/, priority: "urgent" },
  { code: "liberty_or_criminal", pattern: /بازداشت|توقیف\s*شخص|احضاریه\s*کیفری|جلب|حبس|زندان|ضرب\s*و\s*جرح|تهدید\s*جانی/, priority: "urgent" },
  { code: "family_safety", pattern: /خشونت\s*خانگی|تهدید\s*همسر|آزار\s*کودک|حضانت\s*فوری|ممانعت\s*از\s*ملاقات/, priority: "urgent" },
  { code: "enforcement_or_property", pattern: /تخلیه|خلع\s*ید|رفع\s*تصرف|پلمب|قطع\s*انشعاب|اجرائیه|اجرای\s*حکم|مسدودی\s*حساب/, priority: "review" },
];

const QUESTIONS = Object.freeze([
  "آیا ابلاغیه، احضاریه یا رأی کتبی دریافت کرده‌اید؟ تاریخ دقیق ابلاغ چه زمانی است؟",
  "پرونده در کدام مرجع و در چه مرحله‌ای قرار دارد؟",
  "آیا تاریخ جلسه، مهلت اعلام‌شده یا اقدام اجرایی نزدیک وجود دارد؟",
  "چه اسناد یا مدارکی در اختیار دارید؟ فعلاً اطلاعات هویتی حساس را در این فرم ارسال نکنید.",
]);

export function triageLegalIntake(text) {
  if (typeof text !== "string" || text.trim().length < 10) {
    return { ok: false, reason: "insufficient_description" };
  }

  const normalized = text.normalize("NFC").replace(/[يى]/g, "ی").replace(/ك/g, "ک");
  const matches = SIGNALS.filter((signal) => signal.pattern.test(normalized));
  const urgent = matches.some((signal) => signal.priority === "urgent");

  return {
    ok: true,
    reviewPriority: urgent ? "urgent_human_review" : matches.length ? "priority_human_review" : "standard_human_review",
    detectedSignals: matches.map((signal) => signal.code),
    requiresDeadlineCheck: matches.some((signal) => signal.code === "time_sensitive"),
    followUpQuestions: QUESTIONS,
    legalAssessment: null,
    deadlineCalculated: false,
    disclaimer: "این غربالگری صرفاً برای اولویت‌بندی بررسی انسانی است؛ تشخیص حقوقی، محاسبه مهلت یا توصیه درباره اقدام قضایی نیست.",
  };
}
