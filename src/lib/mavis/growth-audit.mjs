const STOP_WORDS = new Set([
  "از","به","با","در","برای","که","را","و","یا","این","آن","یک","های","هایى","می","شود","است","هست","چه","چگونه","آیا","اگر","تا","اما","بر","پس","هم","هر","خود","قبل","بعد","نکات","مهم","حقوقی","قانونی"
]);

export function normalizeGrowthText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200c\u200d]/g, " ")
    .toLocaleLowerCase("fa-IR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  return [...new Set(normalizeGrowthText(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)))];
}

function safeHttps(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function similarity(left, right) {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function addFinding(findings, severity, code, message) {
  findings.push({ severity, code, message });
}

export function auditGrowthArticle(article) {
  const findings = [];
  const title = String(article?.title ?? "").trim();
  const excerpt = String(article?.excerpt ?? "").trim();
  const sections = Array.isArray(article?.sections) ? article.sections : [];
  const checklist = Array.isArray(article?.checklist) ? article.checklist : [];
  const sources = Array.isArray(article?.sources) ? article.sources : [];

  if (!article?.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    addFinding(findings, "critical", "invalid_slug", "شناسه نشانی مقاله خالی یا نامعتبر است.");
  }
  if (!title) addFinding(findings, "critical", "missing_title", "عنوان مقاله ثبت نشده است.");
  else if (title.length < 24 || title.length > 75) {
    addFinding(findings, "warning", "title_length", "طول عنوان خارج از بازه پیشنهادی داخلی ۲۴ تا ۷۵ نویسه است؛ این معیار تضمین رتبه نیست.");
  }
  if (!excerpt) addFinding(findings, "critical", "missing_excerpt", "توضیح کوتاه مقاله وجود ندارد.");
  else if (excerpt.length < 70 || excerpt.length > 200) {
    addFinding(findings, "warning", "excerpt_length", "توضیح کوتاه خارج از بازه پیشنهادی داخلی ۷۰ تا ۲۰۰ نویسه است.");
  }
  if (sections.length < 3) addFinding(findings, "warning", "thin_structure", "کمتر از سه بخش محتوایی ثبت شده است؛ کفایت محتوا باید انسانی بررسی شود.");
  if (!String(article?.warning ?? "").trim()) addFinding(findings, "critical", "missing_legal_disclaimer", "هشدار و مرز استفاده از محتوای حقوقی ثبت نشده است.");
  if (checklist.length < 3) addFinding(findings, "warning", "weak_actionability", "چک‌لیست عملی کمتر از سه مورد دارد.");
  if (sources.length === 0) addFinding(findings, "critical", "missing_sources", "هیچ منبعی برای مقاله ثبت نشده است.");
  else {
    const invalid = sources.filter((source) => !safeHttps(source?.url));
    if (invalid.length) addFinding(findings, "critical", "unsafe_source_url", invalid.length + " پیوند منبع فاقد HTTPS معتبر یا دارای اطلاعات ورود است.");
  }

  const bodyText = [title, excerpt, article?.intro, ...sections.map((section) => section?.heading), ...sections.map((section) => section?.body)].join(" ");
  const keywords = tokens(bodyText).sort((a, b) => b.length - a.length).slice(0, 12);
  return {
    slug: article?.slug ?? "",
    title: title || "بدون عنوان",
    category: String(article?.category ?? "بدون دسته"),
    sourceCount: sources.length,
    sectionCount: sections.length,
    findingCount: findings.length,
    criticalCount: findings.filter((item) => item.severity === "critical").length,
    warningCount: findings.filter((item) => item.severity === "warning").length,
    findings,
    candidateKeywords: keywords.slice(0, 6),
  };
}

export function auditGrowthLibrary(articles) {
  const input = Array.isArray(articles) ? articles : [];
  const reports = input.map(auditGrowthArticle);
  const duplicatePairs = [];
  for (let i = 0; i < input.length; i += 1) {
    for (let j = i + 1; j < input.length; j += 1) {
      const left = [input[i]?.title, input[i]?.excerpt].join(" ");
      const right = [input[j]?.title, input[j]?.excerpt].join(" ");
      const score = similarity(left, right);
      if (score >= 0.62) duplicatePairs.push({
        leftSlug: input[i]?.slug ?? "",
        rightSlug: input[j]?.slug ?? "",
        similarity: Number(score.toFixed(3)),
        reviewRequired: true,
      });
    }
  }
  const categoryCounts = {};
  for (const report of reports) categoryCounts[report.category] = (categoryCounts[report.category] || 0) + 1;
  return {
    version: "1.0.0",
    mode: "deterministic_local_audit",
    articleCount: reports.length,
    criticalCount: reports.reduce((sum, item) => sum + item.criticalCount, 0),
    warningCount: reports.reduce((sum, item) => sum + item.warningCount, 0),
    sourceLinkedArticles: reports.filter((item) => item.sourceCount > 0).length,
    duplicatePairs,
    categoryCounts,
    reports: reports.sort((a, b) => b.criticalCount - a.criticalCount || b.warningCount - a.warningCount || a.title.localeCompare(b.title, "fa")),
    limitations: [
      "این ممیزی محلی و قطعی است و به داده زنده Google، Bing، Search Console یا آمار جست‌وجو متصل نیست.",
      "عبارت‌های پیشنهادی از متن مقاله استخراج می‌شوند و حجم جست‌وجو یا قصد واقعی کاربر را اثبات نمی‌کنند.",
      "شباهت متنی فقط هشدار بازبینی است و به‌تنهایی اثبات هم‌نوع‌خواری یا محتوای تکراری نیست.",
      "این خروجی رتبه گوگل، کیفیت حقوقی، صحت استناد یا احتمال جذب موکل را اندازه‌گیری نمی‌کند."
    ]
  };
}
