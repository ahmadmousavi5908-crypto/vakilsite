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
  let candidate = value.replace(/^وکیل\s+پایه\s+یک\s+دادگستری\s+/u, "");
  if (candidate === value) candidate = value.replace(/^وکیل\s+/u, "");
  if (!candidate || candidate === value || /^(برای|در|از|با)\s/u.test(candidate)) return null;
  return candidate;
}

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = normalizeKeywordQuery(entry.term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getKeywordLibrarySnapshot() {
  const clusters = seoKeywordLibrary.clusters;
  const lawyerCount = clusters.reduce((total, cluster) => total + cluster.fa.length, 0);
  const englishCount = clusters.reduce((total, cluster) => total + cluster.en.length, 0);
  const baseCount = uniqueEntries(clusters.flatMap((cluster) => cluster.fa
    .map(basePhrase)
    .filter(Boolean)
    .map((term) => ({ term })))).length;
  const problemCount = Object.values(PROBLEM_SUBJECTS).reduce((total, subjects) => total + subjects.length * QUESTION_TEMPLATES.length, 0);

  return Object.freeze({
    version: seoKeywordLibrary.schemaVersion,
    generatedAt: seoKeywordLibrary.generatedAt,
    clusterCount: clusters.length,
    lawyerPhraseCount: lawyerCount,
    basePhraseCount: baseCount,
    problemPhraseCount: problemCount,
    englishPhraseCount: englishCount,
    locationCount: seoKeywordLibrary.khuzestanLocations.length,
    totalCandidateCount: lawyerCount + baseCount + problemCount + englishCount,
    metricsStatus: seoKeywordLibrary.methodology.researchStatus,
    gscStatus: seoKeywordLibrary.methodology.gscObserved.status
  });
}

export function getKeywordLibraryClusters() {
  return seoKeywordLibrary.clusters.map(({ id, title, target, intent, coverage }) => ({
    id, title, target, intent, coverage
  }));
}

export function searchKeywordLibrary({ query = "", clusterId = "all", family = "all", language = "fa" } = {}) {
  const clusters = seoKeywordLibrary.clusters.filter((cluster) => clusterId === "all" || cluster.id === clusterId);
  const entries = [];

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

  const unique = uniqueEntries(entries);
  const normalizedQuery = normalizeKeywordQuery(query);
  return unique
    .filter((entry) => !normalizedQuery || normalizeKeywordQuery([
      entry.term, entry.clusterTitle, entry.target
    ].join(" ")).includes(normalizedQuery))
    .sort((left, right) => left.clusterTitle.localeCompare(right.clusterTitle, "fa") || left.term.localeCompare(right.term, "fa"));
}

export const keywordLibraryProvenance = Object.freeze({
  lawyer: "عبارت‌های ثبت‌شده در بانک داخلی؛ به معنی حجم یا رتبه تأییدشده نیستند.",
  base: "از حذف پیشوند وکیل از عبارت‌های وکیل‌محور به‌دست آمده‌اند؛ طبیعی‌بودن هر عبارت باید بازبینی شود.",
  problem: "قالب‌های پیشنهادی تحریریه برای تبدیل موضوع به پرسش؛ عبارت واقعی ثبت‌شده در Google نیستند.",
  english: "عبارت‌های انگلیسی برای نگهداری و پژوهش داخلی؛ بدون اثبات تقاضای بازار ایران."
});
