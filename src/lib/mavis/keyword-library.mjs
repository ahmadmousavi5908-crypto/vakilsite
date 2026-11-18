import { seoKeywordLibrary } from "../../data/seo-keyword-library.js";

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
  "commercial-law": ["ورشکستگی شرکت", "انحلال شرکت", "مسئولیت مدیران شرکت", "اختلاف شرکای تجاری"],
  "cheques-commercial-papers": ["مطالبه وجه چک", "صدور اجراییه چک", "مطالبه وجه سفته", "واخواست سفته"],
  "enforcement-debt": ["اجرای حکم قطعی", "توقیف اموال", "اعتراض به عملیات اجرایی", "اعسار از پرداخت محکوم‌به"],
  "labor-administrative-tax": ["مطالبه حقوق و مزایا", "اعتراض به رأی اداره کار", "اعتراض به برگ تشخیص مالیات", "شکایت در دیوان عدالت اداری"],
  "insurance-accident-torts": ["مطالبه دیه تصادف", "مطالبه خسارت بیمه", "مسئولیت ناشی از حادثه", "قصور پزشکی"],
  "construction-urban": ["اعتراض به رأی کمیسیون ماده ۱۰۰", "تغییر کاربری ملک", "اختلاف مالک و سازنده", "الزام به تحویل آپارتمان"],
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
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
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

  return Object.freeze({
    version: seoKeywordLibrary.schemaVersion,
    generatedAt: seoKeywordLibrary.generatedAt,
    clusterCount: clusters.length,
    lawyerPhraseCount: lawyerCount,
    basePhraseCount: baseCount,
    problemPhraseCount: problemCount,
    localPhraseCount,
    positioningPhraseCount,
    englishPhraseCount: englishCount,
    locationCount: seoKeywordLibrary.khuzestanLocations.length,
    legalTermCount: legalRecords.length,
    legalBasePhraseCount: legalBaseCount,
    legalLawyerPhraseCount: legalLawyerCount,
    legalQuestionPhraseCount: legalQuestionCount,
    legalTermsPendingReview: legalRecords.filter((record) => record.reviewStatus !== "verified_primary_source").length,
    totalCandidateCount: lawyerCount + baseCount + problemCount + englishCount
      + legalBaseCount + legalLawyerCount + legalQuestionCount + localPhraseCount + positioningPhraseCount
  });
}

export function getKeywordLibraryClusters() {
  return seoKeywordLibrary.clusters.map(({ id, title, target, intent, coverage }) => ({
    id, title, target, intent, coverage
  }));
}

export function searchKeywordLibrary({ query = "", clusterId = "all", family = "all", language = "fa", taxonomyEntries = [] } = {}) {
  const clusters = seoKeywordLibrary.clusters.filter((cluster) => clusterId === "all" || cluster.id === clusterId);
  const clusterById = new Map(seoKeywordLibrary.clusters.map((cluster) => [cluster.id, cluster]));
  const entries = [];

  if ((clusterId === "all" || clusterId === "general-attorney-selection")
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
  legal: "اصطلاحات و پرسش‌های واردشده از بانک حقوقی داخلی؛ وضعیت اعتبار حقوقی آن‌ها باید پیش از هر انتشار جداگانه بررسی شود."
});
