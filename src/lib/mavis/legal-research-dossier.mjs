function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function list(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function evidenceFor(record) {
  const sources = list(record?.sources).map((source, index) => ({
    citationId: record.id + ":source:" + index,
    sourceId: source?.source_id || null,
    title: String(source?.title || "منبع ثبت‌شده"),
    url: safeSourceUrl(source?.url),
    sourceClass: source?.source_class || source?.source_type || "unclassified",
    verificationStatus: source?.verification_status || "unverified",
  })).filter((source) => source.url);

  const fallback = safeSourceUrl(record?.source_url);
  if (fallback && !sources.some((source) => source.url === fallback)) {
    sources.push({
      citationId: record.id + ":discovery-link",
      sourceId: null,
      title: "پیوند کشف منبع؛ سند دقیق و اعتبار آن تأیید نشده",
      url: fallback,
      sourceClass: "discovery_only",
      verificationStatus: "unverified_source_link",
    });
  }
  return sources;
}

function buildGaps(record, sources) {
  const gaps = [];
  const primaryVerified = sources.some((source) => source.verificationStatus === "verified_primary_source");
  if (!sources.length) gaps.push({ code: "missing_record_sources", label: "برای این مدخل ارجاع دقیق ثبت نشده است." });
  if (!primaryVerified) gaps.push({ code: "primary_source_unverified", label: "متن سند از منبع اولیه برای این مدخل تأیید نشده است." });
  if (record?.provenance?.current_validity_verified !== true) gaps.push({ code: "current_validity_unverified", label: "اعتبار و لازم‌الاجرا بودن فعلی بررسی و تأیید نشده است." });
  if (record?.record_type === "law" && !record?.effective_date) gaps.push({ code: "effective_date_missing", label: "تاریخ لازم‌الاجرا شدن یا وضعیت نامعلوم آن ثبت نشده است." });
  if (!record?.amendment_history && !record?.amendments && record?.record_type === "law") {
    gaps.push({ code: "amendment_history_missing", label: "سوابق اصلاح، الحاق، نسخ و مقررات انتقالی ثبت نشده است." });
  }
  if (record?.review_status === "secondary_source_only") {
    gaps.push({ code: "secondary_source_only", label: "اطلاعات فعلی صرفاً بر منبع ثانویه متکی است." });
  }
  if (record?.status === "needs_consolidation_review") {
    gaps.push({ code: "consolidation_review_required", label: "تنقیح و اصلاحات این مدخل نیازمند بازبینی است." });
  }
  return gaps;
}

/**
 * Assembles a traceable evidence packet from existing retrieval results.
 * It does not interpret facts, resolve conflicts or generate legal advice.
 */
export function buildLegalResearchDossier({ query, results, createdAt = new Date().toISOString() } = {}) {
  const records = Array.isArray(results) ? results : [];
  const seen = new Set();
  const items = [];

  for (const record of records) {
    if (!record || typeof record.id !== "string" || seen.has(record.id)) continue;
    seen.add(record.id);
    const sources = evidenceFor(record);
    const gaps = buildGaps(record, sources);
    items.push({
      id: record.id,
      recordType: record.record_type || "unknown",
      title: String(record.title || record.canonical || "مدخل بدون عنوان"),
      articleNumber: record.article_number || null,
      lawId: record.law_id || null,
      relatedLawIds: list(record.law_refs).filter((value) => typeof value === "string"),
      relatedArticleIds: list(record.article_refs).filter((value) => typeof value === "string"),
      relatedTermIds: list(record.related_terms).filter((value) => typeof value === "string"),
      excerpt: String(record.summary || record.definition || record.notes || "").slice(0, 1800),
      reviewStatus: record.review_status || "unknown",
      legalStatus: record.status || "unknown",
      retrieval: {
        score: Number.isFinite(record.search_score) ? record.search_score : null,
        matchedField: record.matched_field || null,
      },
      sources,
      gaps,
      primarySourceVerified: sources.some((source) => source.verificationStatus === "verified_primary_source"),
      currentValidityVerified: record?.provenance?.current_validity_verified === true,
    });
  }

  const allGaps = items.flatMap((item) => item.gaps.map((gap) => ({ recordId: item.id, title: item.title, ...gap })));
  return {
    version: "1.0.0",
    mode: "deterministic_evidence_assembly",
    query: String(query || "").trim(),
    createdAt,
    resultCount: items.length,
    primarySourceVerifiedCount: items.filter((item) => item.primarySourceVerified).length,
    currentValidityVerifiedCount: items.filter((item) => item.currentValidityVerified).length,
    gapCount: allGaps.length,
    items,
    gaps: allGaps,
    requiredHumanChecks: [
      "متن دقیق سند و مرجع صادرکننده را از منبع اولیه دریافت و با شناسه و تاریخ انتشار تطبیق دهید.",
      "اصلاحات، الحاقات، نسخ، تعلیق، مقررات انتقالی و تاریخ لازم‌الاجرا شدن را بررسی کنید.",
      "در مورد رأی قضایی، نوع رأی، مرجع صادرکننده، قطعیت و اثر الزام‌آور آن را جداگانه احراز کنید.",
      "ارتباط هر منبع با موضوع و پرونده واقعی را وکیل مسئول ارزیابی کند.",
    ],
    limitations: [
      "این بسته فقط نتایج موجود کتابخانه را مرتب و ارجاع‌ها و خلأهای ثبت‌شده را نمایش می‌دهد.",
      "هیچ تحلیل پرونده، تفسیر قانون، محاسبه مهلت یا توصیه حقوقی تولید نمی‌شود.",
      "نبود نتیجه یا منبع در کتابخانه به معنی نبود قانون، رأی یا منبع مرتبط نیست.",
      "وضعیت اعتبار روز قانون فقط با بررسی منبع اولیه و سوابق اصلاح و نسخ قابل تأیید است.",
    ],
  };
}
