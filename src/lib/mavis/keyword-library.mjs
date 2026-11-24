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
  "criminal-procedure": ["ازم شکایت شده، باید چیکار کنم؟", "احضاریه دادگاه اومده، حالا چی می‌شه؟", "ابلاغیه ثنا اومده، از کجا بفهمم یعنی چی؟", "برام حکم جلب صادر شده، چه اقدامی می‌تونم بکنم؟"],
  "registration-land": ["سند خونه رو به نامم نمی‌زنن، چیکار کنم؟", "یکی زمینمو گرفته، چطور پسش بگیرم؟", "ملکمو بدون اجازه فروختن، چه راهی دارم؟", "همسایه راه عبورمو بسته، چطور پیگیری کنم؟"],
  "inheritance-estate": ["ارثمو نمی‌دن، چطور سهممو بگیرم؟", "یکی از ورثه ملک رو نمی‌فروشه، چیکار کنیم؟", "وصیت‌نامه رو قبول نداریم، چطور اعتراض کنیم؟", "برای تقسیم ارث باید از کجا شروع کنم؟"],
  "labor-administrative-tax": ["اخراجم کردن، حق و حقوقم چیه؟", "کارفرما حقوقمو نمی‌ده، چطور شکایت کنم؟", "بیمه‌ام نکردن، از کجا پیگیری کنم؟", "سنواتمو ندادن، چطور بگیرمش؟"],
  "insurance-accident-torts": ["بیمه خسارتمو نمی‌ده، چیکار کنم؟", "بعد تصادف دیه‌مو چطور بگیرم؟", "مقصر تصادف خسارت ماشینمو نمی‌ده، چه راهی دارم؟", "برای گرفتن خسارت از بیمه از کجا شروع کنم؟"],
  "civil-contracts-obligations": ["قرارداد بستم ولی طرف به قولش عمل نمی‌کنه، چیکار کنم؟", "پول پیش پرداخت رو پس نمی‌دن، چطور پیگیری کنم؟", "طرف معامله زیر قولش زده، چه راه قانونی دارم؟", "از قرارداد پشیمون شدم، می‌تونم فسخش کنم؟"],
  "criminal-property": ["ازم کلاهبرداری کردن، چطور پولمو پس بگیرم؟", "مالمو امانت دادم پس نمی‌ده، چیکار کنم؟", "یکی ازم پول گرفته و جواب نمی‌ده، می‌تونم شکایت کنم؟", "گوشیمو دزدیدن، برای شکایت چیکار کنم؟"]
});

const POSITIONING_TERMS = Object.freeze([
  { term: "وکیل خوزستان", intent: "regional-attorney-discovery", claimRisk: "low" },
  { term: "وکیل اهواز", intent: "local-attorney-discovery", claimRisk: "low" },
  { term: "وکیل حقوقی اهواز", intent: "local-attorney-discovery", claimRisk: "low" },
  { term: "وکیل پایه یک دادگستری اهواز", intent: "credential-search", claimRisk: "credential-verification" },
  { term: "وکیل دادگستری خوزستان", intent: "regional-attorney-discovery", claimRisk: "credential-verification" },
  { term: "وکیل پایه یک خوزستان", intent: "regional-attorney-discovery", claimRisk: "credential-verification" },
  { term: "بهترین وکیل اهواز", intent: "superlative-comparison", claimRisk: "high" },
  { term: "بهترین وکیل خوزستان", intent: "superlative-comparison", claimRisk: "high" },
  { term: "بهترین وکیل پایه یک دادگستری", intent: "superlative-comparison", claimRisk: "high" },
  { term: "مشاوره فوری وکیل", intent: "urgent-consultation", claimRisk: "service-availability" },
  { term: "مشاوره حقوقی فوری اهواز", intent: "urgent-consultation", claimRisk: "service-availability" },
  { term: "وکیل نابغه", intent: "hyperbolic-brand-language", claimRisk: "high" },
  { term: "نابغه وکالت", intent: "hyperbolic-brand-language", claimRisk: "high" },
  { term: "وکیل باتجربه اهواز", intent: "experience-comparison", claimRisk: "evidence-required" },
  { term: "وکیل مجرب خوزستان", intent: "experience-comparison", claimRisk: "evidence-required" },
  { term: "وکیل خوب اهواز", intent: "quality-comparison", claimRisk: "subjective" },
  { term: "وکیل معتبر اهواز", intent: "trust-comparison", claimRisk: "evidence-required" },
  { term: "وکیل متخصص اهواز", intent: "specialization-claim", claimRisk: "high" }
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
  const familyPriority = { base: 0, problem: 1, colloquial: 2, lawyer: 3 };
  const localNames = ["خوزستان", ...seoKeywordLibrary.khuzestanLocations.map(({ fa }) => fa)]
    .map(normalizeKeywordQuery);
  const complianceRiskPattern = /بهترین|برترین|نابغه|تضمینی|تضمین|صددرصد|قطعی|فوری|معجزه|موفقیت تضمینی/;
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

  if (language !== "en" && (clusterId === "all" || clusterId === "general-attorney-selection")
    && (family === "all" || family === "positioning")) {
    for (const item of POSITIONING_TERMS) {
      entries.push({
        clusterId: "general-attorney-selection",
        clusterTitle: "جست‌وجوی عمومی و انتخاب وکیل",
        target: "محتوای آتی",
        intent: item.intent,
        coverage: "عبارت‌های عمومی، منطقه‌ای، مقایسه‌ای و زبان بازاریابی جست‌وجو",
        term: item.term,
        family: "positioning",
        origin: "curated-search-language-candidate",
        claimRisk: item.claimRisk,
        requiresComplianceReview: true
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
  positioning: "عبارت‌های عمومی و توصیفی برای پژوهش داخلی؛ ادعاهای برتری، تخصص و فوریت نیازمند بررسی جداگانه‌اند و نباید خودکار منتشر شوند.",
  legal: "اصطلاحات و پرسش‌های واردشده از بانک حقوقی داخلی؛ وضعیت اعتبار حقوقی آن‌ها باید پیش از هر انتشار جداگانه بررسی شود."
});
