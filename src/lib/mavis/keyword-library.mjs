import { seoKeywordLibrary } from "../../data/seo-keyword-library.js";
import { normalizePersianSearchText } from "./persian-text-normalization.mjs";

const PROBLEM_SUBJECTS = Object.freeze({
  "lease-shop-tenancy": ["تخلیه مغازه", "سرقفلی", "اختلاف موجر و مستأجر", "مطالبه ودیعه"],
  "civil-contracts-obligations": ["فسخ قرارداد", "الزام به انجام تعهد", "مطالبه وجه قرارداد", "خسارت قراردادی"],
  "civil-procedure": ["تجدیدنظرخواهی", "اعتراض به رأی", "تأمین خواسته", "دستور موقت"],
  "family-law": ["حضانت فرزند", "ملاقات فرزند", "مطالبه مهریه", "مطالبه نفقه"],
  "criminal-procedure": ["دفاع در تحقیقات مقدماتی", "اعتراض به قرار منع تعقیب", "اعتراض به قرار بازداشت", "حقوق متهم در دادسرا"],
  "criminal-life-and-body": ["قتل عمد", "قتل شبه عمد", "ضرب و جرح", "دیه صدمات بدنی", "قصاص"],
  "criminal-property": ["کلاهبرداری", "خیانت در امانت", "سرقت", "انتقال مال غیر"],
  "criminal-financial-public": ["جرایم اقتصادی", "پولشویی", "اختلاس", "جرایم مالیاتی"],
  "criminal-cyber": ["کلاهبرداری اینترنتی", "فیشینگ", "دسترسی غیرمجاز", "انتشار تصاویر خصوصی"],
  "registration-land": ["ابطال سند رسمی", "الزام به تنظیم سند رسمی", "افراز ملک مشاع", "اثبات مالکیت", "اعتراض به عملیات ثبتی"],
  "inheritance-estate": ["انحصار وراثت", "تقسیم ترکه", "مطالبه سهم‌الارث", "اعتبار وصیت‌نامه"],
  "commercial-law": ["ورشکستگی شرکت", "انحلال شرکت", "مسئولیت مدیران شرکت", "اختلاف شرکای تجاری", "ابطال مصوبه مجمع عمومی شرکت", "مطالبه طلب در ورشکستگی", "اعتراض به عملیات تصفیه شرکت", "دعاوی مدیر تصفیه شرکت"],
  "cheques-commercial-papers": ["مطالبه وجه چک", "صدور اجراییه چک", "مطالبه وجه سفته", "واخواست سفته"],
  "enforcement-debt": ["اجرای حکم قطعی", "توقیف اموال", "اعتراض به عملیات اجرایی", "اعسار از پرداخت محکوم‌به"],
  "labor-administrative-tax": ["مطالبه حقوق و مزایا", "اعتراض به رأی اداره کار", "اعتراض به برگ تشخیص مالیات", "شکایت در دیوان عدالت اداری", "اعتراض به بدهی حق بیمه تأمین اجتماعی", "اعتراض به رأی هیأت حل اختلاف مالیاتی", "شکایت از تصمیم یا اقدام دستگاه اجرایی", "مطالبه حقوق و مزایای پایان کار"],
  "insurance-accident-torts": ["مطالبه دیه تصادف", "مطالبه خسارت بیمه", "مسئولیت ناشی از حادثه", "قصور پزشکی", "مطالبه خسارت بدنی از بیمه شخص ثالث", "مطالبه خسارت مالی از بیمه شخص ثالث", "مطالبه خسارت از صندوق تأمین خسارت‌های بدنی", "اعتراض به ارزیابی خسارت بیمه"],
  "construction-urban": ["اعتراض به رأی کمیسیون ماده ۱۰۰", "تغییر کاربری ملک", "اختلاف مالک و سازنده", "الزام به تحویل آپارتمان", "اعتراض به رأی کمیسیون ماده ۷۷ شهرداری", "اعتراض به رأی کمیسیون ماده ۹۹ شهرداری", "ابطال عوارض شهرداری", "الزام شهرداری به صدور پروانه ساختمانی"],
  "intellectual-digital-commerce": ["نقض علامت تجاری", "نقض حقوق مؤلف", "اختلاف قرارداد نرم‌افزار", "مسئولیت فروشگاه اینترنتی"],
  "international-foreign-nationals": ["اجرای حکم خارجی در ایران", "اختلاف قرارداد بین‌المللی", "داوری تجاری بین‌المللی", "حقوق اتباع خارجی"]
});

const LOCAL_SUBJECTS = Object.freeze({
  "lease-shop-tenancy": ["تخلیه مغازه", "سرقفلی", "اختلاف موجر و مستأجر"],
  "civil-contracts-obligations": ["فسخ قرارداد", "مطالبه وجه قرارداد"],
  "civil-procedure": ["تجدیدنظرخواهی", "تأمین خواسته"],
  "family-law": ["مهریه", "حضانت فرزند", "طلاق"],
  "criminal-procedure": ["دفاع در پرونده کیفری", "اعتراض به قرار منع تعقیب"],
  "criminal-life-and-body": ["قتل عمد", "ضرب و جرح", "دیه صدمات بدنی"],
  "criminal-property": ["کلاهبرداری", "خیانت در امانت"],
  "criminal-cyber": ["کلاهبرداری اینترنتی", "دسترسی غیرمجاز"],
  "registration-land": ["ابطال سند رسمی", "الزام به تنظیم سند رسمی", "اثبات مالکیت"],
  "inheritance-estate": ["انحصار وراثت", "تقسیم ترکه"],
  "commercial-law": ["ورشکستگی شرکت", "اختلاف شرکای تجاری"],
  "cheques-commercial-papers": ["مطالبه وجه چک", "مطالبه وجه سفته"],
  "enforcement-debt": ["اجرای حکم قطعی", "اعسار از پرداخت محکوم‌به"],
  "labor-administrative-tax": ["مطالبه حقوق و مزایا", "اعتراض به رأی اداره کار"],
  "insurance-accident-torts": ["مطالبه خسارت تصادف", "مطالبه خسارت بیمه"],
  "construction-urban": ["اعتراض به رأی کمیسیون ماده ۱۰۰", "اختلاف مالک و سازنده"]
});

