import { buildLegalEvidence } from "./legal-evidence.mjs";

const SOURCE_CLASSES = new Set([
  "statute",
  "amendment",
  "repeal",
  "executive_regulation",
  "unifying_opinion",
  "published_judgment",
  "administrative_court_decision",
  "advisory_opinion",
  "judicial_session",
  "academic_commentary",
  "official_guidance",
  "legal_term",
  "educational_summary",
]);

const REQUIRED_FIELDS = Object.freeze({
  statute: ["authority", "document_number", "publication_date", "exact_citation"],
  amendment: ["authority", "document_number", "publication_date", "effective_date", "related_record_ids", "exact_citation"],
  repeal: ["authority", "document_number", "publication_date", "effective_date", "related_record_ids", "exact_citation"],
  executive_regulation: ["authority", "document_number", "publication_date", "effective_date", "enabling_instrument_id", "exact_citation"],
  unifying_opinion: ["court", "opinion_number", "publication_date", "exact_citation"],
  published_judgment: ["court", "branch", "case_number", "decision_date", "exact_citation"],
  administrative_court_decision: ["court", "opinion_number", "publication_date", "exact_citation"],
  advisory_opinion: ["issuing_authority", "opinion_number", "issue_date", "exact_citation"],
  judicial_session: ["issuing_authority", "session_number", "session_date", "exact_citation"],
  academic_commentary: ["author", "publication_title", "publication_date", "exact_citation"],
  official_guidance: ["issuing_authority", "document_number", "publication_date", "exact_citation"],
  legal_term: ["canonical", "definition"],
  educational_summary: ["law_id", "article_number", "summary", "exact_citation"],
});

const LABELS = Object.freeze({
  statute: "قوانین و مقررات اصلی",
  amendment: "اصلاحیه‌ها",
  repeal: "نسخ و ابطال",
  executive_regulation: "آیین‌نامه‌ها و مقررات اجرایی",
  unifying_opinion: "آرای وحدت رویه",
  published_judgment: "آرای منتشرشده",
  administrative_court_decision: "آرای هیأت عمومی دیوان عدالت اداری",
  advisory_opinion: "نظریات مشورتی",
  judicial_session: "نشست‌های قضایی",
  academic_commentary: "منابع علمی و تفسیری",
  official_guidance: "دستورالعمل‌ها و راهنمای رسمی",
  legal_term: "اصطلاحات حقوقی",
  educational_summary: "خلاصه‌های آموزشی مواد قانونی",
});

function hasValue(record, key) {
  const value = record?.[key];
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const sourceClass = SOURCE_CLASSES.has(record.source_class) ? record.source_class : "unclassified";
  const evidence = buildLegalEvidence(record);
  const missingFields = sourceClass === "unclassified"
    ? ["source_class"]
    : REQUIRED_FIELDS[sourceClass].filter((field) => !hasValue(record, field));

  if (evidence.citations.length === 0) missingFields.push("verified_source_citation");

  return {
    id: typeof record.id === "string" ? record.id : null,
    title: typeof record.title === "string" ? record.title : null,
    sourceClass,
    sourceClassLabel: LABELS[sourceClass] || "منبع دسته‌بندی‌نشده",
    exactCitation: hasValue(record, "exact_citation") ? record.exact_citation.trim().slice(0, 500) : null,
    evidenceState: evidence.state,
    validityStatus: evidence.validity.status,
    missingFields,
    sourceVerified: evidence.state === "verified_primary",
    relatedRecordIds: Array.isArray(record.related_record_ids)
      ? record.related_record_ids.filter((id) => typeof id === "string").slice(0, 50)
      : [],
    citations: evidence.citations,
  };
}

export function buildLegalResearchDossier({ topic, records = [] } = {}) {
  const cleanTopic = typeof topic === "string" ? topic.normalize("NFC").trim().slice(0, 240) : "";
  if (cleanTopic.length < 2 || !Array.isArray(records) || records.length > 100) {
    return { ok: false, reason: "invalid_dossier_input" };
  }

  const items = records.map(normalizeRecord).filter(Boolean);
  const sections = Object.fromEntries(
    [...SOURCE_CLASSES].map((sourceClass) => [
      sourceClass,
      items.filter((item) => item.sourceClass === sourceClass),
    ]),
  );
  sections.unclassified = items.filter((item) => item.sourceClass === "unclassified");

  const verifiedPrimaryCount = items.filter((item) => item.sourceVerified).length;
  const exactCitationCount = items.filter((item) => item.exactCitation && item.citations.length > 0).length;
  const gaps = [];

  if (sections.statute.length === 0) gaps.push("در کتابخانه فعلی قانون مرتبطی بازیابی نشده است؛ این به معنی نبود قانون نیست.");
  if (sections.amendment.length === 0) gaps.push("زنجیره اصلاحات در داده‌های فعلی ثبت نشده است.");
  if (sections.repeal.length === 0) gaps.push("زنجیره نسخ و ابطال در داده‌های فعلی ثبت نشده است.");
  if (sections.unifying_opinion.length === 0) gaps.push("رأی وحدت رویه مرتبط در داده‌های فعلی بازیابی نشده است.");
  if (sections.published_judgment.length === 0) gaps.push("رأی قضایی منتشرشده مرتبط در داده‌های فعلی بازیابی نشده است.");
  if (sections.advisory_opinion.length === 0) gaps.push("نظریه مشورتی مرتبط در داده‌های فعلی بازیابی نشده است.");
  if (verifiedPrimaryCount === 0) gaps.push("هیچ منبع اولیه با تمام شروط اعتبارسنجی در این مجموعه تأیید نشده است.");
  if (exactCitationCount < items.length) gaps.push("برای بخشی از نتایج، ارجاع دقیق یا پیوند منبع قابل استناد ناقص است.");

  return {
    ok: true,
    mode: "evidence_assembly_only",
    topic: cleanTopic,
    itemCount: items.length,
    verifiedPrimaryCount,
    exactCitationCount,
    sections,
    items,
    gaps,
    answerReadiness: items.length === 0
      ? "not_found"
      : verifiedPrimaryCount === 0
        ? "blocked_missing_verified_primary_sources"
        : "human_legal_review_required",
    legalAnswer: null,
    deadlineCalculation: null,
    requiresHumanReview: true,
    disclaimer: "این پرونده پژوهشی فقط مدارک و خلأهای مستندات را دسته‌بندی می‌کند؛ نظر حقوقی، احراز نهایی اعتبار قانون یا محاسبه مهلت نیست.",
  };
}
