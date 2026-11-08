const REVIEW_STATES = new Set([
  "verified_primary_source",
  "secondary_source_only",
  "needs_legal_review",
  "draft",
]);

const VALIDITY_STATES = new Set([
  "in_force",
  "partially_repealed",
  "repealed",
  "unknown",
]);

function safeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function normalizeSources(record) {
  if (!Array.isArray(record?.sources)) return [];

  return record.sources.flatMap((source) => {
    if (!source || typeof source !== "object") return [];
    if (typeof source.url !== "string" || typeof source.title !== "string" || !source.title.trim()) return [];

    let parsedUrl;
    try {
      parsedUrl = new URL(source.url);
    } catch {
      return [];
    }
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) return [];

    return [{
      title: source.title.trim().slice(0, 240),
      url: parsedUrl.toString(),
      sourceType: source.source_type === "primary" ? "primary" : "secondary",
      publicationDate: safeDate(source.publication_date),
      accessedAt: safeDate(source.accessed_at),
      sourceVersion: typeof source.source_version === "string" ? source.source_version.slice(0, 120) : null,
    }];
  });
}

function resolveReviewState(record, sources) {
  if (!record || typeof record !== "object") return "not_found";
  if (record.validity_status === "repealed" || record.status === "outdated") return "outdated";

  const reviewStatus = REVIEW_STATES.has(record.review_status) ? record.review_status : null;
  const hasVerifiedPrimary = reviewStatus === "verified_primary_source" &&
    record.source_verified === true &&
    sources.some((source) => source.sourceType === "primary" && source.accessedAt !== null);

  if (hasVerifiedPrimary) return "verified_primary";
  if (reviewStatus === "secondary_source_only") return "secondary_reference";
  return "needs_official_check";
}

function explicitList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
}

export function buildLegalEvidence(record) {
  const sources = normalizeSources(record);
  const state = resolveReviewState(record, sources);

  return {
    recordId: typeof record?.id === "string" ? record.id : null,
    title: typeof record?.title === "string"
      ? record.title
      : typeof record?.canonical === "string" ? record.canonical : null,
    state,
    citations: sources,
    validity: {
      status: VALIDITY_STATES.has(record?.validity_status) ? record.validity_status : "unknown",
      enactmentDate: safeDate(record?.enactment_date),
      effectiveDate: safeDate(record?.effective_date),
      lastVerifiedAt: safeDate(record?.last_verified_at),
      amendmentReferences: explicitList(record?.amendment_refs),
      repealReferences: explicitList(record?.repeal_refs),
    },
    limitations: [
      "ثبت پیوند یا وجود منبع ثانویه، اثبات اعتبار فعلی قانون نیست.",
      "تاریخ تصویب، انتشار، لازم‌الاجراشدن و اصلاح یا نسخ باید جداگانه احراز شوند.",
      "خلاصه آموزشی یا نتیجه بازیابی، متن رسمی قانون و نظر حقوقی محسوب نمی‌شود.",
    ],
    requiresHumanReview: state !== "verified_primary",
  };
}

export function buildLegalEvidencePacket(records) {
  const items = Array.isArray(records) ? records.map(buildLegalEvidence) : [];
  const hasPrimaryEvidence = items.some((item) => item.state === "verified_primary");

  return {
    mode: "retrieval_only",
    state: items.length === 0
      ? "not_found"
      : hasPrimaryEvidence
        ? "primary_evidence_available"
        : items.every((item) => item.state === "outdated")
          ? "outdated"
          : "needs_official_check",
    items,
    requiresHumanReview: true,
    legalOpinion: null,
    deadlineCalculation: null,
  };
}