const COLLOQUIAL_SUBJECTS = Object.freeze({
  "lease-shop-tenancy": ["مستأجرم خونه رو تخلیه نمی‌کنه، چیکار کنم؟", "صاحبخونه پول پیشمو پس نمی‌ده، چطور بگیرمش؟", "مغازه‌مو پس نمی‌ده، از کجا شروع کنم؟", "اجاره‌مو نداده، چطور برای تخلیه اقدام کنم؟"],
  "family-law": ["چطور مهریه‌ام رو بگیرم؟", "همسرم نفقه نمی‌ده، چیکار کنم؟", "اجازه نمی‌ده بچه‌مو ببینم، چه راهی دارم؟", "برای طلاق از کجا باید شروع کنم؟"],
  "cheques-commercial-papers": ["چکم برگشت خورده، حالا چیکار کنم؟", "طرف پولمو پس نمی‌ده، چطور شکایت کنم؟", "سفته‌مو گذاشتن اجرا، چیکار کنم؟", "چک دستمه، چطور پولمو بگیرم؟"],
  "criminal-procedure": ["ازم شکایت شده، باید چیکار کنم؟", "احضاریه دادگاه اومده، حالا چی می‌شه؟", "ابلاغیه ثنا اومده، از کجا بفهمم یعنی چی؟", "برام حکم جلب صادر شده، چه اقدامی می‌تونم بکنم؟", "به قتل متهم شدم، الان چه کار کنم؟", "ازم به خاطر ضرب و جرح شکایت کردن، چیکار کنم؟", "به من توهین کردن، چطور شکایت کنم؟", "به توهین متهم شدم، چطور از خودم دفاع کنم؟", "ازم بابت نشر اکاذیب شکایت شده، چه کنم؟"],
  "registration-land": ["سند خونه رو به نامم نمی‌زنن، چیکار کنم؟", "یکی زمینمو گرفته، چطور پسش بگیرم؟", "ملکمو بدون اجازه فروختن، چه راهی دارم؟", "همسایه راه عبورمو بسته، چطور پیگیری کنم؟", "یکی ملکمو گرفته و پس نمی‌ده، چطور خلع ید بگیرم؟", "مستأجر تخلیه نمی‌کنه، چطور حکم تخلیه بگیرم؟"],
  "inheritance-estate": ["ارثمو نمی‌دن، چطور سهممو بگیرم؟", "یکی از ورثه ملک رو نمی‌فروشه، چیکار کنیم؟", "وصیت‌نامه رو قبول نداریم، چطور اعتراض کنیم؟", "برای تقسیم ارث باید از کجا شروع کنم؟"],
  "labor-administrative-tax": ["اخراجم کردن، حق و حقوقم چیه؟", "کارفرما حقوقمو نمی‌ده، چطور شکایت کنم؟", "بیمه‌ام نکردن، از کجا پیگیری کنم؟", "سنواتمو ندادن، چطور بگیرمش؟"],
  "insurance-accident-torts": ["بیمه خسارتمو نمی‌ده، چیکار کنم؟", "بعد تصادف دیه‌مو چطور بگیرم؟", "مقصر تصادف خسارت ماشینمو نمی‌ده، چه راهی دارم؟", "برای گرفتن خسارت از بیمه از کجا شروع کنم؟"],
  "civil-contracts-obligations": ["قرارداد بستم ولی طرف به قولش عمل نمی‌کنه، چیکار کنم؟", "پول پیش پرداخت رو پس نمی‌دن، چطور پیگیری کنم؟", "طرف معامله زیر قولش زده، چه راه قانونی دارم؟", "از قرارداد پشیمون شدم، می‌تونم فسخش کنم؟"],
  "criminal-property": ["ازم کلاهبرداری کردن، چطور پولمو پس بگیرم؟", "مالمو امانت دادم پس نمی‌ده، چیکار کنم؟", "یکی ازم پول گرفته و جواب نمی‌ده، می‌تونم شکایت کنم؟", "گوشیمو دزدیدن، برای شکایت چیکار کنم؟"]
});

const BASE_POSITIONING_TERMS = Object.freeze([
  { term: "وکیل خوزستان", intent: "regional-attorney-discovery", claimRisk: "low", clusterId: "lawyer-core" },
  { term: "وکیل اهواز", intent: "local-attorney-discovery", claimRisk: "low", clusterId: "lawyer-core" },
  { term: "وکیل حقوقی اهواز", intent: "local-attorney-discovery", claimRisk: "low", clusterId: "lawyer-core" },
  { term: "وکیل پایه یک دادگستری اهواز", intent: "credential-search", claimRisk: "credential-verification", clusterId: "lawyer-core" },
  { term: "وکیل دادگستری خوزستان", intent: "regional-attorney-discovery", claimRisk: "credential-verification", clusterId: "lawyer-core" },
  { term: "وکیل پایه یک خوزستان", intent: "regional-attorney-discovery", claimRisk: "credential-verification", clusterId: "lawyer-core" },
  { term: "بهترین وکیل اهواز", intent: "superlative-comparison", claimRisk: "high" },
  { term: "بهترین وکیل خوزستان", intent: "superlative-comparison", claimRisk: "high" },
  { term: "بهترین وکیل پایه یک دادگستری", intent: "superlative-comparison", claimRisk: "high" },
  { term: "مشاوره فوری وکیل", intent: "urgent-consultation", claimRisk: "service-availability", clusterId: "legal-consultation" },
  { term: "مشاوره حقوقی فوری اهواز", intent: "urgent-consultation", claimRisk: "service-availability", clusterId: "legal-consultation" },
  { term: "وکیل نابغه", intent: "hyperbolic-brand-language", claimRisk: "high" },
  { term: "نابغه وکالت", intent: "hyperbolic-brand-language", claimRisk: "high" },
  { term: "وکیل باتجربه اهواز", intent: "experience-comparison", claimRisk: "evidence-required", clusterId: "lawyer-core" },
  { term: "وکیل مجرب خوزستان", intent: "experience-comparison", claimRisk: "evidence-required", clusterId: "lawyer-core" },
  { term: "وکیل خوب اهواز", intent: "quality-comparison", claimRisk: "subjective", clusterId: "lawyer-core" },
  { term: "وکیل معتبر اهواز", intent: "trust-comparison", claimRisk: "evidence-required", clusterId: "lawyer-core" },
  { term: "وکیل متخصص اهواز", intent: "specialization-claim", claimRisk: "high" },
  { term: "بهترین وکیل ملکی اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "registration-land" },
  { term: "بهترین وکیل دعاوی ملکی اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "registration-land" },
  { term: "بهترین وکیل ملکی در اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "registration-land", observedInGsc: true },
  { term: "بهترین وکیل خلع ید و تخلیه در اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "registration-land", observedInGsc: true },
  { term: "بهترین وکیل خلع ید اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "registration-land" },
  { term: "بهترین وکیل تخلیه ید اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "lease-shop-tenancy" },
  { term: "بهترین وکیل تخلیه ملک اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "lease-shop-tenancy" },
  { term: "بهترین وکیل کیفری اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-procedure" },
  { term: "بهترین وکیل قتل اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-life-and-body" },
  { term: "بهترین وکیل پرونده قتل اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-life-and-body" },
  { term: "بهترین وکیل ضرب و جرح اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-life-and-body" },
  { term: "بهترین وکیل جراحات اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-life-and-body" },
  { term: "بهترین وکیل توهین و افترا اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-other" },
  { term: "بهترین وکیل جرایم قتل اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-life-and-body" },
  { term: "بهترین وکیل جرایم جراحات اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-life-and-body" },
  { term: "بهترین وکیل جرایم توهین اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-other" },
  { term: "بهترین وکیل خانواده اهواز", intent: "superlative-family-comparison", claimRisk: "high", clusterId: "family-law" },
  { term: "بهترین وکیل طلاق اهواز", intent: "superlative-family-comparison", claimRisk: "high", clusterId: "family-law" },
  { term: "بهترین وکیل مهریه اهواز", intent: "superlative-family-comparison", claimRisk: "high", clusterId: "family-law" },
  { term: "بهترین وکیل حضانت اهواز", intent: "superlative-family-comparison", claimRisk: "high", clusterId: "family-law" },
  { term: "بهترین وکیل سرقفلی اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "lease-shop-tenancy" },
  { term: "بهترین وکیل اجاره مغازه اهواز", intent: "superlative-property-comparison", claimRisk: "high", clusterId: "lease-shop-tenancy" },
  { term: "بهترین وکیل قرارداد اهواز", intent: "superlative-contract-comparison", claimRisk: "high", clusterId: "civil-contracts-obligations" },
  { term: "بهترین وکیل چک برگشتی اهواز", intent: "superlative-debt-comparison", claimRisk: "high", clusterId: "cheques-commercial-papers" },
  { term: "بهترین وکیل کلاهبرداری اهواز", intent: "superlative-criminal-comparison", claimRisk: "high", clusterId: "criminal-property" },
  { term: "معیارهای انتخاب بهترین وکیل ملکی در اهواز چیست؟", intent: "neutral-selection-guide", claimRisk: "low", clusterId: "registration-land", neutralUseOnly: true },
  { term: "چطور بهترین وکیل خانواده در اهواز را انتخاب کنم؟", intent: "neutral-selection-guide", claimRisk: "low", clusterId: "family-law", neutralUseOnly: true },
  { term: "برای انتخاب بهترین وکیل کیفری در اهواز چه معیارهایی مهم است؟", intent: "neutral-selection-guide", claimRisk: "low", clusterId: "criminal-procedure", neutralUseOnly: true }

]);

const USER_RESEARCH_COMPARISON_PREFIXES = Object.freeze([
  "بهترین", "برترین", "حرفه‌ای‌ترین", "حرفه ای ترین", "حرفه‌ای ترین",
  "متخصص‌ترین", "متخصص ترین", "باتجربه‌ترین", "باتجربه ترین",
  "با‌تجربه‌ترین", "با تجربه‌ترین", "معتبرترین", "معتبر ترین",
  "مجرب‌ترین", "مجرب ترین", "کاربلدترین", "خبره‌ترین",
  "سرشناس‌ترین", "معروف‌ترین", "توانمندترین", "خوش‌نام‌ترین",
  "متبحرترین", "باسابقه‌ترین", "برجسته‌ترین", "ممتازترین", "نخبه‌ترین"
]);

const USER_RESEARCH_QUALIFIERS = Object.freeze([
  "خوب", "حرفه‌ای", "حرفه ای", "متخصص", "باتجربه", "با تجربه",
  "مجرب", "معتبر", "کاربلد", "خبره", "سرشناس", "معروف",
  "توانمند", "خوش‌نام", "باسابقه", "برجسته", "ممتاز", "متبحر"
]);

const SERVICE_POSITIONING_SUBJECTS = Object.freeze([
  { subject: "کیفری", clusterId: "criminal-procedure" },
  { subject: "جنایی", clusterId: "criminal-life-and-body" },
  { subject: "حقوقی", clusterId: "civil-law-eight-domains" },
  { subject: "مدنی", clusterId: "civil-law-eight-domains" },
  { subject: "خانواده", clusterId: "family-law" },
  { subject: "طلاق", clusterId: "family-law" },
  { subject: "مهریه", clusterId: "family-law" },
  { subject: "حضانت", clusterId: "family-law" },
  { subject: "ملکی", clusterId: "registration-land" },
  { subject: "دعاوی ملکی", clusterId: "registration-land" },
  { subject: "ثبتی", clusterId: "registration-land" },
  { subject: "قرارداد", clusterId: "civil-contracts-obligations" },
  { subject: "چک و مطالبه وجه", clusterId: "cheques-commercial-papers" },
  { subject: "چک برگشتی", clusterId: "cheques-commercial-papers" },
  { subject: "مطالبه مطالبات", clusterId: "enforcement-debt" },
  { subject: "مشاوره حقوقی", clusterId: "legal-consultation" }
]);

const FUTURE_POSITIONING_SUBJECTS = Object.freeze([
  { subject: "اداره کار", clusterId: "labor-administrative-tax" },
  { subject: "کارگر و کارفرما", clusterId: "labor-administrative-tax" },
  { subject: "تأمین اجتماعی", clusterId: "labor-administrative-tax" },
  { subject: "مالیاتی", clusterId: "labor-administrative-tax" },
  { subject: "دیوان عدالت اداری", clusterId: "labor-administrative-tax" },
  { subject: "بیمه", clusterId: "insurance-accident-torts" },
  { subject: "قصور پزشکی", clusterId: "insurance-accident-torts" },
  { subject: "تصادفات", clusterId: "insurance-accident-torts" },
  { subject: "گمرک", clusterId: "international-foreign-nationals" },
  { subject: "مهاجرت", clusterId: "international-foreign-nationals" },
  { subject: "مالکیت فکری", clusterId: "intellectual-digital-commerce" },
  { subject: "تجاری", clusterId: "commercial-law" },
  { subject: "ارث", clusterId: "inheritance-estate" },
  { subject: "ورزشی", clusterId: "commercial-law" },
  { subject: "رسانه", clusterId: "intellectual-digital-commerce" },
  { subject: "رمزارز", clusterId: "criminal-cyber" }
]);

const KHUZESTAN_SEARCH_LOCATIONS = Object.freeze([
  "اهواز", "خوزستان", "آبادان", "خرمشهر", "دزفول", "شوشتر", "اندیمشک",
  "ماهشهر", "بندر امام خمینی", "بهبهان", "رامهرمز", "ایذه",
  "مسجدسلیمان", "شوش", "هویزه", "سوسنگرد", "شادگان",
  "امیدیه", "آغاجاری", "هندیجان", "دشت آزادگان", "باغ‌ملک",
  "لالی", "گتوند", "حمیدیه", "باوی", "کارون", "اندیکا",
  "رامشیر", "هفتکل", "زیتون", "زیتون کارمندی", "کیانپارس", "کیان پارس", "امانیه",
  "گلستان", "نادری", "کیان‌آباد", "لشکرآباد", "کوروش", "پادادشهر"
]);

const AHWAZ_NEIGHBORHOOD_SEARCH_LOCATIONS = Object.freeze([
  "کیانپارس", "کیان پارس", "امانیه", "زیتون", "زیتون کارمندی", "گلستان"
]);

function buildUserResearchPositioningTerms() {
  const entries = [];
  const highRisk = (term, clusterId, location = undefined) => ({
    term,
    intent: "user-research-comparison",
    claimRisk: "high",
    clusterId,
    ...(location ? { location } : {}),
    userResearchSeed: true
  });

  for (const { subject, clusterId } of SERVICE_POSITIONING_SUBJECTS) {
    for (const modifier of USER_RESEARCH_COMPARISON_PREFIXES) {
      entries.push(highRisk(`${modifier} وکیل ${subject} اهواز`, clusterId, "اهواز"));
      entries.push(highRisk(`${modifier} وکیل ${subject} در اهواز`, clusterId, "اهواز"));
    }
    for (const qualifier of USER_RESEARCH_QUALIFIERS) {
      entries.push(highRisk(`وکیل ${subject} ${qualifier} در اهواز`, clusterId, "اهواز"));
    }
  }

  for (const { subject, clusterId } of FUTURE_POSITIONING_SUBJECTS) {
    for (const modifier of ["بهترین", "برترین", "حرفه‌ای‌ترین", "حرفه ای ترین", "متخصص‌ترین", "باتجربه‌ترین", "معتبرترین"]) {
      entries.push(highRisk(`${modifier} وکیل ${subject} اهواز`, clusterId, "اهواز"));
      entries.push(highRisk(`${modifier} وکیل ${subject} در اهواز`, clusterId, "اهواز"));
    }
    for (const qualifier of ["حرفه‌ای", "متخصص", "باتجربه", "مجرب", "معتبر", "کاربلد"]) {
      entries.push(highRisk(`وکیل ${subject} ${qualifier} در اهواز`, clusterId, "اهواز"));
    }
  }

  const ahvazCoreLocations = new Set([
    "اهواز", "خوزستان", "زیتون", "زیتون کارمندی", "کیانپارس", "کیان پارس",
    "امانیه", "گلستان", "نادری", "کیان‌آباد", "لشکرآباد", "کوروش", "پادادشهر"
  ]);
  for (const city of KHUZESTAN_SEARCH_LOCATIONS) {
    const ownerCluster = ahvazCoreLocations.has(city) ? "lawyer-core" : null;
    entries.push(
      highRisk(`وکیل ${city}`, ownerCluster, city),
      highRisk(`وکیل در ${city}`, ownerCluster, city)
    );
    for (const modifier of USER_RESEARCH_COMPARISON_PREFIXES) {
      entries.push(highRisk(`${modifier} وکیل ${city}`, ownerCluster, city));
      entries.push(highRisk(`${modifier} وکیل در ${city}`, ownerCluster, city));
    }
    for (const qualifier of USER_RESEARCH_QUALIFIERS) {
      entries.push(highRisk(`وکیل ${qualifier} ${city}`, ownerCluster, city));
      entries.push(highRisk(`وکیل ${qualifier} در ${city}`, ownerCluster, city));
    }
  }

  for (const neighborhood of AHWAZ_NEIGHBORHOOD_SEARCH_LOCATIONS) {
    const location = `${neighborhood} اهواز`;
    entries.push(
      highRisk(`وکیل ${neighborhood}`, "lawyer-core", location),
      highRisk(`وکیل در ${neighborhood}`, "lawyer-core", location),
      highRisk(`وکیل ${location}`, "lawyer-core", location),
      highRisk(`وکیل در ${neighborhood} اهواز`, "lawyer-core", location),
      highRisk(`دفتر وکالت ${neighborhood}`, "lawyer-core", location),
      highRisk(`دفتر وکالت ${neighborhood} اهواز`, "lawyer-core", location),
      highRisk(`دفتر وکالت در ${neighborhood} اهواز`, "lawyer-core", location)
    );

    for (const modifier of USER_RESEARCH_COMPARISON_PREFIXES) {
      entries.push(
        highRisk(`${modifier} وکیل ${neighborhood} اهواز`, "lawyer-core", location),
        highRisk(`${modifier} وکیل در ${neighborhood} اهواز`, "lawyer-core", location)
      );
    }

    for (const qualifier of USER_RESEARCH_QUALIFIERS) {
      entries.push(
        highRisk(`وکیل ${qualifier} ${neighborhood} اهواز`, "lawyer-core", location),
        highRisk(`وکیل ${qualifier} در ${neighborhood} اهواز`, "lawyer-core", location)
      );
    }

    for (const { subject, clusterId } of [...SERVICE_POSITIONING_SUBJECTS, ...FUTURE_POSITIONING_SUBJECTS]) {
      for (const modifier of USER_RESEARCH_COMPARISON_PREFIXES) {
        entries.push(
          highRisk(`${modifier} وکیل ${subject} ${neighborhood} اهواز`, clusterId, location),
          highRisk(`${modifier} وکیل ${subject} در ${neighborhood} اهواز`, clusterId, location)
        );
      }
      for (const qualifier of USER_RESEARCH_QUALIFIERS) {
        entries.push(
          highRisk(`وکیل ${subject} ${qualifier} در ${neighborhood} اهواز`, clusterId, location)
        );
      }
    }
  }

  for (const term of [
    "بهترین وکیل ایران", "بهترین وکیل در ایران", "معروف‌ترین وکیل ایران",
    "برترین وکیل ایران", "وکیل حرفه‌ای ایران", "حرفه‌ای‌ترین وکیل ایران",
    "بهترین وکیل پایه یک دادگستری در اهواز", "بهترین وکیل دادگستری اهواز",
    "وکیل دادگستری در اهواز", "وکیل رسمی دادگستری اهواز",
    "وکیل خوب و قابل اعتماد در اهواز", "وکیل متخصص دعاوی در اهواز",
    "وکیل مجرب و باتجربه اهواز", "مشاوره حقوقی در اهواز",
    "بهترین وکیل در اهواز", "وکیل خوب در اهواز", "وکیل حرفه‌ای در اهواز",
    "وکیل باتجربه در اهواز", "وکیل متخصص در اهواز", "وکیل برجسته اهواز",
    "وکیل سرشناس اهواز", "وکیل معروف اهواز", "معروف‌ترین وکیل اهواز",
    "وکیل معتبر اهواز", "وکیل مجرب اهواز", "وکیل کاربلد اهواز",
    "وکیل خبره اهواز", "وکیل توانمند اهواز", "وکیل خوش‌نام اهواز",
    "وکیل باسابقه اهواز", "وکیل متبحر اهواز", "وکیل مسلط به قوانین و مقررات و رویه قضایی اهواز",
    "دفتر وکالت در اهواز", "بهترین دفتر وکالت اهواز", "بهترین دفتر وکالت در اهواز", "بهترین مشاور حقوقی اهواز",
    "مشاور حقوقی حرفه‌ای اهواز", "مشاور حقوقی باتجربه اهواز", "وکیل آقا در اهواز",
    "وکیل خانم در اهواز", "وکیل زن در اهواز", "وکیل مرد در اهواز",
    "وکیل شبانه‌روزی اهواز", "وکیل فوری اهواز", "مشاوره حقوقی تلفنی اهواز",
    "مشاوره حقوقی آنلاین اهواز", "مشاوره حقوقی حضوری اهواز", "هزینه مشاوره حقوقی اهواز",
    "حق‌الوکاله مناسب اهواز", "وکیل برای پرونده کیفری اهواز", "وکیل برای پرونده ملکی اهواز",
    "وکیل برای پرونده خانوادگی اهواز", "وکیل نزدیک من اهواز", "رتبه اول وکلا",
    "وکیل رتبه یک ایران", "استاد فن دفاع حقوقی", "وکیل نابغه حقوق", "حرفه‌ای‌ترین وکیل اهواز", "متخصص‌ترین وکیل اهواز", "وکیل نابغه اهواز", "استاد فن دفاع حقوقی اهواز", "وکیل ممتاز", "وکیل ممتاز اهواز", "وکیل نخبه", "وکیل نخبه اهواز", "وکیل کارآزموده", "وکیل کارآزموده اهواز", "وکیل هوشمند", "وکیل هوشمند اهواز", "وکیل شناخته‌شده", "وکیل شناخته‌شده اهواز", "وکیل متخصص و باتجربه", "وکیل متخصص و باتجربه اهواز", "نابغه حقوق", "وکیل متبحر", "وکیل متبحر اهواز", "وکیل خوش‌نام"
  ]) {
    entries.push(highRisk(term, "lawyer-core", "اهواز"));
  }

  return entries;
}

const POSITIONING_TERMS = Object.freeze([
  ...BASE_POSITIONING_TERMS,
  ...buildUserResearchPositioningTerms()
]);

const QUESTION_TEMPLATES = Object.freeze([
  (subject) => `${subject} چیست؟`,
  (subject) => `شرایط قانونی ${subject} چیست؟`,
  (subject) => `مراحل ${subject} چگونه است؟`,
  (subject) => `مدارک لازم برای ${subject} چیست؟`
]);

export function normalizeKeywordQuery(value) {
  return normalizePersianSearchText(value);
}

function basePhrase(term) {
  const value = String(term ?? "").trim();
  if (/^وکیل\s+پایه\s+یک\s+دادگستری$/u.test(value)) return null;
  let candidate = value.replace(/^وکیل\s+پایه\s+یک\s+دادگستری\s+/u, "");
  if (candidate === value) candidate = value.replace(/^وکیل\s+/u, "");
  if (!candidate || candidate === value || /^(برای|در|از|با)\s/u.test(candidate)) return null;
  return candidate;
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = [entry.clusterId || "all", entry.family || "all", normalizeKeywordQuery(entry.term)].join(":");
    if (!entry.term || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLocalEntries(clusters = seoKeywordLibrary.clusters) {
  const locations = Array.isArray(seoKeywordLibrary.khuzestanLocations)
    ? seoKeywordLibrary.khuzestanLocations
    : [];

  return clusters.flatMap((cluster) => (LOCAL_SUBJECTS[cluster.id] || []).flatMap((subject) => (
    locations.flatMap(({ fa: city }) => {
      if (!city) return [];
      const shared = {
        clusterId: cluster.id,
        clusterTitle: cluster.title,
        target: cluster.target,
        intent: cluster.intent,
        coverage: cluster.coverage,
        location: city
      };
      return [
        { ...shared, term: `وکیل ${subject} در ${city}`, family: "local", origin: "local-derived-candidate" },
        { ...shared, term: `${subject} در ${city}`, family: "local", origin: "local-derived-candidate" }
      ];
    })
  )));
}

export function getKeywordLibrarySnapshot(taxonomyEntries = []) {
  const clusters = seoKeywordLibrary.clusters;
  const lawyerCount = clusters.reduce((total, cluster) => total + cluster.fa.length, 0);
  const englishCount = clusters.reduce((total, cluster) => total + cluster.en.length, 0);
  const baseCount = uniqueEntries(clusters.flatMap((cluster) => cluster.fa
    .map(basePhrase)
    .filter(Boolean)
    .map((term) => ({ term })))).length;
  const problemCount = Object.values(PROBLEM_SUBJECTS).reduce((total, subjects) => total + subjects.length * QUESTION_TEMPLATES.length, 0);
  const localPhraseCount = buildLocalEntries().length;
  const positioningPhraseCount = POSITIONING_TERMS.length;
  const colloquialPhraseCount = Object.values(COLLOQUIAL_SUBJECTS).reduce((total, terms) => total + terms.length, 0);
  const legalRecords = Array.isArray(taxonomyEntries) ? taxonomyEntries : [];
  const legalBaseTerms = legalRecords.flatMap((record) => [
    record.canonical, record.searchTitle, ...(record.aliases || [])
  ]).filter((term) => term && !term.startsWith("وکیل "));
  const legalQuestionTerms = legalRecords.flatMap((record) => record.searchPhrases || []).filter(Boolean);
  const legalLawyerTerms = legalRecords
    .filter((record) => record.category !== "CRM")
    .flatMap((record) => [record.canonical, ...(record.aliases || [])])
    .filter((term) => term && !term.startsWith("وکیل "))
    .map((term) => `وکیل ${term}`);
  const legalBaseCount = uniqueEntries(legalBaseTerms.map((term) => ({ term }))).length;
  const legalLawyerCount = uniqueEntries(legalLawyerTerms.map((term) => ({ term }))).length;
  const legalQuestionCount = uniqueEntries(legalQuestionTerms.map((term) => ({ term }))).length;
  const methodology = seoKeywordLibrary.methodology || {};
  const gscObserved = methodology.gscObserved || {};
  const metricsStatus = methodology.researchStatus === "candidate-ideas-not-volume-validated"
    ? "پیشنهادی؛ حجم جست‌وجو و سختی تأیید نشده"
    : String(methodology.researchStatus || "نامشخص");
  const gscStatus = gscObserved.queryRows > 0
    ? `متصل؛ ${gscObserved.queryRows} عبارت و ${gscObserved.pageRows || 0} صفحه قابل مشاهده؛ عبارت‌های کم‌حجم یا ناشناس در گزارش کامل نیستند`
    : String(gscObserved.status || "نامشخص");

  return Object.freeze({
    version: seoKeywordLibrary.schemaVersion,
    generatedAt: seoKeywordLibrary.generatedAt,
    clusterCount: clusters.length,
    lawyerPhraseCount: lawyerCount,
    basePhraseCount: baseCount,
    problemPhraseCount: problemCount,
    localPhraseCount,
    positioningPhraseCount,
    colloquialPhraseCount,
    englishPhraseCount: englishCount,
    locationCount: seoKeywordLibrary.khuzestanLocations.length,
    legalTermCount: legalRecords.length,
    legalBasePhraseCount: legalBaseCount,
    legalLawyerPhraseCount: legalLawyerCount,
    legalQuestionPhraseCount: legalQuestionCount,
    legalTermsPendingReview: legalRecords.filter((record) => record.reviewStatus !== "verified_primary_source").length,
    metricsStatus,
    gscStatus,
    totalCandidateCount: lawyerCount + baseCount + problemCount + englishCount
      + legalBaseCount + legalLawyerCount + legalQuestionCount + localPhraseCount + positioningPhraseCount + colloquialPhraseCount
  });
}

export function getKeywordLibraryClusters() {
  return seoKeywordLibrary.clusters.map(({ id, title, target, intent, coverage }) => ({
    id, title, target, intent, coverage
  }));
}

/**
 * Builds an editorial SEO brief from one selected taxonomy cluster.
 * Candidate phrases are planning inputs, not measured search demand.
 */
export function getKeywordClusterSeoBrief({
  clusterId,
  focusKeyword = "",
  taxonomyEntries = [],
  limit = 12
} = {}) {
  const cluster = seoKeywordLibrary.clusters.find((item) => item.id === clusterId);
  if (!cluster) return null;

  const normalizedFocus = normalizeKeywordQuery(focusKeyword);
  const familyPriority = { problem: 0, colloquial: 1, base: 2, lawyer: 3 };
  const localNames = ["خوزستان", ...seoKeywordLibrary.khuzestanLocations.map(({ fa }) => fa)]
    .map(normalizeKeywordQuery);
  const complianceRiskPattern = /بهترین|برترین|نابغه|متخصص|تخصص|تضمینی|تضمین نتیجه|نتیجه تضمینی|صددرصد|نتیجه قطعی|فوری|معجزه/;
  const candidates = searchKeywordLibrary({
    clusterId,
    family: "all",
    language: "fa",
    taxonomyEntries
  })
    .filter((entry) => ["base", "problem", "colloquial", "lawyer"].includes(entry.family))
    .filter((entry) => !entry.legalReviewStatus || entry.legalReviewStatus === "verified_primary_source")
    .filter((entry) => !complianceRiskPattern.test(entry.term))
    .filter((entry) => !localNames.some((location) => normalizeKeywordQuery(entry.term).includes(location)))
    .filter((entry) => normalizeKeywordQuery(entry.term) !== normalizedFocus)
    .sort((left, right) => (
      (familyPriority[left.family] ?? 99) - (familyPriority[right.family] ?? 99)
      || left.term.localeCompare(right.term, "fa")
    ));

  const seen = new Set(normalizedFocus ? [normalizedFocus] : []);
  const relatedKeywords = [];
  for (const entry of candidates) {
    const key = normalizeKeywordQuery(entry.term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    relatedKeywords.push(entry.term);
    if (relatedKeywords.length >= Math.max(0, Math.min(20, Number(limit) || 0))) break;
  }

  return Object.freeze({
    clusterId: cluster.id,
    clusterTitle: cluster.title,
    target: cluster.target,
    intent: cluster.intent,
    focusKeyword: String(focusKeyword || "").trim(),
    relatedKeywords,
    evidenceStatus: "candidate-only",
    note: "عبارت‌های پیشنهادی کتابخانه‌اند؛ حجم جست‌وجو، رتبه و تقاضای واقعی ایران را اثبات نمی‌کنند."
  });
}

export function searchKeywordLibrary({ query = "", clusterId = "all", family = "all", language = "fa", taxonomyEntries = [] } = {}) {
  const clusters = seoKeywordLibrary.clusters.filter((cluster) => clusterId === "all" || cluster.id === clusterId);
  const clusterById = new Map(seoKeywordLibrary.clusters.map((cluster) => [cluster.id, cluster]));
  const entries = [];

  if (language !== "en" && (family === "all" || family === "positioning")) {
    for (const item of POSITIONING_TERMS) {
      const targetCluster = item.clusterId ? clusterById.get(item.clusterId) : null;
      const effectiveClusterId = targetCluster?.id || "general-attorney-selection";
      if (clusterId !== "all" && clusterId !== effectiveClusterId) continue;

      entries.push({
        clusterId: effectiveClusterId,
        clusterTitle: targetCluster?.title || "جست‌وجوی عمومی و انتخاب وکیل",
        target: targetCluster?.target || "محتوای آتی",
        intent: item.intent,
        coverage: targetCluster?.coverage || "عبارت‌های عمومی و مقایسه‌ای برای پژوهش داخلی",
        term: item.term,
        family: "positioning",
        origin: "curated-search-language-candidate",
        claimRisk: item.claimRisk,
        ...(item.location ? { location: item.location } : {}),
        userResearchSeed: item.userResearchSeed === true,
        observedInGsc: item.observedInGsc === true,
        requiresComplianceReview: true,
        neutralUseOnly: true
      });
    }
  }

  for (const cluster of clusters) {
    const shared = {
      clusterId: cluster.id,
      clusterTitle: cluster.title,
      target: cluster.target,
      intent: cluster.intent,
      coverage: cluster.coverage
    };

    if (language === "en") {
      if (family === "all" || family === "lawyer" || family === "base") {
        for (const term of cluster.en) entries.push({ ...shared, term, family: "english", origin: "curated" });
      }
      continue;
    }

    if (family === "all" || family === "lawyer") {
      for (const term of cluster.fa) entries.push({ ...shared, term, family: "lawyer", origin: "curated" });
    }

    if (family === "all" || family === "base") {
      for (const term of cluster.fa) {
        const candidate = basePhrase(term);
        if (candidate) entries.push({ ...shared, term: candidate, family: "base", origin: "derived-candidate" });
      }
    }

    if (family === "all" || family === "colloquial") {
      for (const term of COLLOQUIAL_SUBJECTS[cluster.id] || []) {
        entries.push({ ...shared, term, family: "colloquial", origin: "curated-colloquial-problem-language", requiresEditorialReview: true });
      }
    }

    if (family === "all" || family === "problem") {
      const subjects = PROBLEM_SUBJECTS[cluster.id] || [];
      for (const subject of subjects) {
        for (const makePhrase of QUESTION_TEMPLATES) {
          entries.push({ ...shared, term: makePhrase(subject), family: "problem", origin: "generated-template" });
        }
      }
    }
  }

  if (language !== "en" && (family === "all" || family === "local")) {
    entries.push(...buildLocalEntries(clusters));
  }

  if (language !== "en") {
    for (const record of Array.isArray(taxonomyEntries) ? taxonomyEntries : []) {
      const cluster = clusterById.get(record.clusterId);
      if (!cluster || (clusterId !== "all" && cluster.id !== clusterId)) continue;
      const shared = {
        clusterId: cluster.id,
        clusterTitle: cluster.title,
        target: cluster.target,
        intent: cluster.intent,
        coverage: cluster.coverage,
        legalReviewStatus: record.reviewStatus,
        legalTermId: record.id
      };
      const baseTerms = [record.canonical, record.searchTitle, ...(record.aliases || [])]
        .filter((term) => term && !term.startsWith("وکیل "));

      if (family === "all" || family === "base") {
        for (const term of baseTerms) {
          entries.push({ ...shared, term, family: "base", origin: "legal-taxonomy-candidate" });
        }
      }

      if ((family === "all" || family === "lawyer") && record.category !== "CRM") {
        for (const term of [record.canonical, ...(record.aliases || [])].filter(Boolean)) {
          if (!term.startsWith("وکیل ")) {
            entries.push({ ...shared, term: `وکیل ${term}`, family: "lawyer", origin: "generated-lawyer-candidate" });
          }
        }
      }

      if (family === "all" || family === "problem") {
        for (const term of record.searchPhrases || []) {
          entries.push({ ...shared, term, family: "problem", origin: "legal-taxonomy-question" });
        }
      }
    }
  }

  const unique = uniqueEntries(entries);
  const normalizedQuery = normalizeKeywordQuery(query);
  return unique
    .filter((entry) => !normalizedQuery || normalizeKeywordQuery([
      entry.term, entry.clusterTitle, entry.target
    ].join(" ")).includes(normalizedQuery))
    .sort((left, right) => left.clusterTitle.localeCompare(right.clusterTitle, "fa") || left.term.localeCompare(right.term, "fa"));
}

export const keywordLibraryProvenance = Object.freeze({
  lawyer: "عبارت‌های وکیل‌محورِ ثبت‌شده یا تولیدشده از اصطلاحات کتابخانه؛ به معنی حجم یا رتبه تأییدشده نیستند.",
  base: "شامل عبارت‌های پایه و اصطلاحات کتابخانه حقوقی است؛ اصطلاحات دارای وضعیت نیازمند بازبینی نباید به‌عنوان محتوای حقوقی تأییدشده استفاده شوند.",
  problem: "قالب‌های پیشنهادی تحریریه و پرسش‌های ذخیره‌شده در کتابخانه حقوقی؛ این‌ها عبارت واقعی ثبت‌شده در Google یا دارای حجم جست‌وجوی اثبات‌شده نیستند.",
  local: "ترکیب محدود موضوعات خدماتی با ۳۰ موقعیت خوزستان؛ ایده پژوهشی برای جست‌وجوی منطقه‌ای است و وجود دفتر فیزیکی یا تقاضای واقعی در آن شهر را اثبات نمی‌کند.",
  english: "عبارت‌های انگلیسی برای نگهداری و پژوهش داخلی؛ بدون اثبات تقاضای بازار ایران.",
  colloquial: "پرسش‌ها و صورت‌بندی‌های محاوره‌ای مردم برای بیان مسئله؛ بر پایه الگوهای پرسش عمومی و نمونه‌های منتشرشده، نه داده مستقیم حجم جست‌وجو. پیش از استفاده محتوایی باید با زبان واقعی مخاطب و صحت حقوقی بازبینی شوند.",
  positioning: "عبارت‌های عمومی و مقایسه‌ای، از جمله جست‌وجوهای دارای «بهترین وکیل»، برای تحلیل نیت جست‌وجو هستند؛ هرگز مجوز ادعای برتری، تخصص یا نتیجه درباره وکیل نیستند. این خانواده همیشه نیازمند بازبینی و استفاده خنثی و معیارمحور است.",
  legal: "اصطلاحات و پرسش‌های واردشده از بانک حقوقی داخلی؛ وضعیت اعتبار حقوقی آن‌ها باید پیش از هر انتشار جداگانه بررسی شود."
});
